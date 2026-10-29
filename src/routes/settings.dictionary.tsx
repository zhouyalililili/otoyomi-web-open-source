import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mergeDictionary, rulesFromOverrides, SingAlongConverter, validateRule } from "@/core";
import { useInvalidateLibrary } from "@/hooks/use-library";
import { prefKeys, useDictionary } from "@/hooks/use-preferences";
import { setPronunciationRules } from "@/lib/lyrics-engine";
import { cn } from "@/lib/utils";
import { getStorage } from "@/storage/library";

export const Route = createFileRoute("/settings/dictionary")({
  head: () => ({
    meta: [
      { title: "个人发音字典 · 音咏 OtoYomi" },
      { name: "description", content: "自定义罗马音音节的中文跟唱替换规则，覆盖系统默认读音。" },
      { property: "og:title", content: "个人发音字典 · 音咏 OtoYomi" },
      { property: "og:description", content: "自定义罗马音音节的中文跟唱替换规则。" },
    ],
  }),
  component: DictionaryPage,
});

function DictionaryPage() {
  const { data: overrides } = useDictionary();
  const qc = useQueryClient();
  const invalidateLibrary = useInvalidateLibrary();
  const [romaji, setRomaji] = useState("");
  const [value, setValue] = useState("");
  const [sample, setSample] = useState("tsuki ga kirei");
  const [q, setQ] = useState("");
  const [onlyCustom, setOnlyCustom] = useState(false);

  const rules = useMemo(() => rulesFromOverrides(overrides ?? []), [overrides]);
  const entries = useMemo(() => {
    const k = q.trim().toLowerCase();
    return mergeDictionary(overrides ?? []).filter(
      (e) =>
        (!onlyCustom || e.customValue) &&
        (!k || e.romaji.includes(k) || (e.customValue ?? e.systemValue ?? "").includes(k)),
    );
  }, [overrides, q, onlyCustom]);

  async function refresh() {
    const list = await getStorage().listPronunciationOverrides();
    setPronunciationRules(rulesFromOverrides(list));
    await qc.invalidateQueries({ queryKey: prefKeys.dictionary });
  }

  async function add() {
    const v = validateRule(romaji, value);
    if (!v.ok) {
      toast.error(v.error);
      return;
    }
    await getStorage().putPronunciationOverride(v.rule);
    await refresh();
    toast.success(`已保存：${v.rule.romaji} → ${v.rule.singAlong}`);
    setRomaji("");
    setValue("");
  }
  async function remove(key: string) {
    await getStorage().deletePronunciationOverride(key);
    await refresh();
  }
  async function resetAll() {
    if (!confirm("删除全部自定义规则，恢复系统默认字典？")) return;
    for (const o of overrides ?? []) await getStorage().deletePronunciationOverride(o.romaji);
    await refresh();
    toast.success("已恢复为系统默认字典");
  }
  async function applyToLibrary() {
    if (!confirm("按当前字典重新生成所有歌曲的中文跟唱？手动修改过的跟唱会被覆盖。")) return;
    const storage = getStorage();
    const songs = await storage.listSongs();
    for (const s of songs) {
      await storage.putSong({
        ...s,
        updatedAt: Date.now(),
        lines: s.lines.map((l) => ({
          ...l,
          singAlong: l.romaji ? SingAlongConverter.convert(l.romaji, rules) : l.singAlong,
        })),
      });
    }
    void invalidateLibrary();
    toast.success(`已更新 ${songs.length} 首歌曲`);
  }

  return (
    <section>
      <PageHeader title="个人发音字典" back />
      <p className="mb-4 text-sm text-muted-foreground">
        为罗马音音节设置你习惯的中文跟唱写法，自定义规则优先于系统规则，并用于之后的所有导入与生成。
      </p>

      <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <Input
          value={romaji}
          onChange={(e) => setRomaji(e.target.value)}
          placeholder="罗马音，如 tsu"
          aria-label="罗马音"
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="跟唱，如 茨"
          aria-label="跟唱替换"
          onKeyDown={(e) => e.key === "Enter" && void add()}
        />
        <Button onClick={add}>保存</Button>
      </div>

      <div className="mb-6 rounded-xl bg-muted/50 p-3 text-sm">
        <div className="mb-1 text-xs text-muted-foreground">实时预览</div>
        <Input
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="mb-2 bg-background"
          aria-label="预览罗马音"
        />
        <div className="text-lg font-semibold">{SingAlongConverter.convert(sample, rules)}</div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索音节"
            className="pl-9"
          />
        </div>
        <Button
          variant={onlyCustom ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyCustom((v) => !v)}
        >
          仅自定义（{overrides?.length ?? 0}）
        </Button>
      </div>

      <ul className="divide-y rounded-xl border">
        {entries.map((e) => (
          <li
            key={e.romaji}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm",
              e.customValue && "bg-primary/5",
            )}
          >
            <span className="w-16 font-mono">{e.romaji}</span>
            <span className="flex-1">
              {e.customValue ? (
                <>
                  <b className="text-primary">{e.customValue}</b>
                  {e.systemValue && (
                    <span className="ml-2 text-xs text-muted-foreground line-through">
                      {e.systemValue}
                    </span>
                  )}
                </>
              ) : (
                e.systemValue
              )}
            </span>
            <button
              aria-label={`编辑 ${e.romaji}`}
              onClick={() => {
                setRomaji(e.romaji);
                setValue(e.customValue ?? e.systemValue ?? "");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {e.customValue && (
              <button
                aria-label={`删除 ${e.romaji}`}
                onClick={() => remove(e.romaji)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
        {!entries.length && (
          <li className="p-6 text-center text-sm text-muted-foreground">没有匹配的音节</li>
        )}
      </ul>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={applyToLibrary}>
          用当前字典更新曲库跟唱
        </Button>
        <Button variant="outline" disabled={!overrides?.length} onClick={resetAll}>
          <RotateCcw className="h-4 w-4" />
          重置为系统默认字典
        </Button>
      </div>
    </section>
  );
}
