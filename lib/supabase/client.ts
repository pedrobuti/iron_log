import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase (browser). Só utiliza a chave pública "anon".
 * A chave service_role NUNCA deve ser exposta no frontend.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Detecta se a chave informada é secreta (service_role / sb_secret_), que jamais pode ir ao navegador. */
function isSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length === 3 && parts[1]) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string };
      return payload.role === "service_role";
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Retorna uma mensagem de erro de configuração quando as variáveis existem mas estão erradas
 * (ex.: chave secreta no frontend). null quando tudo está certo ou nada foi configurado.
 */
export function supabaseConfigWarning(): string | null {
  if (!url && !anonKey) return null;
  if (!url || !/^https?:\/\//.test(url)) return "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida; o app está em modo local.";
  if (!anonKey) return "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente; o app está em modo local.";
  if (isSecretKey(anonKey)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY contém a chave SECRETA do Supabase (service_role/sb_secret). Troque pela chave publishable/anon e faça redeploy. Por segurança, o app está em modo local.";
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && /^https?:\/\//.test(url)) && supabaseConfigWarning() === null;
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
