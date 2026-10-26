"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cloud, CloudOff, Download, LogOut, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { Weekday } from "@/types";
import { useApp } from "@/lib/store/AppProvider";
import { settingsSchema, type SettingsFormValues } from "@/lib/validation/schemas";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/labels";
import { WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/dates";
import { backupFileName } from "@/lib/backup";
import { downloadTextFile, readFileAsText } from "@/lib/download";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const { data, actions, mode, user, supabaseConfigured } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: data.settings,
  });

  useEffect(() => {
    reset(data.settings);
  }, [data.settings, reset]);

  const unit = useWatch({ control, name: "unit" });

  function save(values: SettingsFormValues) {
    actions.updateSettings(values);
    toast.success("Configurações salvas.");
  }

  function exportBackup() {
    const backup = actions.exportBackup();
    downloadTextFile(backupFileName(), JSON.stringify(backup, null, 2), "application/json");
    toast.success("Backup exportado.");
  }

  async function importBackup(file: File) {
    setImporting(true);
    try {
      const raw = await readFileAsText(file);
      const result = await actions.importBackup(raw);
      if (result.ok) toast.success("Backup importado", `${result.data.sessions.length} sessões restauradas.`);
      else toast.error("Falha ao importar", result.error);
    } catch (err) {
      toast.error("Falha ao ler o arquivo", err instanceof Error ? err.message : undefined);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader title="Perfil e configurações" subtitle="Preferências de treino, unidades, tema e dados" />

      <form onSubmit={handleSubmit(save)} className="space-y-5" noValidate>
        <Card>
          <CardHeader title="Perfil" subtitle="Só o necessário para personalizar o app" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome de exibição" htmlFor="s-name" error={errors.displayName?.message} hint="Opcional. Aparece na saudação.">
              <Input id="s-name" {...register("displayName")} placeholder="Como quer ser chamado?" autoComplete="nickname" />
            </Field>
            <Field label="Objetivo principal" htmlFor="s-goal">
              <Select id="s-goal" {...register("goal")}>
                {Object.entries(GOAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nível de experiência" htmlFor="s-level">
              <Select id="s-level" {...register("experienceLevel")}>
                {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Duração prevista (min)" htmlFor="s-duration" error={errors.plannedDurationMin?.message}>
              <Input id="s-duration" type="number" inputMode="numeric" min={10} max={300} {...register("plannedDurationMin", { valueAsNumber: true })} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium">Dias de treino</p>
              <Controller
                control={control}
                name="trainingDays"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias de treino">
                    {WEEKDAYS.map((wd) => {
                      const on = field.value.includes(wd);
                      return (
                        <button
                          key={wd}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? field.value.filter((d) => d !== wd) : [...field.value, wd].sort())}
                          className={cn("h-10 w-12 rounded-xl border text-sm font-medium transition-colors", on ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface-2 text-muted hover:text-fg")}
                        >
                          {WEEKDAY_SHORT[wd]}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              <p className="mt-1 text-xs text-muted">A frequência semanal usa os dias de treino da rotina; este campo é informativo e serve de fallback.</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Treino" subtitle="Padrões usados nas sugestões e no cronômetro" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="RIR padrão (repetições em reserva)" htmlFor="s-rir" error={errors.defaultRir?.message} hint="Usado para avaliar se a carga pode subir.">
              <Input id="s-rir" type="number" inputMode="numeric" min={0} max={5} {...register("defaultRir", { valueAsNumber: true })} />
            </Field>
            <Field label="Descanso padrão (segundos)" htmlFor="s-rest" error={errors.defaultRestSeconds?.message}>
              <Input id="s-rest" type="number" inputMode="numeric" min={15} max={600} step={5} {...register("defaultRestSeconds", { valueAsNumber: true })} />
            </Field>
            <Field label={`Incremento superiores (${unit === "kg" ? "kg" : "kg, exibido em lb"})`} htmlFor="s-inc-up" error={errors.incrementUpperKg?.message} hint="Sugestão de aumento para peito, costas, ombros e braços.">
              <Input id="s-inc-up" type="number" inputMode="decimal" step={0.25} min={0.25} {...register("incrementUpperKg", { valueAsNumber: true })} />
            </Field>
            <Field label="Incremento inferiores (kg)" htmlFor="s-inc-low" error={errors.incrementLowerKg?.message} hint="Sugestão de aumento para pernas e glúteos.">
              <Input id="s-inc-low" type="number" inputMode="decimal" step={0.5} min={0.25} {...register("incrementLowerKg", { valueAsNumber: true })} />
            </Field>
            <div className="sm:col-span-2">
              <Controller control={control} name="restTimerSound" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Aviso sonoro ao fim do descanso" description="Toca um bipe curto e vibra (quando suportado)." />} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Exibição" subtitle="Unidade, tema e início da semana" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-sm font-medium">Unidade de carga</p>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Segmented className="w-full" value={field.value} onChange={field.onChange} ariaLabel="Unidade" options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]} />
                )}
              />
              <p className="mt-1 text-xs text-muted">Cargas são armazenadas em kg e convertidas na exibição.</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Tema</p>
              <Controller
                control={control}
                name="theme"
                render={({ field }) => (
                  <Segmented
                    className="w-full"
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      actions.updateSettings({ theme: v });
                    }}
                    ariaLabel="Tema"
                    options={[{ value: "dark", label: "Escuro" }, { value: "light", label: "Claro" }]}
                  />
                )}
              />
            </div>
            <Field label="Primeiro dia da semana" htmlFor="s-week">
              <Select id="s-week" {...register("weekStartsOn", { setValueAs: (v) => Number(v) as Weekday })}>
                {WEEKDAYS.map((wd) => (
                  <option key={wd} value={wd}>
                    {WEEKDAY_LABELS[wd]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <div className="sticky bottom-24 z-10 flex justify-end lg:bottom-4">
          <Button type="submit" disabled={!isDirty} className={cn(isDirty && "shadow-glow")}>
            <Save className="h-4 w-4" /> Salvar configurações
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader
          title="Dados e armazenamento"
          subtitle={mode === "supabase" ? `Sincronizado com Supabase (${user?.email ?? ""})` : "Modo local: os dados ficam somente neste navegador e não são sincronizados."}
          icon={mode === "supabase" ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportBackup}>
            <Download className="h-4 w-4" /> Exportar backup JSON
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={importing}>
            <Upload className="h-4 w-4" /> Importar backup JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Selecionar arquivo de backup"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importBackup(f);
            }}
          />
          <Button variant="outline" onClick={() => setRestoreOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Restaurar rotina inicial
          </Button>
          {mode === "supabase" ? (
            <Button variant="outline" onClick={() => void actions.signOut()}>
              <LogOut className="h-4 w-4" /> Sair da conta
            </Button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          {supabaseConfigured && mode === "local"
            ? "O Supabase está configurado, mas você optou pelo modo local neste dispositivo. Recarregue a página após limpar a preferência para entrar com uma conta."
            : !supabaseConfigured
              ? "Para sincronizar entre dispositivos, configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ver README)."
              : "Importar um backup substitui todos os dados atuais."}
        </p>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title="Zona de risco" subtitle="Ações irreversíveis" icon={<Trash2 className="h-4 w-4 text-danger" />} />
        <p className="mb-3 text-sm text-muted">Exclui sessões, rotina, exercícios personalizados e registros de descanso. Exporte um backup antes.</p>
        <Button variant="danger" onClick={() => setResetOpen(true)}>
          <Trash2 className="h-4 w-4" /> Excluir todos os dados
        </Button>
      </Card>

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        title="Restaurar rotina inicial?"
        description="A rotina semanal volta ao padrão de 5 dias. O histórico não é afetado."
        confirmLabel="Restaurar"
        destructive
        onConfirm={() => {
          actions.restoreDefaultRoutine();
          setRestoreOpen(false);
          toast.success("Rotina inicial restaurada.");
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetText("");
        }}
        title="Excluir todos os dados?"
        description="Esta ação apaga permanentemente todas as sessões, a rotina personalizada, exercícios criados e registros de recuperação."
        confirmLabel="Excluir tudo"
        destructive
        loading={resetting}
        requireText="EXCLUIR"
        typedText={resetText}
        onTypedTextChange={setResetText}
        onConfirm={async () => {
          setResetting(true);
          try {
            await actions.resetAllData();
            toast.success("Todos os dados foram excluídos.");
            setResetOpen(false);
            setResetText("");
          } catch (err) {
            toast.error("Falha ao excluir", err instanceof Error ? err.message : undefined);
          } finally {
            setResetting(false);
          }
        }}
      />
    </div>
  );
}
