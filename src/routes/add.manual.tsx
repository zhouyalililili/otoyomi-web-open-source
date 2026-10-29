import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assembleManual, markIncompleteReadingIssues } from "@/core";
import { draftStore } from "@/lib/draft-store";
import { assembler, prepareJapaneseRomanizer } from "@/lib/lyrics-engine";

export const Route = createFileRoute("/add/manual")({
  head: () => ({
    meta: [
      { title: "手动输入歌词 · 音咏 OtoYomi" },
      {
        name: "description",
        content: "支持分栏输入或原文与罗马音交替粘贴；只填写原文或罗马音也可以。",
      },
      { property: "og:title", content: "手动输入歌词 · 音咏 OtoYomi" },
      {
        property: "og:description",
        content: "支持分栏输入、交替粘贴以及单侧歌词输入。",
      },
    ],
  }),
  component: ManualPage,
});

type EntryMode = "split" | "alternating";

function ManualPage() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [japanese, setJapanese] = useState("");
  const [romaji, setRomaji] = useState("");
  const [alternating, setAlternating] = useState("");
  const [mode, setMode] = useState<EntryMode>("split");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit() {
    const hasLyrics =
      mode === "alternating"
        ? alternating.trim() !== ""
        : japanese.trim() !== "" || romaji.trim() !== "";
    if (!hasLyrics) {
      toast.error(mode === "alternating" ? "请填写交替歌词" : "原文和罗马音至少填写一侧");
      return;
    }
    setBusy(true);
    try {
      await prepareJapaneseRomanizer();
      const assembled =
        mode === "alternating"
          ? assembler.assembleAlternating({
              title,
              artist,
              japanese: alternating,
              source: "manual",
            })
          : assembleManual(assembler, { title, artist, japanese, romaji });
      const draft = markIncompleteReadingIssues(assembled);
      draftStore.setDraft(draft);
      void navigate({ to: "/review" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "日文读音生成失败，请重试");
      setBusy(false);
    }
  }

  return (
    <section>
      <PageHeader title="手动输入" back />
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        选择你现有歌词的排版方式。格式不完整也可以进入下一步校对。
      </p>
      <div className="space-y-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="歌名"
          aria-label="歌名"
        />
        <Input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="歌手"
          aria-label="歌手"
        />
        <div
          className="flex flex-wrap gap-x-6 gap-y-3 py-1"
          role="radiogroup"
          aria-label="歌词排版方式"
        >
          <label className="flex cursor-pointer items-center gap-2 text-base">
            <input
              type="radio"
              name="entry-mode"
              checked={mode === "split"}
              onChange={() => setMode("split")}
              className="h-5 w-5 accent-primary"
            />
            分栏输入
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-base">
            <input
              type="radio"
              name="entry-mode"
              checked={mode === "alternating"}
              onChange={() => setMode("alternating")}
              className="h-5 w-5 accent-primary"
            />
            原文 + 罗马音交替
          </label>
        </div>
        {mode === "split" ? (
          <>
            <Textarea
              value={japanese}
              onChange={(e) => setJapanese(e.target.value)}
              rows={7}
              aria-label="日文原文（可选）"
              placeholder={
                "日文原文（可选）\n\n例如：\n夢ならばどれほどよかったでしょう\n未だにあなたのことを夢にみる"
              }
            />
            <Textarea
              value={romaji}
              onChange={(e) => setRomaji(e.target.value)}
              rows={7}
              aria-label="罗马音（可选）"
              placeholder={
                "罗马音（可选）\n\n例如：\nyume nara ba dorehodo yokatta deshou\nimadani anata no koto o yume ni miru"
              }
            />
          </>
        ) : (
          <>
            <Textarea
              value={alternating}
              onChange={(e) => setAlternating(e.target.value)}
              rows={14}
              aria-label="交替歌词"
              placeholder={
                "交替歌词\n\n例如：\n夢ならばどれほどよかったでしょう\nyume nara ba dorehodo yokatta deshou\n未だにあなたのことを夢にみる\nimadani anata no koto o yume ni miru"
              }
            />
            <p className="text-sm text-muted-foreground">
              通常一行原文、一行罗马音；缺行或错配会在下一步标出。
            </p>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-sm">
        无法按行整理？
        <Link to="/add/smart" className="text-primary">
          使用智能导入
        </Link>
      </p>
      <Button className="mt-4 h-12 w-full text-base" disabled={busy} onClick={() => void submit()}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "正在生成读音…" : "进入编辑"}
      </Button>
    </section>
  );
}
