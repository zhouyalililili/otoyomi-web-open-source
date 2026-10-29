import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Music, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, SongCover } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useInvalidateLibrary, useSongs } from "@/hooks/use-library";
import { draftStore } from "@/lib/draft-store";
import { createCollection, getStorage, sortByRecentPractice } from "@/storage/library";

export const Route = createFileRoute("/collections/new")({
  head: () => ({
    meta: [
      { title: "创建合集 · 音咏 OtoYomi" },
      { name: "description", content: "命名合集并从曲库勾选歌曲。" },
      { property: "og:title", content: "创建合集 · 音咏 OtoYomi" },
      { property: "og:description", content: "命名合集并从曲库勾选歌曲。" },
    ],
  }),
  component: NewCollectionPage,
});

function NewCollectionPage() {
  const { data: songs } = useSongs();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(true);
  const navigate = useNavigate();
  const invalidate = useInvalidateLibrary();

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function save(thenNewSong: boolean) {
    if (!name.trim()) {
      toast.error("请先填写合集名称");
      return;
    }
    const c = createCollection(name, selected);
    await getStorage().putCollection(c);
    void invalidate();
    if (thenNewSong) {
      draftStore.setTargetCollection(c.id);
      toast.success(`已创建「${c.name}」，新歌保存后会自动加入`);
      void navigate({ to: "/add" });
    } else {
      toast.success(`已创建「${c.name}」`);
      void navigate({ to: "/collections/$collectionId", params: { collectionId: c.id } });
    }
  }

  return (
    <section>
      <PageHeader title="创建合集" back />
      <label className="mb-1.5 block text-sm font-medium">合集名称</label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例如：周末练习"
        className="mb-6 h-11"
      />

      <h2 className="mb-2 text-sm font-medium">添加歌曲</h2>
      <button
        onClick={() => setShowPicker((v) => !v)}
        className="flex w-full items-center gap-4 py-3 text-left"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border bg-cover-1/15 text-cover-1">
          <Music className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-medium">从曲库选择</span>
          <span className="block text-sm text-muted-foreground">勾选已经保存的歌曲</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <button onClick={() => save(true)} className="flex w-full items-center gap-4 py-3 text-left">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border bg-cover-2/15 text-cover-2">
          <Plus className="h-5 w-5" />
        </span>
        <span className="flex-1">
          <span className="block font-medium">新建歌曲</span>
          <span className="block text-sm text-muted-foreground">创建完成后自动加入合集</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {showPicker && (
        <ul className="mt-2 divide-y border-t">
          {!songs?.length && (
            <li className="py-6 text-center text-sm text-muted-foreground">曲库里还没有歌曲</li>
          )}
          {sortByRecentPractice(songs ?? []).map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-4 py-2.5">
                <SongCover song={s} className="h-12 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">{s.artist}</span>
                </span>
                <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
              </label>
            </li>
          ))}
        </ul>
      )}

      <Button className="mt-6 h-12 w-full text-base" onClick={() => save(false)}>
        创建合集（{selected.length} 首）
      </Button>
    </section>
  );
}
