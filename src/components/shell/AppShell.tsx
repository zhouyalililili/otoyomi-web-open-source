import { ClientOnly, Link, useRouterState } from "@tanstack/react-router";
import { Folder, Music2, PlusCircle, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePronunciationRulesSync } from "@/hooks/use-preferences";

function RulesSync() {
  usePronunciationRulesSync();
  return null;
}

const tabs = [
  { to: "/", label: "曲库", icon: Music2 },
  { to: "/collections", label: "合集", icon: Folder },
  { to: "/add", label: "添加", icon: PlusCircle },
  { to: "/settings", label: "设置", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      <ClientOnly fallback={null}>
        <RulesSync />
      </ClientOnly>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r bg-card md:flex">
        <div className="px-7 pb-6 pt-8">
          <div className="text-2xl font-bold tracking-tight">音咏</div>
          <div className="text-sm text-muted-foreground">OtoYomi</div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex items-center gap-4 rounded-md px-4 py-3 text-base",
                isActive(tab.to)
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <tab.icon className="h-6 w-6" strokeWidth={2} />
              <span>{tab.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-h-dvh pb-[calc(76px+env(safe-area-inset-bottom))] md:ml-56 md:pb-0">
        <div className="mx-auto w-full max-w-[860px] px-5 pb-8 pt-5 sm:px-8 md:py-8">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid min-h-[72px] grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex min-h-[72px] flex-col items-center justify-center gap-1 text-sm",
              isActive(tab.to) ? "font-medium text-primary" : "text-muted-foreground",
            )}
          >
            <tab.icon className="h-7 w-7" strokeWidth={2} />
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PlaceholderView({ title, hint }: { title: string; hint: string }) {
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      <div className="border-y py-12 text-center text-muted-foreground">{hint}</div>
    </section>
  );
}
