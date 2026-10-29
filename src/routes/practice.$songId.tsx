import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Eye, ImagePlus, Maximize, Minimize, Pause, Pencil, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/library/parts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  activeLineIndex,
  advanceClock,
  buildTimeline,
  type AppSettings,
  type PracticeSpeed,
} from "@/core";
import { useAssetUrl, useInvalidateLibrary, useSong } from "@/hooks/use-library";
import { useSettings } from "@/hooks/use-preferences";
import { getStorage } from "@/storage/library";
import type { Song } from "@/types";

export const Route = createFileRoute("/practice/$songId")({
  head: () => ({ meta: [{ title: "跟唱练习 · 音咏 OtoYomi" }] }),
  component: PracticeRoute,
});

function PracticeRoute() {
  const { songId } = Route.useParams();
  const { data: song, isLoading } = useSong(songId);
  const { data: settings } = useSettings();
  if (isLoading || !settings) return null;
  if (!song) return <EmptyState>这首歌不存在或已被删除。</EmptyState>;
  return <Practice song={song} defaults={settings} />;
}

type Display = Pick<
  AppSettings,
  "showJapanese" | "showRomaji" | "showSingAlong" | "fontScale" | "overlayOpacity"
>;

function Practice({ song, defaults }: { song: Song; defaults: AppSettings }) {
  const router = useRouter();
  const invalidate = useInvalidateLibrary();
  const background = useAssetUrl(song.backgroundAssetId);
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [display, setDisplay] = useState<Display>({
    showJapanese: defaults.showJapanese,
    showRomaji: defaults.showRomaji,
    showSingAlong: defaults.showSingAlong || (!defaults.showJapanese && !defaults.showRomaji),
    fontScale: defaults.fontScale,
    overlayOpacity: defaults.overlayOpacity,
  });
  const [speed, setSpeed] = useState<PracticeSpeed>(defaults.defaultSpeed);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const timeline = useMemo(() => buildTimeline(song.lines), [song.lines]);
  const startOffset = timeline.starts[0] ?? 0;
  const current = activeLineIndex(timeline.starts, elapsed);

  useEffect(() => {
    void getStorage()
      .getSong(song.id)
      .then((saved) => saved && getStorage().putSong({ ...saved, lastPracticedAt: Date.now() }))
      .then(() => invalidate());
  }, [song.id, invalidate]);
  useEffect(() => setElapsed(startOffset), [startOffset]);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      setElapsed((value) => {
        const next = advanceClock(value, now - last, speed);
        if (next >= timeline.totalMs) {
          setPlaying(false);
          return timeline.totalMs;
        }
        return next;
      });
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, timeline.totalMs]);
  useEffect(() => {
    if (playing)
      lineRefs.current[current]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }, [current, playing]);
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const jumpTo = useCallback(
    (index: number) => {
      setElapsed(timeline.starts[Math.max(0, Math.min(index, timeline.starts.length - 1))] ?? 0);
    },
    [timeline.starts],
  );

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground"
    >
      {background && (
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {background && (
        <div
          className="absolute inset-0 bg-white"
          style={{ opacity: Math.max(0.55, display.overlayOpacity) }}
        />
      )}

      <header className="relative z-10 flex min-h-[84px] items-center gap-1 bg-background/90 px-3 backdrop-blur-sm">
        <button aria-label="返回" onClick={() => router.history.back()} className="p-3">
          <ArrowLeft className="h-8 w-8" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-medium">{song.title}</div>
          <div className="truncate text-sm">{song.artist || "未知歌手"}</div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="歌词显示" className="p-3 text-muted-foreground">
              <Eye className="h-8 w-8" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            {(
              [
                ["showJapanese", "日文原文"],
                ["showRomaji", "罗马音"],
                ["showSingAlong", "中文音译"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between">
                {label}
                <Switch
                  checked={display[key]}
                  onCheckedChange={(checked) =>
                    setDisplay((state) => ({ ...state, [key]: checked }))
                  }
                />
              </label>
            ))}
          </PopoverContent>
        </Popover>
        <Link
          to="/editor"
          search={{ songId: song.id }}
          aria-label="编辑歌词"
          className="p-3 text-muted-foreground"
        >
          <Pencil className="h-8 w-8" />
        </Link>
        <Link
          to="/editor"
          search={{ songId: song.id }}
          aria-label="设置背景"
          className="hidden p-3 text-muted-foreground sm:block"
        >
          <ImagePlus className="h-8 w-8" />
        </Link>
        <button
          aria-label={fullscreen ? "退出全屏" : "全屏"}
          onClick={toggleFullscreen}
          className="p-3 text-muted-foreground"
        >
          {fullscreen ? <Minimize className="h-8 w-8" /> : <Maximize className="h-8 w-8" />}
        </button>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <ol
          className="mx-auto max-w-[860px] space-y-8 px-6 py-8"
          style={{ fontSize: `${display.fontScale}rem` }}
        >
          {song.lines.map((line, index) => (
            <li
              key={line.position}
              ref={(element) => {
                lineRefs.current[index] = element;
              }}
              onClick={() => jumpTo(index)}
              className="cursor-pointer"
            >
              {display.showJapanese && line.japanese && (
                <div lang="ja" className="font-japanese text-[1.15em] leading-relaxed">
                  {line.japanese}
                </div>
              )}
              {display.showRomaji && line.romaji && (
                <div className="font-romaji mt-1 text-[1.05em] leading-relaxed text-[#2d806a]">
                  {line.romaji}
                </div>
              )}
              {display.showSingAlong && line.singAlong && (
                <div
                  lang="zh-CN"
                  className="font-simplified mt-2 text-[1.55em] font-bold leading-tight"
                >
                  {line.singAlong}
                </div>
              )}
            </li>
          ))}
        </ol>
      </main>

      <footer className="relative z-10 flex min-h-[86px] items-center gap-4 border-t bg-background px-5 pb-[env(safe-area-inset-bottom)]">
        <button
          aria-label={playing ? "暂停" : "开始自动滚动"}
          onClick={() => setPlaying((value) => !value)}
          className="p-2"
        >
          {playing ? (
            <Pause className="h-8 w-8 fill-current" />
          ) : (
            <Play className="h-8 w-8 fill-current" />
          )}
        </button>
        <Slider
          min={0.5}
          max={2}
          step={0.25}
          value={[speed]}
          onValueChange={([value]) => value !== undefined && setSpeed(value as PracticeSpeed)}
          className="flex-1"
        />
        <span className="w-16 text-right text-xl tabular-nums">{speed}x</span>
      </footer>
    </div>
  );
}
