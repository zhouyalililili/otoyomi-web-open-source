import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LayoutGrid, Plus } from "lucide-react";
import { coverClass, EmptyState, PageHeader } from "@/components/library/parts";
import { useCollections, useSongs } from "@/hooks/use-library";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "合集 · 音咏 OtoYomi" },
      { name: "description", content: "按主题整理你的日语练唱歌曲合集。" },
      { property: "og:title", content: "合集 · 音咏 OtoYomi" },
      { property: "og:description", content: "按主题整理你的日语练唱歌曲合集。" },
    ],
  }),
  component: CollectionsPage,
});

export function Collage({ seeds }: { seeds: string[] }) {
  const cells = [0, 1, 2, 3].map((i) => seeds[i] ?? `empty-${i}`);
  return (
    <div className="grid h-14 w-14 shrink-0 grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
      {cells.map((s, i) => (
        <div key={i} className={cn(seeds[i] ? coverClass(s) : "bg-muted")} />
      ))}
    </div>
  );
}

function CollectionsPage() {
  const { data: songs } = useSongs();
  const { data: collections, isLoading } = useCollections();

  return (
    <section>
      <PageHeader
        title="合集"
        action={
          <Link
            to="/collections/new"
            aria-label="创建合集"
            className="flex rounded-full border-2 border-foreground p-1"
          >
            <Plus className="h-4 w-4" />
          </Link>
        }
      />
      <Link to="/" className="mb-4 flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cover-1 text-background">
          <LayoutGrid className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">全部曲库</div>
          <div className="text-sm text-muted-foreground">{songs?.length ?? 0} 首歌曲</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {isLoading ? null : !collections?.length ? (
        <EmptyState>还没有自建合集，点右上角「+」创建一个。</EmptyState>
      ) : (
        <ul className="divide-y">
          {collections.map((c) => (
            <li key={c.id}>
              <Link
                to="/collections/$collectionId"
                params={{ collectionId: c.id }}
                className="flex items-center gap-4 py-3"
              >
                <Collage seeds={c.songIds} />
                <div className="flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.songIds.length} 首歌曲</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
