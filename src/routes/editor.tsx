import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, IssueChips, PageHeader } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { finalizeEditedLines, moveItem, type EditableLine } from "@/core";
import { useAssetUrl, useInvalidateLibrary, useSong } from "@/hooks/use-library";
import { draftStore, useDraftState } from "@/lib/draft-store";
import { convertSingAlong, prepareJapaneseRomanizer, romanizer } from "@/lib/lyrics-engine";
import { getStorage, saveDraftAsSong, setSongBackground } from "@/storage/library";
import type { LyricIssue, LyricLine } from "@/types";

export const Route = createFileRoute("/editor")({
  validateSearch: (s: Record<string, unknown>) => ({
    songId: typeof s["songId"] === "string" ? s["songId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "歌词编辑器 · 音咏 OtoYomi" },
      { name: "description", content: "逐行编辑日文原文、罗马音与中文音译。" },
      { property: "og:title", content: "歌词编辑器 · 音咏 OtoYomi" },
      {
        property: "og:description",
        content: "逐行编辑日文原文、罗马音与中文音译。",
      },
    ],
  }),
  component: EditorPage,
});

interface Row extends EditableLine {
  key: number;
  issues: LyricIssue[];
}
interface Meta {
  title: string;
  artist: string;
  album: string;
}

let keySeq = 0;
const toRow = (l: LyricLine): Row => ({
  key: ++keySeq,
  timestampMs: l.timestampMs,
  japanese: l.japanese,
  romaji: l.romaji,
  singAlong: l.singAlong,
  issues: l.issues,
});

function EditorPage() {
  const { songId } = Route.useSearch();
  const { draft, targetCollectionId } = useDraftState();
  const { data: song, isLoading } = useSong(songId);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [bgFile, setBgFile] = useState<File | null | undefined>(undefined); // undefined = unchanged, null = removed
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const invalidate = useInvalidateLibrary();
  const storedBg = useAssetUrl(song?.backgroundAssetId);

  const source = songId ? song : draft;
  useEffect(() => {
    if (meta || !source) return;
    setMeta({
      title: source.title,
      artist: source.artist,
      album: source.album,
    });
    setRows(source.lines.map(toRow));
  }, [source, meta]);

  useEffect(() => {
    if (!bgFile) {
      setBgPreview(null);
      return;
    }
    const url = URL.createObjectURL(bgFile);
    setBgPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bgFile]);

  if (songId && isLoading) return null;
  if (!source || !meta) {
    return (
      <section>
        <PageHeader title="歌词编辑器" back />
        <EmptyState
          action={
            <Link to="/add" className="text-primary">
              去添加歌曲
            </Link>
          }
        >
          没有可编辑的歌曲。
        </EmptyState>
      </section>
    );
  }

  const patch = (key: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const insertAfter = (index: number) =>
    setRows((rs) => [
      ...rs.slice(0, index + 1),
      {
        key: ++keySeq,
        timestampMs: null,
        japanese: "",
        romaji: "",
        singAlong: "",
        issues: [],
      },
      ...rs.slice(index + 1),
    ]);

  function selectBackground(file: File) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      toast.error("背景仅支持 JPG、PNG 或 WebP");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("背景图片不能超过 8 MB");
      return;
    }
    setBgFile(file);
  }

  function removeRow(index: number) {
    const removed = rows[index];
    if (!removed) return;
    setRows((rs) => rs.filter((r) => r.key !== removed.key));
    toast("已删除一行", {
      duration: 5000,
      action: {
        label: "撤销",
        onClick: () =>
          setRows((rs) =>
            rs.some((r) => r.key === removed.key)
              ? rs
              : [...rs.slice(0, index), removed, ...rs.slice(index)],
          ),
      },
    });
  }

  async function save() {
    if (!meta) return;
    setSaving(true);
    try {
      await prepareJapaneseRomanizer();
    } catch (error) {
      setSaving(false);
      toast.error(error instanceof Error ? error.message : "日文读音词典加载失败，请重试");
      return;
    }
    const lines = finalizeEditedLines(rows, romanizer, convertSingAlong);
    if (!lines.length) {
      setSaving(false);
      toast.error("至少保留一行歌词");
      return;
    }
    const storage = getStorage();
    const base = {
      title: meta.title.trim() || "未命名歌曲",
      artist: meta.artist.trim(),
      album: meta.album.trim(),
      lines,
    };
    let saved;
    if (songId && song) {
      saved = { ...song, ...base, updatedAt: Date.now() };
      await storage.putSong(saved);
    } else {
      saved = await saveDraftAsSong(
        storage,
        { ...(draft ?? { source: "manual", sourceId: null }), ...base },
        targetCollectionId,
      );
      draftStore.clear();
    }
    if (bgFile !== undefined) saved = await setSongBackground(storage, saved, bgFile);
    void invalidate();
    toast.success("已保存到曲库");
    void navigate({ to: "/" });
  }

  const bgShown = bgFile === null ? null : (bgPreview ?? storedBg);

  return (
    <section>
      <PageHeader title="歌词编辑器" back />
      <div className="mb-6 grid gap-3">
        <Input
          value={meta.title}
          onChange={(e) => setMeta({ ...meta, title: e.target.value })}
          placeholder="歌名"
          aria-label="歌名"
        />
        <Input
          value={meta.artist}
          onChange={(e) => setMeta({ ...meta, artist: e.target.value })}
          placeholder="歌手"
          aria-label="歌手"
        />
        <Input
          value={meta.album}
          onChange={(e) => setMeta({ ...meta, album: e.target.value })}
          placeholder="专辑"
          aria-label="专辑"
        />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-16 w-24 overflow-hidden rounded-lg border bg-muted">
          {bgShown && <img src={bgShown} alt="练习背景" className="h-full w-full object-cover" />}
        </div>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> {bgShown ? "更换背景" : "设置练习背景"}
        </Button>
        {bgShown && (
          <Button variant="ghost" size="sm" onClick={() => setBgFile(null)}>
            <X className="h-4 w-4" /> 移除
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) selectBackground(file);
            e.target.value = "";
          }}
        />
      </div>

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.key} className="android-panel p-4">
            <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="mr-auto">#{i + 1}</span>
              <IssueChips issues={r.issues} />
              <button
                aria-label="上移"
                disabled={i === 0}
                onClick={() => setRows((rs) => moveItem(rs, i, i - 1))}
                className="rounded p-1 hover:bg-muted disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                aria-label="下移"
                disabled={i === rows.length - 1}
                onClick={() => setRows((rs) => moveItem(rs, i, i + 1))}
                className="rounded p-1 hover:bg-muted disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                aria-label="在下方插入行"
                onClick={() => insertAfter(i)}
                className="rounded p-1 hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                aria-label="删除行"
                onClick={() => removeRow(i)}
                className="rounded p-1 hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2">
              <Textarea
                rows={1}
                lang="ja"
                className="font-japanese min-h-16 resize-none bg-transparent text-lg"
                value={r.japanese}
                placeholder="日文原文"
                onChange={(e) => patch(r.key, { japanese: e.target.value })}
              />
              <Textarea
                rows={1}
                className="min-h-16 resize-none bg-transparent text-lg"
                value={r.romaji}
                placeholder="罗马音"
                onChange={(e) => patch(r.key, { romaji: e.target.value })}
              />
              <div className="flex gap-2">
                <Textarea
                  rows={1}
                  lang="zh-CN"
                  className="font-simplified min-h-16 flex-1 resize-none bg-transparent text-lg font-semibold"
                  value={r.singAlong}
                  placeholder="中文音译"
                  onChange={(e) => patch(r.key, { singAlong: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!r.romaji.trim()}
                  onClick={() => patch(r.key, { singAlong: convertSingAlong(r.romaji) })}
                >
                  按罗马音生成
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        className="mt-3 w-full"
        onClick={() => insertAfter(rows.length - 1)}
      >
        <Plus className="h-4 w-4" /> 新增一行
      </Button>

      <div className="sticky bottom-20 mt-6 bg-background py-3 md:bottom-0">
        <Button className="h-12 w-full text-base" disabled={saving} onClick={save}>
          保存到曲库
        </Button>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          三栏全空的行会在保存时自动移除
        </p>
      </div>
    </section>
  );
}
