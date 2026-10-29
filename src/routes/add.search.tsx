import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markIncompleteReadingIssues } from "@/core";
import { draftStore } from "@/lib/draft-store";
import { assembler, prepareJapaneseRomanizer } from "@/lib/lyrics-engine";
import { searchLrclib, type LrclibTrack } from "@/services/lrclib";

export const Route = createFileRoute("/add/search")({
  head: () => ({
    meta: [
      { title: "在线搜索歌词 · 音咏 OtoYomi" },
      {
        name: "description",
        content: "在 LRCLIB 公共歌词库按歌名或歌手查找日语歌词。",
      },
      { property: "og:title", content: "在线搜索歌词 · 音咏 OtoYomi" },
      {
        property: "og:description",
        content: "在 LRCLIB 公共歌词库按歌名或歌手查找日语歌词。",
      },
    ],
  }),
  component: SearchPage,
});

const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

function SearchPage() {
  const [q, setQ] = useState("");
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [state, setState] = useState<{
    status: "idle" | "loading" | "done" | "error";
    results: LrclibTrack[];
    error?: string;
  }>({ status: "idle", results: [] });
  const navigate = useNavigate();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setState({ status: "loading", results: [] });
    try {
      const results = await searchLrclib({ q: q.trim() });
      setState({ status: "done", results });
    } catch (err) {
      setState({
        status: "error",
        results: [],
        error: err instanceof Error ? err.message : "检索失败，请检查网络",
      });
    }
  }

  async function pick(t: LrclibTrack) {
    setSelectingId(t.id);
    try {
      await prepareJapaneseRomanizer();
      const meta = {
        title: t.trackName,
        artist: t.artistName,
        album: t.albumName,
        source: "lrclib",
        sourceId: String(t.id),
      };
      const assembled = t.syncedLyrics
        ? assembler.assembleLrc({ ...meta, japanese: t.syncedLyrics })
        : assembler.assemble({ ...meta, japanese: t.plainLyrics ?? "" });
      const draft = markIncompleteReadingIssues(assembled);
      draftStore.setDraft(draft);
      const issueCount = draft.lines.filter((line) => line.issues.length).length;
      if (issueCount) {
        toast.info(`已整理 ${draft.lines.length} 段，其中 ${issueCount} 段需要确认`);
      }
      void navigate({ to: "/review" });
    } catch (error) {
      setSelectingId(null);
      setState((current) => ({
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "歌词读音转换失败，请重试",
      }));
    }
  }

  return (
    <section>
      <PageHeader title="在线搜索" back />
      <form onSubmit={run} className="mb-5 flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="歌名或歌手"
          className="h-11"
        />
        <Button type="submit" className="h-11" disabled={state.status === "loading"}>
          {state.status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          搜索
        </Button>
      </form>
      {state.status === "error" && <EmptyState>{state.error}</EmptyState>}
      {state.status === "done" && !state.results.length && (
        <EmptyState>没有找到结果，换个关键词试试，或改用智能导入。</EmptyState>
      )}
      <ul className="space-y-3">
        {state.results.map((t) => {
          const has = !!(t.syncedLyrics || t.plainLyrics);
          const selecting = selectingId === t.id;
          return (
            <li key={t.id}>
              <button
                disabled={!has || t.instrumental || selectingId !== null}
                onClick={() => void pick(t)}
                className="w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.trackName}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {t.artistName}
                      {t.albumName ? ` · ${t.albumName}` : ""}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {selecting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {selecting ? "生成读音中" : fmt(t.duration)}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  {t.instrumental ? (
                    <span className="rounded-full bg-muted px-2 py-0.5">纯音乐</span>
                  ) : t.syncedLyrics ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      同步歌词
                    </span>
                  ) : t.plainLyrics ? (
                    <span className="rounded-full bg-muted px-2 py-0.5">纯文本歌词</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5">无歌词</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
