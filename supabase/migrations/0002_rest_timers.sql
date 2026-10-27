-- IronLog — cronômetro de descanso agendado (push)
-- Uma linha por usuário com o token do último descanso agendado. O servidor, ao
-- acordar no fim do descanso, só envia a notificação se o token ainda for o mesmo:
-- pular, pausar, ajustar ou terminar o descanso com o app aberto apaga/substitui a linha.

create table if not exists public.rest_timers (
  user_id    uuid        not null primary key references auth.users (id) on delete cascade,
  token      text        not null,
  fire_at    timestamptz not null,
  updated_at timestamptz not null default now()
);

comment on table public.rest_timers is 'Descanso agendado por usuário (token de cancelamento do push).';

alter table public.rest_timers enable row level security;

drop policy if exists "rest_timers_select_own" on public.rest_timers;
create policy "rest_timers_select_own"
  on public.rest_timers for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "rest_timers_insert_own" on public.rest_timers;
create policy "rest_timers_insert_own"
  on public.rest_timers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "rest_timers_update_own" on public.rest_timers;
create policy "rest_timers_update_own"
  on public.rest_timers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rest_timers_delete_own" on public.rest_timers;
create policy "rest_timers_delete_own"
  on public.rest_timers for delete
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists rest_timers_set_updated_at on public.rest_timers;
create trigger rest_timers_set_updated_at
  before update on public.rest_timers
  for each row execute function public.set_updated_at();
