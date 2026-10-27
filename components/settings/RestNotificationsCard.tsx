"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Send, Smartphone } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import {
  disableRestNotifications,
  enableRestNotifications,
  getRestNotificationStatus,
  sendTestNotification,
  type RestNotificationStatus,
} from "@/lib/push/client";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

/**
 * Preferência POR DISPOSITIVO (a permissão do navegador também é): não entra em Settings
 * nem sincroniza. Explica, sem rodeios, o que funciona em cada situação.
 */
export function RestNotificationsCard() {
  const { user, mode } = useApp();
  const toast = useToast();
  const [status, setStatus] = useState<RestNotificationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(() => getRestNotificationStatus().then((s) => setStatus(s)), []);

  // Sincroniza com o estado externo (permissão do navegador / inscrição de push),
  // que pode mudar enquanto o usuário está nas configurações do sistema.
  useEffect(() => {
    let active = true;
    getRestNotificationStatus().then((s) => {
      if (active) setStatus(s);
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (!next) {
        await disableRestNotifications();
        toast.info("Notificações de descanso desativadas neste dispositivo.");
      } else {
        const r = await enableRestNotifications();
        if (!r.ok) {
          if (r.reason === "ios-install") toast.warning("Instale o app primeiro", "No iPhone/iPad, use Compartilhar → Adicionar à Tela de Início e abra o IronLog por lá.");
          else if (r.reason === "denied") toast.error("Permissão negada", "Reative as notificações do site nas configurações do navegador.");
          else if (r.reason === "unsupported") toast.error("Este navegador não suporta notificações.");
          else toast.error("Não foi possível registrar o service worker.");
        } else if (r.warning) {
          toast.warning("Ativado só com o app aberto", r.warning);
        } else {
          toast.success("Notificações ativadas", "Use o botão de teste e bloqueie a tela para conferir.");
        }
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const r = await sendTestNotification(5);
      if (r.ok) toast.info("Teste agendado", "Bloqueie a tela ou saia do app: a notificação chega em 5 segundos.");
      else toast.error("Teste não enviado", r.message);
    } finally {
      setTesting(false);
    }
  }

  const hasAccount = mode === "supabase" && user !== null;
  const lockScreenReady = Boolean(status?.enabled && status.subscribed && status.pushConfigured && hasAccount);

  return (
    <Card>
      <CardHeader
        title="Notificações do descanso"
        subtitle="Aviso quando o cronômetro zerar, mesmo fora do app"
        icon={status?.enabled ? <Bell className="h-4 w-4 text-accent" /> : <BellOff className="h-4 w-4 text-muted" />}
      />
      {status === null ? (
        <p className="text-sm text-muted">Verificando suporte do navegador…</p>
      ) : !status.supported ? (
        <p className="text-sm text-muted">
          Este navegador não oferece notificações. O cronômetro continua avisando com som e vibração enquanto o app estiver aberto.
        </p>
      ) : (
        <div className="space-y-4">
          <Switch
            checked={status.enabled}
            onChange={(v) => void toggle(v)}
            label={busy ? "Aguarde…" : "Avisar quando o descanso terminar"}
            description="Notificação “Descanso finalizado — bora para a próxima série!” neste dispositivo."
          />

          {status.ios && !status.standalone ? (
            <p className="flex items-start gap-2 rounded-lg bg-warn/10 p-3 text-xs text-warn">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              No iPhone/iPad o Safari só permite notificações para apps instalados: toque em Compartilhar → “Adicionar à Tela de Início” e abra o
              IronLog pelo ícone criado. A vibração não é suportada nesse sistema; o som segue a configuração do aparelho.
            </p>
          ) : null}

          {status.permission === "denied" ? (
            <p className="text-xs text-danger">A permissão foi negada no navegador. Reative-a nas configurações do site para usar este recurso.</p>
          ) : null}

          <ul className="space-y-1.5 text-xs text-muted">
            <li className="flex gap-2">
              <Dot ok />
              <span>Som e vibração ao zerar: sempre, com o app aberto (vibração indisponível no iPhone).</span>
            </li>
            <li className="flex gap-2">
              <Dot ok={status.enabled} />
              <span>App em segundo plano (outra aba ou app): notificação local enquanto o navegador mantiver a página ativa.</span>
            </li>
            <li className="flex gap-2">
              <Dot ok={lockScreenReady} />
              <span>
                Tela bloqueada: push agendado pelo servidor.{" "}
                {!status.pushConfigured
                  ? "Indisponível neste deploy (faltam as chaves VAPID)."
                  : !status.pushSupported
                    ? "Este navegador não suporta Web Push."
                    : !hasAccount
                      ? "Exige estar conectado à sua conta."
                      : !status.enabled
                        ? "Ative o aviso acima."
                        : !status.subscribed
                          ? "A inscrição de push falhou; desative e ative novamente."
                          : "Pronto."}
              </span>
            </li>
          </ul>

          {lockScreenReady ? (
            <Button variant="outline" size="sm" onClick={() => void test()} loading={testing}>
              <Send className="h-4 w-4" /> Enviar notificação de teste (5 s)
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function Dot({ ok }: { ok: boolean }) {
  return <span aria-hidden className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${ok ? "bg-accent" : "bg-line"}`} />;
}
