import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAssetUrl } from "@/hooks/use-library";
import { cn } from "@/lib/utils";
import { LyricIssue, type Song } from "@/types";

const COVER_CLASSES = [
  "bg-cover-1",
  "bg-cover-2",
  "bg-cover-3",
  "bg-cover-4",
  "bg-cover-5",
  "bg-cover-6",
];

export function coverClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_CLASSES[h % COVER_CLASSES.length]!;
}

export function SongCover({ song, className }: { song: Song; className?: string }) {
  const url = useAssetUrl(song.backgroundAssetId);
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-[#dff4ed]", className)}>
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[#1f5b4d]">
          <Music2 className="h-8 w-8" strokeWidth={2.2} />
        </span>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  back,
  action,
}: {
  title: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="mb-7 flex min-h-14 items-center gap-4">
      {back && (
        <button aria-label="返回" onClick={() => router.history.back()} className="-ml-2 p-2">
          <ArrowLeft className="h-8 w-8" strokeWidth={2} />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-[1.75rem] font-medium tracking-tight">{title}</h1>
      {action && <div className="flex items-center">{action}</div>}
    </header>
  );
}

export const ISSUE_LABELS: Record<LyricIssue, string> = {
  [LyricIssue.ORIGINAL_ONLY]: "仅有原文",
  [LyricIssue.ROMAJI_ONLY]: "仅有罗马音",
  [LyricIssue.POSSIBLE_MISMATCH]: "可能错配",
  [LyricIssue.NEEDS_CONFIRMATION]: "待补充",
};

export function IssueChips({ issues }: { issues: LyricIssue[] }) {
  if (!issues.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((issue) => (
        <span
          key={issue}
          className={cn("rounded bg-warning px-2 py-0.5 text-xs text-warning-foreground")}
        >
          {ISSUE_LABELS[issue]}
        </span>
      ))}
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-y py-12 text-center text-sm text-muted-foreground">
      <p>{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AddSongLink({ label = "添加歌曲" }: { label?: string }) {
  return (
    <Link
      to="/add"
      className="inline-flex bg-primary px-5 py-3 font-medium text-primary-foreground"
    >
      {label}
    </Link>
  );
}
