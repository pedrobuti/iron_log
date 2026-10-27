import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para rotas de API (servidor) agindo EM NOME DO USUÁRIO.
 * Usa a mesma chave pública anon + o JWT enviado pelo navegador, então as políticas
 * RLS continuam valendo. Nenhuma chave secreta (service_role) é necessária nem lida.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Extrai o JWT do cabeçalho Authorization ("Bearer <token>"). */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1]?.trim() || null;
}
