-- =========================================================
-- Consultório · Salas — schema completo para Supabase
-- Rode este arquivo inteiro em: Supabase > SQL Editor > New query > Run
-- =========================================================

-- ---------- PROFILES (dados de cada pessoa, além do login) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  cpf_cnpj text default '',
  birth_date date,
  phone text default '',
  role text not null default 'tenant' check (role in ('tenant','manager')),
  status text not null default 'pendente' check (status in ('pendente','ativo','desabilitado')),
  created_at timestamptz not null default now()
);

-- ---------- ROOMS (salas) ----------
create table if not exists public.rooms (
  id text primary key,
  name text not null,
  prices jsonb not null default '{"half":0,"shift":0,"daily":0}',
  availability jsonb not null default '{}',
  sort_order int not null default 0
);

-- ---------- SHIFT_HOURS (horário global dos turnos, linha única) ----------
create table if not exists public.shift_hours (
  id int primary key default 1,
  hours jsonb not null,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- ---------- BOOKINGS (reservas) ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  room_id text not null references public.rooms(id),
  room_name text not null,
  date date not null,
  slot_type text not null,
  slot_label text not null,
  recurrence text not null default 'avulsa' check (recurrence in ('avulsa','fixa_mensal')),
  price numeric not null default 0,
  status text not null default 'pendente' check (status in ('pendente','confirmada','recusada','cancelada')),
  payment_status text not null default 'pendente' check (payment_status in ('pendente','pago')),
  paid_at timestamptz,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  group_id uuid,
  recurrence_end_date date
);
create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_room_date_idx on public.bookings(room_id, date);
create index if not exists bookings_group_id_idx on public.bookings(group_id);

-- ---------- BOOKING_AVAILABILITY (view "enxuta" e segura) ----------
-- A tabela `bookings` só é visível para o dono da reserva ou o gestor (ver RLS abaixo).
-- Mas TODO usuário logado precisa saber quais horários já estão ocupados por QUALQUER
-- pessoa, para o calendário não oferecer um horário que já foi pego por outro locatário.
-- Esta view expõe só o essencial (sala, data, turno, status) — nunca nome, preço ou pagamento.
create or replace view public.booking_availability as
  select id, room_id, date, slot_type, status, group_id
  from public.bookings
  where status in ('pendente', 'confirmada');

grant select on public.booking_availability to authenticated;

-- =========================================================
-- Seed inicial: 3 salas + horários padrão de turno
-- (só insere se ainda não existir nada — seguro rodar de novo)
-- =========================================================
insert into public.rooms (id, name, prices, availability, sort_order)
values
  ('sala-1', 'Sala 1', '{"half":90,"shift":160,"daily":260}',
    '{"seg":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "ter":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "qua":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "qui":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "sex":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "sab":{"meio_manha_1":false,"meio_manha_2":false,"turno_manha":false,"meio_tarde_1":false,"meio_tarde_2":false,"turno_tarde":false,"turno_noite":false,"diaria":false},
      "dom":{"meio_manha_1":false,"meio_manha_2":false,"turno_manha":false,"meio_tarde_1":false,"meio_tarde_2":false,"turno_tarde":false,"turno_noite":false,"diaria":false}}', 1),
  ('sala-2', 'Sala 2', '{"half":100,"shift":180,"daily":290}',
    '{"seg":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "ter":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "qua":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "qui":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "sex":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "sab":{"meio_manha_1":false,"meio_manha_2":false,"turno_manha":false,"meio_tarde_1":false,"meio_tarde_2":false,"turno_tarde":false,"turno_noite":false,"diaria":false},
      "dom":{"meio_manha_1":false,"meio_manha_2":false,"turno_manha":false,"meio_tarde_1":false,"meio_tarde_2":false,"turno_tarde":false,"turno_noite":false,"diaria":false}}', 2),
  ('sala-3', 'Sala 3', '{"half":110,"shift":190,"daily":310}',
    '{"seg":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "ter":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "qua":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "qui":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "sex":{"meio_manha_1":true,"meio_manha_2":true,"turno_manha":true,"meio_tarde_1":true,"meio_tarde_2":true,"turno_tarde":true,"turno_noite":true,"diaria":true},
      "sab":{"meio_manha_1":false,"meio_manha_2":false,"turno_manha":false,"meio_tarde_1":false,"meio_tarde_2":false,"turno_tarde":false,"turno_noite":false,"diaria":false},
      "dom":{"meio_manha_1":false,"meio_manha_2":false,"turno_manha":false,"meio_tarde_1":false,"meio_tarde_2":false,"turno_tarde":false,"turno_noite":false,"diaria":false}}', 3)
on conflict (id) do nothing;

insert into public.shift_hours (id, hours) values (1,
  '{"meio_manha_1":{"start":"08:00","end":"10:00"},
    "meio_manha_2":{"start":"10:00","end":"12:00"},
    "turno_manha":{"start":"08:00","end":"12:00"},
    "meio_tarde_1":{"start":"13:00","end":"15:30"},
    "meio_tarde_2":{"start":"15:30","end":"18:00"},
    "turno_tarde":{"start":"13:00","end":"18:00"},
    "turno_noite":{"start":"18:30","end":"22:00"},
    "diaria":{"start":"08:00","end":"22:00"}}'
) on conflict (id) do nothing;

-- =========================================================
-- Trigger: cria automaticamente um profile quando alguém se cadastra
-- (lê os dados extras enviados no signUp via `options.data`)
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, cpf_cnpj, birth_date, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'cpf_cnpj', ''),
    nullif(new.raw_user_meta_data->>'birth_date', '')::date,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Helper: verifica se o usuário logado é gestor (usado nas policies)
-- =========================================================
create or replace function public.is_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.shift_hours enable row level security;
alter table public.bookings enable row level security;

-- profiles: cada um vê o próprio + gestor vê todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_manager());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update_manager on public.profiles;
create policy profiles_update_manager on public.profiles for update
  using (public.is_manager())
  with check (public.is_manager());

-- rooms: qualquer usuário logado lê; só gestor edita
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select
  using (auth.role() = 'authenticated');

drop policy if exists rooms_write_manager on public.rooms;
create policy rooms_write_manager on public.rooms for all
  using (public.is_manager())
  with check (public.is_manager());

-- shift_hours: qualquer usuário logado lê; só gestor edita
drop policy if exists shift_hours_select on public.shift_hours;
create policy shift_hours_select on public.shift_hours for select
  using (auth.role() = 'authenticated');

drop policy if exists shift_hours_write_manager on public.shift_hours;
create policy shift_hours_write_manager on public.shift_hours for all
  using (public.is_manager())
  with check (public.is_manager());

-- bookings: dono vê as próprias, gestor vê todas
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select
  using (user_id = auth.uid() or public.is_manager());

-- inserir: o próprio usuário para si mesmo, ou o gestor para qualquer um
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert
  with check (user_id = auth.uid() or public.is_manager());

-- atualizar: usuário só pode cancelar reserva própria ainda pendente; gestor pode tudo
drop policy if exists bookings_update_own_pending on public.bookings;
create policy bookings_update_own_pending on public.bookings for update
  using (user_id = auth.uid() and status = 'pendente')
  with check (user_id = auth.uid() and status = 'cancelada');

drop policy if exists bookings_update_manager on public.bookings;
create policy bookings_update_manager on public.bookings for update
  using (public.is_manager())
  with check (public.is_manager());

-- =========================================================
-- Realtime (para a tela atualizar sozinha quando algo muda)
-- =========================================================
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.shift_hours;
alter publication supabase_realtime add table public.bookings;

-- =========================================================
-- ÚLTIMO PASSO (fazer manualmente, depois de criar sua conta pelo app):
-- Promova seu próprio usuário a gestor rodando:
--   update public.profiles set role = 'manager', status = 'ativo' where email = 'SEU_EMAIL_AQUI';
-- =========================================================
