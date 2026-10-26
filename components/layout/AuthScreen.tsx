"use client";

import { useState } from "react";
import { Dumbbell, HardDrive } from "lucide-react";
import { useApp } from "@/lib/store/AppProvider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";

export function AuthScreen() {
  const { actions } = useApp();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Informe um e-mail válido.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    setLoading(true);
    try {
      if (mode === "entrar") {
        const r = await actions.signIn(email, password);
        if (r.error) setError(traduz(r.error));
      } else {
        const r = await actions.signUp(email, password);
        if (r.error) setError(traduz(r.error));
        else if (r.needsConfirmation) setNotice("Conta criada. Confirme o e-mail enviado para continuar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6 animate-fade-up">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-glow">
            <Dumbbell className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            Iron<span className="text-accent">Log</span>
          </span>
        </div>
        <Segmented
          className="mb-5 w-full"
          value={mode}
          onChange={setMode}
          ariaLabel="Entrar ou criar conta"
          options={[
            { value: "entrar", label: "Entrar" },
            { value: "criar", label: "Criar conta" },
          ]}
        />
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="E-mail" htmlFor="auth-email">
            <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha" htmlFor="auth-password" hint={mode === "criar" ? "Mínimo de 6 caracteres." : undefined}>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          {notice ? <p className="text-sm text-accent">{notice}</p> : null}
          <Button type="submit" className="w-full" loading={loading}>
            {mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <div className="mt-6 border-t border-line pt-4">
          <p className="mb-2 text-xs text-muted">Prefere não usar conta? Seus dados ficam só neste navegador, sem sincronização.</p>
          <Button variant="outline" className="w-full" onClick={actions.useLocalModeInstead}>
            <HardDrive className="h-4 w-4" /> Usar modo local neste dispositivo
          </Button>
        </div>
      </div>
    </div>
  );
}

function traduz(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered")) return "Este e-mail já está cadastrado.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um momento.";
  return msg;
}
