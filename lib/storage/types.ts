import type { AppData, StorageKey } from "@/types";

export type StorageMode = "local" | "supabase";

/**
 * Camada de persistência isolada. Cada chave do AppData é salva como um documento
 * JSON independente, o que mantém a mesma forma tanto em localStorage quanto na
 * tabela `user_documents` do Supabase.
 */
export interface StorageAdapter {
  readonly mode: StorageMode;
  /** Retorna o JSON bruto (não validado) ou undefined quando não existe. */
  getItem(key: StorageKey): Promise<unknown>;
  setItem<K extends StorageKey>(key: K, value: AppData[K]): Promise<void>;
  removeItem(key: StorageKey): Promise<void>;
  clear(): Promise<void>;
}

export const STORAGE_KEYS: readonly StorageKey[] = [
  "settings",
  "exercises",
  "routine",
  "sessions",
  "activeSession",
  "restLogs",
] as const;

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly key: StorageKey | null,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
