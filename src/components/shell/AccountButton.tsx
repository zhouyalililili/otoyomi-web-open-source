import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogIn, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authAdapter, quotaAdapter } from "@/config/services";
import { loginDialog, useAiQuota, useLoginDialogOpen, useSession } from "@/hooks/use-auth";

const LOCAL_NOTE =
  "账户只应用于需要服务端的扩展功能；歌曲、歌词、图片和设置仍保存在当前浏览器本地。";

export function AccountButton({ compact = false }: { compact?: boolean }) {
  const { session, ready } = useSession();
  const { data: quota } = useAiQuota(!!session);
  const queryClient = useQueryClient();
  const open = useLoginDialogOpen();

  async function signOut() {
    try {
      await authAdapter.signOut();
      queryClient.removeQueries({ queryKey: ["ai-quota"] });
      toast.success("已退出登录");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "退出登录失败");
    }
  }

  if (!ready) return <div className="h-9" />;
  if (!authAdapter.configured) return null;

  return (
    <>
      {session ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size={compact ? "icon" : "sm"}
              className={compact ? "rounded-full" : "gap-2"}
              aria-label={`账户：${session.user.email ?? session.user.displayName ?? "已登录"}`}
            >
              <User className="h-4 w-4" />
              {!compact && (
                <span className="max-w-32 truncate">
                  {session.user.email ?? session.user.displayName ?? "已登录"}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3 text-sm">
            <div>
              <div className="font-medium">
                {session.user.displayName ?? session.user.email ?? "当前账户"}
              </div>
              {session.user.email && (
                <div className="text-xs text-muted-foreground">{session.user.email}</div>
              )}
            </div>
            {quotaAdapter.configured && (
              <div className="rounded-lg bg-muted/60 p-3">
                AI 智能导入今日剩余：
                <b className="text-primary">
                  {quota
                    ? quota.unlimited
                      ? "不限"
                      : `${quota.remaining} / ${quota.dailyLimit} 次`
                    : "…"}
                </b>
                {quota?.resetDescription && (
                  <div className="mt-1 text-xs text-muted-foreground">{quota.resetDescription}</div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{LOCAL_NOTE}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
              <LogOut className="h-4 w-4" /> 退出登录
            </Button>
          </PopoverContent>
        </Popover>
      ) : (
        <Button size="sm" variant="outline" className="gap-2" onClick={() => loginDialog.open()}>
          <LogIn className="h-4 w-4" /> {compact ? "登录" : "登录"}
        </Button>
      )}
      <LoginDialog open={open && !session} onOpenChange={loginDialog.set} />
    </>
  );
}

function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function google() {
    setBusy(true);
    setInfo(null);
    try {
      await authAdapter.signInWithOAuth("google");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google 登录失败");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setInfo(null);
    try {
      if (mode === "signin") {
        await authAdapter.signInWithEmail(email, password);
        onOpenChange(false);
        toast.success("登录成功");
      } else {
        const result = await authAdapter.signUpWithEmail(email, password);
        if (result.confirmationRequired) setInfo("注册成功，请查收确认邮件后登录。");
        else {
          onOpenChange(false);
          toast.success("注册并登录成功");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "账户操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>登录</DialogTitle>
          <DialogDescription>{LOCAL_NOTE}</DialogDescription>
        </DialogHeader>
        <Button className="w-full" onClick={google} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "正在登录…" : "使用 Google 继续"}
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          或使用邮箱
          <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submitEmail} className="space-y-2">
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱"
            autoComplete="email"
          />
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码（至少 6 位）"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          <Button type="submit" variant="outline" className="w-full" disabled={busy}>
            {mode === "signin" ? "邮箱登录" : "注册账户"}
          </Button>
        </form>
        {info && <p className="text-sm text-primary">{info}</p>}
        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => setMode((value) => (value === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "还没有账户？注册" : "已有账户？登录"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
