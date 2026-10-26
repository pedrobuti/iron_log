import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData, StorageKey } from "@/types";
import { StorageError, type StorageAdapter } from "./types";

/**
 * Adaptador Supabase. Cada chave vira uma linha em `user_documents`
 * (user_id, key, data jsonb). As políticas RLS garantem que o usuário só
 * acessa as próprias linhas (ver supabase/migrations).
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  readonly mode = "supabase" as const;

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async getItem(key: StorageKey): Promise<unknown> {
    const { data, error } = await this.client
      .from("user_documents")
      .select("data")
      .eq("user_id", this.userId)
      .eq("key", key)
      .maybeSingle();
    if (error) throw new StorageError(`Falha ao ler "${key}" do Supabase: ${error.message}`, key, error);
    return data ? (data.data as unknown) : undefined;
  }

  async setItem<K extends StorageKey>(key: K, value: AppData[K]): Promise<void> {
    // A coluna `data` é NOT NULL: um valor nulo (ex.: nenhuma sessão ativa) remove a linha.
    if (value === null) {
      await this.removeItem(key);
      return;
    }
    const { error } = await this.client.from("user_documents").upsert(
      {
        user_id: this.userId,
        key,
        data: value as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );
    if (error) throw new StorageError(`Falha ao salvar "${key}" no Supabase: ${error.message}`, key, error);
  }

  async removeItem(key: StorageKey): Promise<void> {
    const { error } = await this.client.from("user_documents").delete().eq("user_id", this.userId).eq("key", key);
    if (error) throw new StorageError(`Falha ao remover "${key}" no Supabase: ${error.message}`, key, error);
  }

  async clear(): Promise<void> {
    const { error } = await this.client.from("user_documents").delete().eq("user_id", this.userId);
    if (error) throw new StorageError(`Falha ao limpar dados no Supabase: ${error.message}`, null, error);
  }
}
