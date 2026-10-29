import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderHeart, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddSongLink, EmptyState, SongCover } from "@/components/library/parts";
import { AccountButton } from "@/components/shell/AccountButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useInvalidateLibrary, useSongs } from "@/hooks/use-library";
import { deleteSongCascade, getStorage, sortByRecentPractice } from "@/storage/library";
import type { Song } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "曲库 · 音咏 OtoYomi" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data: songs, isLoading } = useSongs();
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Song | null>(null);
  const invalidate = useInvalidateLibrary();
  const sorted = useMemo(() => sortByRecentPractice(songs ?? []), [songs]);
  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    return key
      ? sorted.filter((song) =>
          `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(key),
        )
      : sorted;
  }, [sorted, q]);

  async function confirmDelete() {
    if (!toDelete) return;
    await deleteSongCascade(getStorage(), toDelete.id);
    toast.success(`已删除「${toDelete.title}」`);
    setToDelete(null);
    void invalidate();
  }

  return (
    <section className="relative min-h-[calc(100dvh-130px)]">
      <header className="mb-8 flex items-center">
        <h1 className="flex-1 text-[2rem] font-bold tracking-tight">音咏</h1>
        <Link to="/collections" aria-label="合集" className="p-3 text-muted-foreground">
          <FolderHeart className="h-8 w-8" />
        </Link>
        <AccountButton compact />
      </header>

      <div className="relative mb-7">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="搜索本地歌曲或歌手"
          className="h-16 rounded-md pl-16 text-lg"
        />
      </div>

      <h2 className="mb-3 text-xl font-semibold">{q.trim() ? "搜索结果" : "继续练习"}</h2>
      {isLoading ? null : !songs?.length ? (
        <EmptyState action={<AddSongLink label="添加第一首歌" />}>曲库还是空的。</EmptyState>
      ) : filtered.length ? (
        <ul className="-mx-5 divide-y border-y sm:-mx-8">
          {filtered.map((song) => (
            <li key={song.id}>
              <SongRow song={song} onDelete={setToDelete} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>没有匹配的歌曲</EmptyState>
      )}

      <Link
        to="/add"
        aria-label="添加歌曲"
        className="fixed bottom-24 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fee2dc] text-[#6b2119] shadow-lg md:bottom-8 md:right-8"
      >
        <Plus className="h-8 w-8" />
      </Link>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这首歌？</AlertDialogTitle>
            <AlertDialogDescription>
              「{toDelete?.title}」将从曲库和所有合集中移除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SongRow({ song, onDelete }: { song: Song; onDelete: (song: Song) => void }) {
  return (
    <div className="flex min-h-24 items-center gap-5 px-5 py-3 sm:px-8">
      <Link
        to="/practice/$songId"
        params={{ songId: song.id }}
        className="flex min-w-0 flex-1 items-center gap-5"
      >
        <SongCover song={song} className="h-[74px] w-[74px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-xl leading-snug">{song.title}</span>
          <span className="mt-1 block truncate text-base text-muted-foreground">
            {song.artist || "未知歌手"}
          </span>
        </span>
      </Link>
      <button
        aria-label="删除"
        onClick={() => onDelete(song)}
        className="p-3 text-muted-foreground"
      >
        <Trash2 className="h-7 w-7" />
      </button>
    </div>
  );
}
