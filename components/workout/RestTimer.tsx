"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, SkipForward, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface RestTimerProps {
  /** Duração padrão (segundos) usada ao iniciar. */
  duration: number;
  onDurationChange: (seconds: number) => void;
  /** Sempre que muda (e > 0), o timer reinicia e começa a contar com `duration`. */
  startToken: number;
  sound: boolean;
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    /* áudio indisponível */
  }
  if ("vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
}

export function RestTimer({ duration, onDurationChange, startToken, sound }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const lastToken = useRef(startToken);

  const start = useCallback(
    (secs: number) => {
      setRemaining(secs);
      endAtRef.current = Date.now() + secs * 1000;
      setRunning(true);
      setStarted(true);
    },
    [],
  );

  // Disparo externo (série concluída)
  useEffect(() => {
    if (startToken !== lastToken.current && startToken > 0) {
      lastToken.current = startToken;
      start(duration);
    }
  }, [startToken, duration, start]);

  // Contagem baseada em timestamp: resiste a abas em segundo plano.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const end = endAtRef.current;
      if (end === null) return;
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        endAtRef.current = null;
        if (sound) beep();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, sound]);

  useEffect(() => {
    if (!running && !started) setRemaining(duration);
  }, [duration, running, started]);

  function pause() {
    setRunning(false);
    endAtRef.current = null;
  }
  function resume() {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }
  function skip() {
    setRunning(false);
    setStarted(false);
    endAtRef.current = null;
    setRemaining(duration);
  }
  function adjust(delta: number) {
    const next = Math.max(5, remaining + delta);
    setRemaining(next);
    if (running) endAtRef.current = Date.now() + next * 1000;
    if (!started) onDurationChange(Math.max(5, duration + delta));
  }

  const finished = started && remaining === 0 && !running;
  const pct = duration > 0 ? (remaining / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "card flex items-center gap-3 p-3 transition-colors",
        running && "border-accent/50 shadow-glow",
        finished && "border-warn/60",
      )}
      role="timer"
      aria-live={finished ? "assertive" : "off"}
      aria-label="Cronômetro de descanso"
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="20" stroke="rgb(var(--surface-2))" strokeWidth="4" fill="none" />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={finished ? "rgb(var(--warn))" : "rgb(var(--accent))"}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 20}
            strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <Timer className={cn("h-5 w-5", finished ? "text-warn" : "text-accent")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{finished ? "Descanso concluído — próxima série" : running ? "Descansando" : started ? "Pausado" : "Descanso"}</p>
        <p className={cn("text-2xl font-bold tabular leading-none", finished && "text-warn")}>{formatDuration(remaining)}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Menos 15 segundos" onClick={() => adjust(-15)}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Mais 15 segundos" onClick={() => adjust(15)}>
          <Plus className="h-4 w-4" />
        </Button>
        {running ? (
          <Button variant="secondary" size="icon" aria-label="Pausar descanso" onClick={pause}>
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="primary" size="icon" aria-label={started ? "Retomar descanso" : "Iniciar descanso"} onClick={() => (started && remaining > 0 ? resume() : start(duration))}>
            <Play className="h-4 w-4 fill-current" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Pular descanso" onClick={skip} disabled={!started}>
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
