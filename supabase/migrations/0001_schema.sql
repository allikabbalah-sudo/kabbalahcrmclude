-- ============================================================================
-- Kabbalah CRM — Initial schema
-- Multi-tenant clinic CRM. Postgres + RLS on Supabase.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type client_status as enum ('lead','consultation','active','inactive','waiting','paid');
create type member_role as enum ('owner','admin','therapist','member','pending_approval');
create type program_status as enum ('active','completed','cancelled','paused');
create type session_status as enum ('scheduled','completed','cancelled','no_show','postponed');
create type task_priority as enum ('low','medium','high','urgent');
create type task_status as enum ('todo','done');

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on organizations
  for each row execute function tg_set_updated_at();

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on profiles
  for each row execute function tg_set_updated_at();

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'pending_approval',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id)
);
create trigger set_updated_at before update on organization_members
  for each row execute function tg_set_updated_at();

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role member_role not null default 'member',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  status client_status not null default 'lead',
  date_of_birth date,
  mother_name text,
  address text,
  avatar_url text,
  selected_reading text,
  partner_full_name text,
  partner_dob date,
  partner_mother_name text,
  notes text,
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  last_completed_session_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_clients_org on clients(organization_id);
create trigger set_updated_at before update on clients
  for each row execute function tg_set_updated_at();

create table client_assignees (
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  total_sessions int not null default 1,
  weekly_days int[] not null default '{}',      -- 0=Sun..6=Sat
  start_date date not null default current_date,
  status program_status not null default 'active',
  sessions_per_day int not null default 1,
  session_times text[] not null default '{}',   -- ["09:00", ...]
  day_parts text[] not null default '{}',
  morning_time text,
  noon_time text,
  evening_time text,
  session_time text,                             -- legacy single-time fallback
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_programs_org on programs(organization_id);
create index idx_programs_client on programs(client_id);
create trigger set_updated_at before update on programs
  for each row execute function tg_set_updated_at();

create table sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  session_date timestamptz not null,
  status session_status not null default 'scheduled',
  notes text,
  audio_urls text[] not null default '{}',
  image_urls text[] not null default '{}',
  assigned_to uuid references auth.users(id),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sessions_org on sessions(organization_id);
create index idx_sessions_program on sessions(program_id);
create index idx_sessions_client on sessions(client_id);
create index idx_sessions_date on sessions(session_date);
create trigger set_updated_at before update on sessions
  for each row execute function tg_set_updated_at();

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  priority task_priority not null default 'medium',
  status task_status not null default 'todo',
  due_date timestamptz,
  client_id uuid references clients(id) on delete cascade,
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  source text,
  reminder_1h_sent_at timestamptz,
  reminder_10m_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_org on tasks(organization_id);
create index idx_tasks_client on tasks(client_id);
create index idx_tasks_due on tasks(due_date);
create trigger set_updated_at before update on tasks
  for each row execute function tg_set_updated_at();

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id, created_at desc);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_org on activity_logs(organization_id);
create index idx_activity_client on activity_logs(client_id);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_push_user on push_subscriptions(user_id);

-- ----------------------------------------------------------------------------
-- auth.users -> profiles trigger
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_name text;
begin
  derived_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id, derived_name, new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- GRANTS — no anon access anywhere; RLS enforces row-level policy.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'organizations','profiles','organization_members','org_invites',
    'clients','client_assignees','programs','sessions','tasks',
    'notifications','activity_logs','push_subscriptions'
  ])
  loop
    execute format('grant select, insert, update, delete on %I to authenticated', t);
    execute format('grant all on %I to service_role', t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
