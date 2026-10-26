import type { AppData, StorageKey } from "@/types";
import type { StorageAdapter } from "./types";

/** Adaptador em memória (testes e SSR). */
export class MemoryStorageAdapter implements StorageAdapter {
  readonly mode = "local" as const;
  private readonly store = new Map<string, string>();

  async getItem(key: StorageKey): Promise<unknown> {
    const raw = this.store.get(key);
    return raw === undefined ? undefined : (JSON.parse(raw) as unknown);
  }

  async setItem<K extends StorageKey>(key: K, value: AppData[K]): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: StorageKey): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
