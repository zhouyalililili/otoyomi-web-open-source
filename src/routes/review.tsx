import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, IssueChips, PageHeader } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { useCollection, useInvalidateLibrary } from "@/hooks/use-library";
import { draftStore, useDraftState } from "@/lib/draft-store";
import { cn } from "@/lib/utils";
import { getStorage, saveDraftAsSong } from "@/storage/library";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "结构校对 · 音咏 OtoYomi" },
      {
        name: "description",
        content: "逐行检查原文、罗马音与跟唱提示，确认后存入曲库。",
      },
      { property: "og:title", content: "结构校对 · 音咏 OtoYomi" },
      {
        property: "og:description",
        content: "逐行检查原文、罗马音与跟唱提示。",
      },
    ],
  }),
  component: ReviewPage,
});

const fmtTs = (ms: number) =>
  `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;

function ReviewPage() {
  const { draft, targetCollectionId } = useDraftState();
  const { data: target } = useCollection(targetCollectionId ?? "");
  const [saving, setSaving] = useState(false);
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const navigate = useNavigate();
  const invalidate = useInvalidateLibrary();

  if (!draft) {
    return (
      <section>
        <PageHeader title="结构校对" back />
        <EmptyState
          action={
            <Link to="/add" className="text-primary">
              去添加歌曲
            </Link>
          }
        >
          没有待校对的歌词。
        </EmptyState>
      </section>
    );
  }

  const issueCount = draft.lines.filter((l) => l.issues.length).length;
  const visibleLines = showIssuesOnly
    ? draft.lines.filter((line) => line.issues.length)
    : draft.lines;

  async function save() {
    if (!draft) return;
    setSaving(true);
    const song = await saveDraftAsSong(getStorage(), draft, targetCollectionId);
    draftStore.clear();
    void invalidate();
    toast.success(`「${song.title}」已存入曲库`);
    void navigate({ to: "/" });
  }

  return (
    <section>
      <PageHeader title="结构校对" back />
      <div className="mb-4">
        <div className="text-lg font-semibold">{draft.title}</div>
        <div className="text-sm text-muted-foreground">
          {draft.artist || "未知歌手"} · {draft.lines.length} 行 ·{" "}
          {issueCount ? `${issueCount} 行需留意` : "未发现问题"}
        </div>
        {target && (
          <div className="mt-1 text-xs text-primary">保存后将加入合集「{target.name}」</div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 border-y py-3">
        <div className="min-w-0">
          <div className="font-medium">逐段校对</div>
          <div className="text-sm text-muted-foreground">
            {issueCount
              ? `${draft.lines.length} 段歌词，${issueCount} 段待确认`
              : `${draft.lines.length} 段歌词，未发现明显问题`}
          </div>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showIssuesOnly}
            onChange={(event) => setShowIssuesOnly(event.target.checked)}
            disabled={!issueCount}
            className="h-5 w-5 accent-primary"
          />
          只看待确认
        </label>
      </div>

      {!draft.lines.length ? (
        <EmptyState>没有识别出歌词行，请返回检查内容。</EmptyState>
      ) : (
        <ol className="space-y-4">
          {visibleLines.map((l) => (
            <li
              key={l.position}
              className={cn(
                "android-panel p-5",
                l.issues.length && "border-warning-foreground/30 bg-warning",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  #{l.position + 1}
                  {l.timestampMs !== null && ` · ${fmtTs(l.timestampMs)}`}
                </span>
                <div className="flex items-center gap-1">
                  {!!l.issues.length && (
                    <AlertTriangle className="h-4 w-4 text-warning-foreground" />
                  )}
                  <IssueChips issues={l.issues} />
                </div>
              </div>
              <div lang="ja" className="font-japanese text-lg font-medium leading-relaxed">
                {l.japanese || <span className="text-muted-foreground">（无原文）</span>}
              </div>
              <div className="font-romaji mt-1 text-base text-[#2d806a]">
                {l.romaji || "（无罗马音）"}
              </div>
              <div
                lang="zh-CN"
                className="font-simplified mt-2 text-xl font-bold leading-snug text-foreground"
              >
                {l.singAlong}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="sticky bottom-20 mt-6 grid grid-cols-2 gap-3 bg-background py-3 md:bottom-0">
        <Button
          variant="outline"
          className="h-12"
          onClick={() => navigate({ to: "/editor", search: { songId: undefined } })}
        >
          进入歌词编辑器
        </Button>
        <Button className="h-12" disabled={saving || !draft.lines.length} onClick={save}>
          确认存入曲库
        </Button>
      </div>
    </section>
  );
}
