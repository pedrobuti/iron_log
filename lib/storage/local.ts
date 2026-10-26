import type { AppData, StorageKey } from "@/types";
import { STORAGE_KEYS, StorageError, type StorageAdapter } from "./types";

export const LOCAL_PREFIX = "ironlog:v1:";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Adaptador para localStorage (modo local, sem sincronização). */
export class LocalStorageAdapter implements StorageAdapter {
  readonly mode = "local" as const;

  constructor(private readonly storage: StorageLike = resolveStorage()) {}

  private k(key: StorageKey): string {
    return `${LOCAL_PREFIX}${key}`;
  }

  async getItem(key: StorageKey): Promise<unknown> {
    try {
      const raw = this.storage.getItem(this.k(key));
      if (raw === null) return undefined;
      return JSON.parse(raw) as unknown;
    } catch (cause) {
      throw new StorageError(`Falha ao ler "${key}" do armazenamento local.`, key, cause);
    }
  }

  async setItem<K extends StorageKey>(key: K, value: AppData[K]): Promise<void> {
    try {
      this.storage.setItem(this.k(key), JSON.stringify(value));
    } catch (cause) {
      const quota = cause instanceof Error && /quota/i.test(cause.name + cause.message);
      throw new StorageError(
        quota
          ? `Armazenamento local cheio ao salvar "${key}". Exporte um backup e limpe dados antigos.`
          : `Falha ao salvar "${key}" no armazenamento local.`,
        key,
        cause,
      );
    }
  }

  async removeItem(key: StorageKey): Promise<void> {
    this.storage.removeItem(this.k(key));
  }

  async clear(): Promise<void> {
    for (const key of STORAGE_KEYS) this.storage.removeItem(this.k(key));
  }
}

function resolveStorage(): StorageLike {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  // Fallback em memória (SSR ou ambientes sem localStorage).
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}

export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const probe = `${LOCAL_PREFIX}__probe__`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
