"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CloudOff,
  Cloud,
  Dumbbell,
  HeartPulse,
  History,
  Home,
  Menu,
  Play,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/spinner";
import { AuthScreen } from "./AuthScreen";
import { formatTime } from "@/lib/dates";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  mobile?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Início", icon: Home, mobile: true },
  { href: "/semana", label: "Minha semana", icon: CalendarDays, mobile: true },
  { href: "/historico", label: "Histórico", icon: History, mobile: true },
  { href: "/recuperacao", label: "Recuperação", icon: HeartPulse, mobile: true },
  { href: "/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/progressao", label: "Progressão", icon: BarChart3 },
  { href: "/perfil", label: "Perfil", icon: Settings },
];

/** Itens que, no celular, ficam dentro do menu "Mais". */
const MORE_NAV = NAV.filter((n) => !n.mobile);

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, fatalError } = useApp();
  const pathname = usePathname();

  if (status === "auth") return <AuthScreen />;

  if (status === "error") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="card max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger" />
          <h1 className="text-lg font-semibold">Não foi possível carregar seus dados</h1>
          <p className="mt-2 text-sm text-muted">{fatalError}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const inWorkout = pathname.startsWith("/treino");

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Principal">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-accent/12 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <ActiveSessionBanner compact />
          <StorageIndicator />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur lg:hidden">
          <Logo />
          <StorageIndicator compact />
        </header>

        <SaveErrorBanner />
        <IssuesBanner />

        <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8", !inWorkout && "pb-28 lg:pb-8")}>
          {status === "loading" ? <LoadingScreen /> : children}
        </main>

        {/* Bottom nav mobile */}
        {!inWorkout ? <MobileNav pathname={pathname} /> : null}

        {!inWorkout ? <ActiveSessionBanner /> : null}
      </div>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_NAV.some((n) => isActive(pathname, n.href));

  // Fecha o menu ao navegar.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const tabClass = (active: boolean) =>
    cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors", active ? "text-accent" : "text-muted hover:text-fg");

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} aria-hidden />
          <div
            role="menu"
            aria-label="Mais seções"
            className="absolute inset-x-3 bottom-[76px] rounded-2xl border border-line bg-surface p-2 shadow-2xl animate-fade-up safe-bottom"
          >
            {MORE_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    active ? "bg-accent/12 text-accent" : "text-fg hover:bg-surface-2",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur safe-bottom lg:hidden" aria-label="Navegação inferior">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.filter((n) => n.mobile).map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
                <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgb(var(--accent)/0.6)]")} aria-hidden />
                {item.label === "Minha semana" ? "Semana" : item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={tabClass(moreActive || moreOpen)}
          >
            {moreOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className={cn("h-5 w-5", moreActive && "drop-shadow-[0_0_8px_rgb(var(--accent)/0.6)]")} aria-hidden />}
            Mais
          </button>
        </div>
      </nav>
    </>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="IronLog — início">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-glow">
        <Dumbbell className="h-4 w-4" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        Iron<span className="text-accent">Log</span>
      </span>
    </Link>
  );
}

function StorageIndicator({ compact = false }: { compact?: boolean }) {
  const { mode, user, lastSavedAt, saveError } = useApp();
  const Icon = mode === "supabase" ? Cloud : CloudOff;
  const label = mode === "supabase" ? `Nuvem · ${user?.email ?? ""}` : "Modo local (sem sincronização)";
  if (compact) {
    return (
      <span className={cn("flex items-center gap-1 text-xs", saveError ? "text-danger" : "text-muted")} title={label}>
        <Icon className="h-4 w-4" />
        {saveError ? "Erro" : mode === "supabase" ? "Nuvem" : "Local"}
      </span>
    );
  }
  return (
    <div className="mt-3 flex items-start gap-2 text-xs text-muted">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="truncate">{label}</p>
        {lastSavedAt ? <p>Salvo às {formatTime(lastSavedAt)}</p> : null}
      </div>
    </div>
  );
}

function SaveErrorBanner() {
  const { saveError, actions } = useApp();
  if (!saveError) return null;
  return (
    <div role="alert" className="flex items-center gap-3 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{saveError}</span>
      <Button size="sm" variant="danger" onClick={actions.retrySave}>
        <RefreshCw className="h-4 w-4" /> Tentar salvar novamente
      </Button>
    </div>
  );
}

function IssuesBanner() {
  const { issues, actions } = useApp();
  if (issues.length === 0) return null;
  return (
    <div className="flex items-start gap-3 border-b border-warn/30 bg-warn/10 px-4 py-2 text-sm text-warn">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <ul className="flex-1 space-y-0.5">
        {issues.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
      <button onClick={actions.dismissIssues} aria-label="Fechar avisos" className="rounded p-1 hover:bg-warn/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ActiveSessionBanner({ compact = false }: { compact?: boolean }) {
  const { data } = useApp();
  const session = data.activeSession;
  if (!session) return null;
  if (compact) {
    return (
      <Link href="/treino" className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
        <Play className="h-4 w-4 fill-current" />
        <span className="truncate">Treino em andamento: {session.dayName}</span>
      </Link>
    );
  }
  return (
    <div className="fixed inset-x-0 bottom-[68px] z-30 px-4 lg:hidden">
      <Link
        href="/treino"
        className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-accent/40 bg-surface px-4 py-3 shadow-glow"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg">
          <Play className="h-4 w-4 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Treino em andamento</p>
          <p className="truncate text-sm font-semibold">{session.dayName}</p>
        </div>
        <span className="text-xs font-medium text-accent">Retomar</span>
      </Link>
    </div>
  );
}
