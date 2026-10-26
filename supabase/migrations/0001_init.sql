-- IronLog — esquema inicial
-- Cada usuário possui documentos JSON por chave (settings, exercises, routine,
-- sessions, activeSession, restLogs). A estrutura espelha a camada de persistência
-- local, permitindo migração sem transformação de dados.

create table if not exists public.user_documents (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null check (key in ('settings', 'exercises', 'routine', 'sessions', 'activeSession', 'restLogs')),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

comment on table public.user_documents is 'Documentos JSON do IronLog por usuário e chave.';

create index if not exists user_documents_user_idx on public.user_documents (user_id);

-- Row Level Security: cada usuário acessa somente as próprias linhas.
alter table public.user_documents enable row level security;

drop policy if exists "user_documents_select_own" on public.user_documents;
create policy "user_documents_select_own"
  on public.user_documents for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_documents_insert_own" on public.user_documents;
create policy "user_documents_insert_own"
  on public.user_documents for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_documents_update_own" on public.user_documents;
create policy "user_documents_update_own"
  on public.user_documents for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_documents_delete_own" on public.user_documents;
create policy "user_documents_delete_own"
  on public.user_documents for delete
  to authenticated
  using (auth.uid() = user_id);

-- Mantém updated_at coerente em atualizações.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_documents_set_updated_at on public.user_documents;
create trigger user_documents_set_updated_at
  before update on public.user_documents
  for each row execute function public.set_updated_at();
