"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppData,
  Exercise,
  Prescription,
  RestLog,
  RoutineDay,
  Settings,
  StorageKey,
  Weekday,
  WorkoutSession,
} from "@/types";
import { DEFAULT_EXERCISES } from "@/data/exercises";
import { createDefaultRoutine } from "@/data/routine";
import { DEFAULT_SETTINGS } from "@/data/defaults";
import { nowIso } from "@/lib/dates";
import { createId } from "@/lib/id";
import { createFreeSession, createSessionFromDay, finalizeSession } from "@/lib/session";
import {
  LocalStorageAdapter,
  STORAGE_KEYS,
  SupabaseStorageAdapter,
  createDefaultAppData,
  loadAppData,
  saveAllAppData,
  type StorageAdapter,
  type StorageMode,
} from "@/lib/storage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createBackup, parseBackup, type ImportResult } from "@/lib/backup";
import type { BackupFile } from "@/lib/validation/schemas";

export type AppStatus = "loading" | "auth" | "ready" | "error";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AppActions {
  updateSettings: (patch: Partial<Settings>) => void;

  addExercise: (values: Omit<Exercise, "id" | "isCustom" | "createdAt" | "updatedAt">) => Exercise;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, "id" | "createdAt">>) => void;
  deleteExercise: (id: string) => { ok: boolean; reason?: string };

  updateDay: (dayId: string, patch: Partial<Pick<RoutineDay, "name" | "focus" | "type">>) => void;
  swapDays: (weekdayA: Weekday, weekdayB: Weekday) => void;
  addPrescription: (dayId: string, p: Omit<Prescription, "id">) => void;
  updatePrescription: (dayId: string, prescriptionId: string, patch: Partial<Omit<Prescription, "id">>) => void;
  removePrescription: (dayId: string, prescriptionId: string) => void;
  movePrescription: (dayId: string, prescriptionId: string, direction: -1 | 1) => void;
  restoreDefaultRoutine: () => void;

  startSession: (dayId: string) => WorkoutSession | null;
  startFreeSession: (name: string) => WorkoutSession;
  updateActiveSession: (updater: (s: WorkoutSession) => WorkoutSession) => void;
  discardActiveSession: () => void;
  finishActiveSession: (feeling?: number) => WorkoutSession | null;
  updateSession: (id: string, patch: Partial<Pick<WorkoutSession, "notes" | "feeling">>) => void;
  updateSessionExerciseNotes: (sessionId: string, sessionExerciseId: string, notes: string) => void;
  deleteSession: (id: string) => void;

  upsertRestLog: (date: string, values: Pick<RestLog, "walkMinutes" | "mobilityMinutes" | "notes">) => void;
  deleteRestLog: (id: string) => void;

  exportBackup: () => BackupFile;
  importBackup: (raw: string) => Promise<ImportResult>;
  resetAllData: () => Promise<void>;
  retrySave: () => void;
  dismissIssues: () => void;

  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  useLocalModeInstead: () => void;
}

export interface AppContextValue {
  status: AppStatus;
  data: AppData;
  mode: StorageMode;
  supabaseConfigured: boolean;
  user: AuthUser | null;
  issues: string[];
  saveError: string | null;
  lastSavedAt: string | null;
  fatalError: string | null;
  isFirstRun: boolean;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

const PREFER_LOCAL_KEY = "ironlog:prefer-local";

function touchRoutine(routine: AppData["routine"]): AppData["routine"] {
  return { ...routine, updatedAt: nowIso() };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [data, setData] = useState<AppData>(() => createDefaultAppData());
  const [issues, setIssues] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<StorageMode>("local");
  const [preferLocal, setPreferLocal] = useState(false);

  const adapterRef = useRef<StorageAdapter | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const lastSavedRef = useRef<AppData | null>(null);
  const dataRef = useRef<AppData>(data);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseConfigured = isSupabaseConfigured();

  dataRef.current = data;

  // ─── Inicialização ───
  useEffect(() => {
    let cancelled = false;
    const prefer = typeof window !== "undefined" && window.localStorage.getItem(PREFER_LOCAL_KEY) === "1";
    setPreferLocal(prefer);

    async function boot(adapter: StorageAdapter) {
      try {
        const result = await loadAppData(adapter);
        if (cancelled) return;
        adapterRef.current = adapter;
        lastSavedRef.current = result.data;
        setData(result.data);
        setIssues(result.issues);
        setIsFirstRun(result.isFirstRun);
        setMode(adapter.mode);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setFatalError(err instanceof Error ? err.message : "Falha ao carregar os dados.");
        setStatus("error");
      }
    }

    if (supabaseConfigured && !prefer) {
      const client = getSupabaseClient();
      supabaseRef.current = client;
      if (!client) {
        void boot(new LocalStorageAdapter());
        return;
      }
      client.auth.getSession().then(({ data: s }) => {
        if (cancelled) return;
        const u = s.session?.user;
        if (u) {
          setUser({ id: u.id, email: u.email ?? null });
          void boot(new SupabaseStorageAdapter(client, u.id));
        } else {
          setStatus("auth");
        }
      });
      const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
        const u = session?.user;
        if (u && adapterRef.current?.mode !== "supabase") {
          setUser({ id: u.id, email: u.email ?? null });
          setStatus("loading");
          void boot(new SupabaseStorageAdapter(client, u.id));
        } else if (!u && adapterRef.current?.mode === "supabase") {
          adapterRef.current = null;
          setUser(null);
          setData(createDefaultAppData());
          setStatus("auth");
        }
      });
      return () => {
        cancelled = true;
        sub.subscription.unsubscribe();
      };
    }

    void boot(new LocalStorageAdapter());
    return () => {
      cancelled = true;
    };
  }, [supabaseConfigured, preferLocal]);

  // ─── Tema ───
  useEffect(() => {
    if (typeof document === "undefined") return;
    const dark = data.settings.theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [data.settings.theme]);

  // ─── Persistência (salva apenas chaves alteradas, com debounce) ───
  const flush = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    const current = dataRef.current;
    const prev = lastSavedRef.current;
    const changed: StorageKey[] = STORAGE_KEYS.filter((k) => !prev || prev[k] !== current[k]);
    if (changed.length === 0) return;
    try {
      for (const key of changed) {
        await adapter.setItem(key, current[key]);
      }
      lastSavedRef.current = current;
      setSaveError(null);
      setLastSavedAt(nowIso());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar os dados.");
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    // Sessão ativa salva mais rápido: protege contra fechamento acidental.
    const delay = lastSavedRef.current?.activeSession !== data.activeSession ? 120 : 400;
    flushTimer.current = setTimeout(() => void flush(), delay);
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [data, status, flush]);

  useEffect(() => {
    const handler = () => void flush();
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
      document.removeEventListener("visibilitychange", handler);
    };
  }, [flush]);

  // ─── Helpers de atualização ───
  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => fn(d));
  }, []);

  const updateRoutine = useCallback(
    (fn: (r: AppData["routine"]) => AppData["routine"]) => update((d) => ({ ...d, routine: touchRoutine(fn(d.routine)) })),
    [update],
  );

  const updateDayIn = useCallback(
    (dayId: string, fn: (day: RoutineDay) => RoutineDay) =>
      updateRoutine((r) => ({ ...r, days: r.days.map((day) => (day.id === dayId ? fn(day) : day)) })),
    [updateRoutine],
  );

  const actions = useMemo<AppActions>(
    () => ({
      updateSettings: (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      addExercise: (values) => {
        const now = nowIso();
        const exercise: Exercise = { ...values, id: createId(), isCustom: true, createdAt: now, updatedAt: now };
        update((d) => ({ ...d, exercises: [...d.exercises, exercise] }));
        return exercise;
      },
      updateExercise: (id, patch) =>
        update((d) => ({
          ...d,
          exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch, id, updatedAt: nowIso() } : e)),
        })),
      deleteExercise: (id) => {
        const d = dataRef.current;
        const ex = d.exercises.find((e) => e.id === id);
        if (!ex) return { ok: false, reason: "Exercício não encontrado." };
        if (!ex.isCustom) return { ok: false, reason: "Exercícios da biblioteca padrão não podem ser excluídos." };
        const inRoutine = d.routine.days.some((day) => day.prescriptions.some((p) => p.exerciseId === id));
        if (inRoutine) return { ok: false, reason: "Remova o exercício da rotina semanal antes de excluí-lo." };
        update((cur) => ({ ...cur, exercises: cur.exercises.filter((e) => e.id !== id) }));
        return { ok: true };
      },

      updateDay: (dayId, patch) =>
        updateDayIn(dayId, (day) => {
          const next = { ...day, ...patch };
          if (next.type === "descanso") next.prescriptions = [];
          return next;
        }),
      swapDays: (a, b) =>
        updateRoutine((r) => {
          const da = r.days.find((d) => d.weekday === a);
          const db = r.days.find((d) => d.weekday === b);
          if (!da || !db) return r;
          return {
            ...r,
            days: r.days
              .map((d) => {
                if (d.id === da.id) return { ...db, id: da.id, weekday: a };
                if (d.id === db.id) return { ...da, id: db.id, weekday: b };
                return d;
              })
              .sort((x, y) => x.weekday - y.weekday),
          };
        }),
      addPrescription: (dayId, p) =>
        updateDayIn(dayId, (day) => ({
          ...day,
          type: "treino",
          prescriptions: [...day.prescriptions, { ...p, id: createId() }],
        })),
      updatePrescription: (dayId, prescriptionId, patch) =>
        updateDayIn(dayId, (day) => ({
          ...day,
          prescriptions: day.prescriptions.map((p) => (p.id === prescriptionId ? { ...p, ...patch, id: p.id } : p)),
        })),
      removePrescription: (dayId, prescriptionId) =>
        updateDayIn(dayId, (day) => ({ ...day, prescriptions: day.prescriptions.filter((p) => p.id !== prescriptionId) })),
      movePrescription: (dayId, prescriptionId, direction) =>
        updateDayIn(dayId, (day) => {
          const idx = day.prescriptions.findIndex((p) => p.id === prescriptionId);
          const target = idx + direction;
          if (idx < 0 || target < 0 || target >= day.prescriptions.length) return day;
          const list = [...day.prescriptions];
          const [item] = list.splice(idx, 1);
          if (item) list.splice(target, 0, item);
          return { ...day, prescriptions: list };
        }),
      restoreDefaultRoutine: () => update((d) => ({ ...d, routine: createDefaultRoutine() })),

      startSession: (dayId) => {
        const d = dataRef.current;
        if (d.activeSession) return d.activeSession;
        const day = d.routine.days.find((x) => x.id === dayId);
        if (!day || day.type !== "treino") return null;
        const session = createSessionFromDay(day, d.exercises);
        update((cur) => ({ ...cur, activeSession: session }));
        return session;
      },
      startFreeSession: (name) => {
        const existing = dataRef.current.activeSession;
        if (existing) return existing;
        const session = createFreeSession(name);
        update((cur) => ({ ...cur, activeSession: session }));
        return session;
      },
      updateActiveSession: (updater) =>
        update((d) => (d.activeSession ? { ...d, activeSession: updater(d.activeSession) } : d)),
      discardActiveSession: () => update((d) => ({ ...d, activeSession: null })),
      finishActiveSession: (feeling) => {
        const d = dataRef.current;
        if (!d.activeSession) return null;
        const finished = finalizeSession(d.activeSession, feeling);
        update((cur) => ({ ...cur, activeSession: null, sessions: [...cur.sessions, finished] }));
        return finished;
      },
      updateSession: (id, patch) =>
        update((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
      updateSessionExerciseNotes: (sessionId, sessionExerciseId, notes) =>
        update((d) => ({
          ...d,
          sessions: d.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, exercises: s.exercises.map((e) => (e.id === sessionExerciseId ? { ...e, notes } : e)) }
              : s,
          ),
        })),
      deleteSession: (id) => update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),

      upsertRestLog: (date, values) =>
        update((d) => {
          const existing = d.restLogs.find((r) => r.date === date);
          if (existing) {
            return { ...d, restLogs: d.restLogs.map((r) => (r.id === existing.id ? { ...r, ...values } : r)) };
          }
          const log: RestLog = { id: createId(), date, createdAt: nowIso(), ...values };
          return { ...d, restLogs: [...d.restLogs, log] };
        }),
      deleteRestLog: (id) => update((d) => ({ ...d, restLogs: d.restLogs.filter((r) => r.id !== id) })),

      exportBackup: () => createBackup(dataRef.current),
      importBackup: async (raw) => {
        const result = parseBackup(raw);
        if (!result.ok) return result;
        const adapter = adapterRef.current;
        if (adapter) {
          try {
            await saveAllAppData(adapter, result.data);
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "Falha ao gravar o backup." };
          }
        }
        lastSavedRef.current = result.data;
        setData(result.data);
        return result;
      },
      resetAllData: async () => {
        const adapter = adapterRef.current;
        const fresh = createDefaultAppData();
        // Preserva tema/unidade para não desorientar o usuário.
        fresh.settings = { ...DEFAULT_SETTINGS, theme: dataRef.current.settings.theme, unit: dataRef.current.settings.unit };
        fresh.exercises = DEFAULT_EXERCISES.map((e) => ({ ...e }));
        if (adapter) {
          await adapter.clear();
          await saveAllAppData(adapter, fresh);
        }
        lastSavedRef.current = fresh;
        setData(fresh);
        setIsFirstRun(true);
      },
      retrySave: () => {
        lastSavedRef.current = null;
        void flush();
      },
      dismissIssues: () => setIssues([]),

      signIn: async (email, password) => {
        const client = supabaseRef.current ?? getSupabaseClient();
        if (!client) return { error: "Supabase não configurado." };
        const { error } = await client.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      },
      signUp: async (email, password) => {
        const client = supabaseRef.current ?? getSupabaseClient();
        if (!client) return { error: "Supabase não configurado.", needsConfirmation: false };
        const { data: res, error } = await client.auth.signUp({ email, password });
        if (error) return { error: error.message, needsConfirmation: false };
        return { error: null, needsConfirmation: !res.session };
      },
      signOut: async () => {
        const client = supabaseRef.current ?? getSupabaseClient();
        await flush();
        if (client) await client.auth.signOut();
      },
      useLocalModeInstead: () => {
        window.localStorage.setItem(PREFER_LOCAL_KEY, "1");
        setStatus("loading");
        setPreferLocal(true);
      },
    }),
    [update, updateRoutine, updateDayIn, flush],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      data,
      mode,
      supabaseConfigured,
      user,
      issues,
      saveError,
      lastSavedAt,
      fatalError,
      isFirstRun,
      actions,
    }),
    [status, data, mode, supabaseConfigured, user, issues, saveError, lastSavedAt, fatalError, isFirstRun, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProvider>.");
  return ctx;
}

/** Atalhos derivados usados em várias páginas. */
export function useExercisesById(): Map<string, Exercise> {
  const { data } = useApp();
  return useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);
}
