import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole, Loader2, Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/library/parts";
import { AccountButton } from "@/components/shell/AccountButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiImportAdapter, authAdapter, quotaAdapter } from "@/config/services";
import { analyzeSmartImport, markIncompleteReadingIssues } from "@/core";
import { useAiQuota, useSession } from "@/hooks/use-auth";
import { draftStore } from "@/lib/draft-store";
import { assembler, prepareJapaneseRomanizer } from "@/lib/lyrics-engine";
import { smartImportTask, useSmartImportTask } from "@/lib/smart-import-task";

export const Route = createFileRoute("/add/smart")({
  head: () => ({ meta: [{ title: "智能导入 · 音咏 OtoYomi" }] }),
  component: SmartPage,
});

const SMART_IMPORT_TOAST_ID = "otoyomi-smart-import";

function openReview() {
  window.location.assign("/review");
}

function SmartPage() {
  const [raw, setRaw] = useState("");
  const task = useSmartImportTask();
  const { session, ready } = useSession();
  const { data: quota } = useAiQuota(!!session);
  const queryClient = useQueryClient();

  async function start() {
    if (!session) {
      smartImportTask.fail("请先登录后再使用 AI 智能导入");
      return;
    }
    if (!aiImportAdapter.configured) {
      smartImportTask.fail("此构建尚未配置 AI 智能导入服务");
      return;
    }

    const analysis = analyzeSmartImport(raw);
    if (analysis.layout === "empty") {
      smartImportTask.fail("请先粘贴歌词内容");
      return;
    }
    if (!smartImportTask.begin()) return;

    toast.loading("智能导入正在后台整理，可以继续浏览其他页面", {
      id: SMART_IMPORT_TOAST_ID,
      duration: Infinity,
    });

    try {
      const [result] = await Promise.all([
        aiImportAdapter.structure({ rawText: analysis.cleanedLines.join("\n") }),
        prepareJapaneseRomanizer(),
      ]);
      void queryClient.invalidateQueries({ queryKey: ["ai-quota"] });
      const assembled = assembler.assembleStructured({
        title: result.title,
        artist: result.artist,
        album: result.album,
        source: "smart",
        lines: result.lines,
      });
      const draft = markIncompleteReadingIssues(assembled);
      if (!draft.lines.length) throw new Error("没有识别出歌词行");
      draftStore.setDraft(draft);
      smartImportTask.succeed();
      const issueCount = draft.lines.filter((line) => line.issues.length).length;
      toast.success(
        issueCount
          ? `智能导入完成，${issueCount} 段需要确认，进入校对页即可修改`
          : "智能导入完成，返回智能导入页即可查看",
        {
          id: SMART_IMPORT_TOAST_ID,
          duration: 12_000,
          action: { label: "现在就去", onClick: openReview },
        },
      );
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: ["ai-quota"] });
      const message = error instanceof Error ? error.message : "智能导入失败";
      smartImportTask.fail(message);
      toast.error(message, { id: SMART_IMPORT_TOAST_ID, duration: 8_000 });
    }
  }

  if (!ready) {
    return (
      <section>
        <PageHeader title="智能导入" back />
        <div className="flex min-h-[50dvh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!authAdapter.configured || !aiImportAdapter.configured || !quotaAdapter.configured) {
    return (
      <section>
        <PageHeader title="智能导入" back />
        <div className="rounded-md bg-[#edf7f2] px-6 py-10 text-center">
          <Settings2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-5 text-xl font-semibold">此构建未配置智能导入</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            开源版不会附带生产登录、AI 密钥、额度数据库或后端地址。部署者可按照
            docs/HOSTED_FEATURES.md 实现三个服务适配器；其他本地功能仍可直接使用。
          </p>
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section>
        <PageHeader title="智能导入" back />
        <div className="rounded-md bg-[#edf7f2] px-6 py-10 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-5 text-xl font-semibold">登录后使用智能导入</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            智能导入会调用部署者配置的 AI 服务并消耗账户额度；曲库、图片和设置仍保存在当前浏览器。
          </p>
          <div className="mt-6 flex justify-center">
            <AccountButton />
          </div>
        </div>
      </section>
    );
  }

  const quotaExhausted = !!quota && !quota.unlimited && (quota.remaining ?? 0) <= 0;

  return (
    <section>
      <PageHeader title="智能导入" back />
      <div className="mb-5 flex items-center justify-between gap-4 rounded-md bg-[#edf7f2] p-4">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {session.user.email ?? session.user.displayName ?? "当前账户"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {quota
              ? quota.unlimited
                ? "今日 AI 额度不限"
                : `今日剩余 ${quota.remaining} / ${quota.dailyLimit} 次`
              : "正在读取今日额度…"}
          </div>
        </div>
        <AccountButton />
      </div>

      {task.status === "loading" && (
        <div className="mb-5 flex items-center gap-3 rounded-md bg-[#edf7f2] p-4 text-sm">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          <span>正在后台整理。你可以切换页面，回来后仍能看到当前进度。</span>
        </div>
      )}
      {task.status === "success" && (
        <div className="mb-5 flex items-center gap-3 rounded-md bg-[#edf7f2] p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">智能导入已完成</div>
            <div className="text-sm text-muted-foreground">结果已经准备好，可以进入结构校对。</div>
          </div>
          <Button size="sm" onClick={openReview}>
            查看结果
          </Button>
        </div>
      )}

      <Textarea
        value={raw}
        onChange={(event) => {
          setRaw(event.target.value);
          smartImportTask.reset();
        }}
        disabled={task.status === "loading"}
        rows={18}
        placeholder="可混合粘贴日文、罗马音、中文翻译或 LRC"
        aria-label="歌词内容"
        className="min-h-[55dvh] resize-none rounded-md p-5 text-lg leading-relaxed"
      />
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        AI 只负责识别歌词结构；日文读音、罗马音和中文音译由浏览器中的本地算法生成。
      </p>
      <Button
        className="mt-5 h-14 w-full rounded-full text-lg"
        disabled={!raw.trim() || task.status === "loading" || quotaExhausted}
        onClick={() => void start()}
      >
        {task.status === "loading" ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Sparkles className="h-6 w-6" />
        )}
        {task.status === "loading" ? "正在整理…" : quotaExhausted ? "今日额度已用完" : "开始整理"}
      </Button>
      {task.status === "error" && task.error && (
        <p className="mt-4 text-center text-sm text-destructive">{task.error}</p>
      )}
    </section>
  );
}
