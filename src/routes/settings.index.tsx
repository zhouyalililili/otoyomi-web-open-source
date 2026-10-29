import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Download,
  Gauge,
  Image as ImageIcon,
  Trash2,
  Type,
  UserRound,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/library/parts";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BACKGROUND_PRESETS, PRACTICE_SPEEDS, type AppSettings } from "@/core";
import { aiImportAdapter, authAdapter, quotaAdapter } from "@/config/services";
import { useAiQuota, useSession } from "@/hooks/use-auth";
import { useDictionary, useSaveSettings, useSettings } from "@/hooks/use-preferences";
import { setPronunciationRules } from "@/lib/lyrics-engine";
import { cn } from "@/lib/utils";
import { downloadJson, exportBackup, importBackup } from "@/storage/backup-io";
import { getStorage } from "@/storage/library";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "设置 · 音咏 OtoYomi" },
      { name: "description", content: "个人发音字典、显示与练习默认值、曲库备份与恢复。" },
      { property: "og:title", content: "设置 · 音咏 OtoYomi" },
      { property: "og:description", content: "个人发音字典、显示与练习默认值、曲库备份与恢复。" },
    ],
  }),
  component: SettingsPage,
});

export const PRESET_LABELS: Record<(typeof BACKGROUND_PRESETS)[number], string> = {
  dawn: "晨野",
  sakura: "樱色",
  sea: "海蓝",
  night: "夜空",
};

function SettingsPage() {
  const { data: settings } = useSettings();
  const { data: dict } = useDictionary();
  const { session } = useSession();
  const { data: quota } = useAiQuota(!!session);
  const save = useSaveSettings();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!settings) return null;
  const set = (p: Partial<AppSettings>) => void save({ ...settings, ...p });

  async function doExport() {
    const data = await exportBackup(getStorage());
    downloadJson(data, `otoyomi-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success(`已导出 ${data.songs.length} 首歌曲、${data.collections.length} 个合集`);
  }
  async function doImport(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 25 * 1024 * 1024) throw new Error("备份文件不能超过 25 MB");
      const r = await importBackup(getStorage(), await f.text());
      await qc.invalidateQueries();
      toast.success(`已恢复 ${r.songs} 首歌曲、${r.collections} 个合集、${r.rules} 条发音规则`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "恢复失败");
    }
  }
  async function doClear() {
    await getStorage().clearAll();
    setPronunciationRules({});
    await qc.invalidateQueries();
    setConfirmClear(false);
    toast.success("本地数据已清除");
  }

  return (
    <section className="space-y-8">
      <PageHeader title="设置" />

      <Group title="账户与 AI" icon={UserRound}>
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {!authAdapter.configured
                ? "当前构建未配置账户服务"
                : session
                  ? (session.user.email ?? session.user.displayName ?? "已登录")
                  : "尚未登录"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {!authAdapter.configured || !aiImportAdapter.configured || !quotaAdapter.configured
                ? "开源版默认不包含登录、AI 密钥和额度后端；请参考 docs/HOSTED_FEATURES.md。"
                : session
                  ? quota
                    ? quota.unlimited
                      ? "AI 智能导入额度：不限"
                      : `今日剩余 ${quota.remaining} / ${quota.dailyLimit} 次`
                    : "正在读取今日 AI 额度…"
                  : "登录后可使用部署者配置的 AI 智能导入"}
            </div>
            {quota?.resetDescription && (
              <div className="mt-1 text-xs text-muted-foreground">{quota.resetDescription}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">曲库与图片仍保存在本浏览器。</div>
          </div>
          {authAdapter.configured && <AccountButton />}
        </div>
      </Group>

      <Link to="/settings/dictionary" className="flex items-center gap-4 rounded-xl border p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/80 text-xl font-bold text-primary-foreground">
          あ
        </span>
        <span className="flex-1">
          <span className="block font-medium">个人发音字典</span>
          <span className="block text-sm text-muted-foreground">
            {dict?.length ?? 0} 条自定义规则
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <Group title="显示设置" icon={Type}>
        <Row label="默认显示日文原文">
          <Switch
            checked={settings.showJapanese}
            onCheckedChange={(v) => set({ showJapanese: v })}
          />
        </Row>
        <Row label="默认显示罗马音">
          <Switch checked={settings.showRomaji} onCheckedChange={(v) => set({ showRomaji: v })} />
        </Row>
        <Row label="默认显示中文跟唱">
          <Switch
            checked={settings.showSingAlong}
            onCheckedChange={(v) => set({ showSingAlong: v })}
          />
        </Row>
        <Row label={`默认字体大小 ${Math.round(settings.fontScale * 100)}%`}>
          <Slider
            className="w-40"
            min={0.8}
            max={1.6}
            step={0.1}
            value={[settings.fontScale]}
            onValueChange={([v]) => v !== undefined && set({ fontScale: v })}
          />
        </Row>
      </Group>

      <Group title="练习设置" icon={Gauge}>
        <div className="py-3">
          <div className="mb-2 text-sm">默认滚动速度</div>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => set({ defaultSpeed: s })}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm",
                  settings.defaultSpeed === s && "border-primary bg-primary/10 text-primary",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
        <Row label={`背景遮罩 ${Math.round(settings.overlayOpacity * 100)}%`}>
          <Slider
            className="w-40"
            min={0}
            max={0.9}
            step={0.05}
            value={[settings.overlayOpacity]}
            onValueChange={([v]) => v !== undefined && set({ overlayOpacity: v })}
          />
        </Row>
      </Group>

      <Group title="默认歌曲背景" icon={ImageIcon}>
        <div className="grid grid-cols-4 gap-3 py-3">
          {BACKGROUND_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => set({ defaultBackground: p })}
              className={cn(
                "overflow-hidden rounded-xl border-2",
                settings.defaultBackground === p ? "border-primary" : "border-transparent",
              )}
            >
              <div className={cn("h-14", `practice-bg-${p}`)} />
              <div className="py-1 text-xs">{PRESET_LABELS[p]}</div>
            </button>
          ))}
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          歌曲单独设置的背景图片优先；可在歌词编辑器中更换。
        </p>
      </Group>

      <Group title="数据管理" icon={Download}>
        <button
          onClick={doExport}
          className="flex w-full items-center gap-3 py-3 text-left text-sm"
        >
          <Download className="h-4 w-4" />
          备份导出全部曲库与合集（JSON）
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-3 py-3 text-left text-sm"
        >
          <Upload className="h-4 w-4" />
          从备份文件恢复
        </button>
        <button
          onClick={() => setConfirmClear(true)}
          className="flex w-full items-center gap-3 py-3 text-left text-sm text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          清除本地数据
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void doImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </Group>

      <p className="text-center text-xs text-muted-foreground">
        曲库、图片与设置保存在本浏览器中；在线搜索会发送搜索词，智能导入仅在你主动点击时发送当前歌词文本。网页版不提供跨应用悬浮窗。
      </p>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清除全部本地数据？</AlertDialogTitle>
            <AlertDialogDescription>
              歌曲、合集、背景图片、发音字典和设置都会被删除，无法恢复。建议先导出备份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={doClear}>全部清除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Group({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Type;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      <div className="divide-y border-y">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}
