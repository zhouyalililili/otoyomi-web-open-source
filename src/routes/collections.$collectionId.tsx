import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Play, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, SongCover } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { moveItem } from "@/core";
import { useCollection, useInvalidateLibrary, useSongs } from "@/hooks/use-library";
import { draftStore } from "@/lib/draft-store";
import { getStorage } from "@/storage/library";
import type { Collection } from "@/types";

export const Route = createFileRoute("/collections/$collectionId")({
  head: () => ({
    meta: [
      { title: "合集详情 · 音咏 OtoYomi" },
      { name: "description", content: "查看合集内歌曲，调整顺序并直接开练。" },
      { property: "og:title", content: "合集详情 · 音咏 OtoYomi" },
      { property: "og:description", content: "查看合集内歌曲，调整顺序并直接开练。" },
    ],
  }),
  component: CollectionDetail,
});

function CollectionDetail() {
  const { collectionId } = Route.useParams();
  const { data: collection, isLoading } = useCollection(collectionId);
  const { data: songs } = useSongs();
  const invalidate = useInvalidateLibrary();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (!collection) return <EmptyState>这个合集不存在或已被删除。</EmptyState>;

  const byId = new Map((songs ?? []).map((s) => [s.id, s]));
  const items = collection.songIds.map((id) => byId.get(id)).filter((s) => s !== undefined);

  async function update(next: Collection) {
    await getStorage().putCollection({ ...next, updatedAt: Date.now() });
    void invalidate();
  }
  async function remove() {
    if (!collection || !confirm(`删除合集「${collection.name}」？歌曲本身不会被删除。`)) return;
    await getStorage().deleteCollection(collection.id);
    void invalidate();
    toast.success("合集已删除");
    void navigate({ to: "/collections" });
  }

  return (
    <section>
      <PageHeader
        title={collection.name}
        back
        action={
          <button
            aria-label="删除合集"
            onClick={remove}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      />
      <p className="mb-4 text-sm text-muted-foreground">{items.length} 首歌曲</p>
      {!items.length ? (
        <EmptyState>合集里还没有歌曲。</EmptyState>
      ) : (
        <ul className="divide-y">
          {items.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <SongCover song={s} className="h-14 w-16" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.title}</div>
                <div className="truncate text-sm text-muted-foreground">{s.artist}</div>
              </div>
              <button
                aria-label="上移"
                disabled={i === 0}
                onClick={() =>
                  update({
                    ...collection,
                    songIds: moveItem(
                      collection.songIds,
                      collection.songIds.indexOf(s.id),
                      collection.songIds.indexOf(s.id) - 1,
                    ),
                  })
                }
                className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                aria-label="下移"
                disabled={i === items.length - 1}
                onClick={() =>
                  update({
                    ...collection,
                    songIds: moveItem(
                      collection.songIds,
                      collection.songIds.indexOf(s.id),
                      collection.songIds.indexOf(s.id) + 1,
                    ),
                  })
                }
                className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                aria-label="移出合集"
                onClick={() =>
                  update({ ...collection, songIds: collection.songIds.filter((x) => x !== s.id) })
                }
                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <Link
                to="/practice/$songId"
                params={{ songId: s.id }}
                aria-label="开始练习"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Play className="h-4 w-4 fill-current" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => {
          draftStore.setTargetCollection(collection.id);
          void navigate({ to: "/add" });
        }}
      >
        <Plus className="h-4 w-4" /> 新建歌曲并加入此合集
      </Button>
    </section>
  );
}
