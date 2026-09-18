-- ============================================================================
-- Kabbalah CRM — helper functions, RPCs, triggers
-- All SECURITY DEFINER + SET search_path = public unless noted.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Membership / permission helpers
-- ----------------------------------------------------------------------------
create or replace function is_org_member(_user uuid, _org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where user_id = _user and organization_id = _org and role <> 'pending_approval'
  );
$$;

create or replace function is_org_admin(_user uuid, _org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where user_id = _user and organization_id = _org and role in ('owner','admin')
  );
$$;

create or replace function get_member_role(_user uuid, _org uuid)
returns member_role language sql stable security definer set search_path = public as $$
  select role from organization_members where user_id = _user and organization_id = _org;
$$;

create or replace function shares_org_with(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m1
    join organization_members m2 on m1.organization_id = m2.organization_id
    where m1.user_id = _a and m2.user_id = _b
      and m1.role <> 'pending_approval' and m2.role <> 'pending_approval'
  );
$$;

create or replace function is_client_assignee(_user uuid, _client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from client_assignees where user_id = _user and client_id = _client
  );
$$;

create or replace function can_see_client(_user uuid, _client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients c
    where c.id = _client
      and is_org_member(_user, c.organization_id)
      and (
        is_org_admin(_user, c.organization_id)
        or c.assigned_to = _user
        or c.created_by = _user
        or is_client_assignee(_user, c.id)
      )
  );
$$;

create or replace function can_manage_client_assignees(_user uuid, _client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients c
    where c.id = _client
      and (
        is_org_admin(_user, c.organization_id)
        or c.assigned_to = _user
        or is_client_assignee(_user, c.id)
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- Invites
-- ----------------------------------------------------------------------------
create or replace function get_invite(_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  inv org_invites%rowtype;
  org_name text;
begin
  select * into inv from org_invites where token = _token;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if inv.accepted_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_accepted');
  end if;
  select name into org_name from organizations where id = inv.organization_id;
  return jsonb_build_object(
    'ok', true,
    'organization_id', inv.organization_id,
    'organization_name', org_name,
    'role', inv.role,
    'email', inv.email
  );
end;
$$;
grant execute on function get_invite(uuid) to authenticated;

create or replace function accept_invite(_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  inv org_invites%rowtype;
  effective_role member_role;
  uid uuid := auth.uid();
begin
  select * into inv from org_invites where token = _token for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if inv.accepted_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_accepted');
  end if;

  effective_role := case when inv.role = 'owner' then 'admin' else inv.role end;

  insert into organization_members (organization_id, user_id, role, invited_by)
  values (inv.organization_id, uid, effective_role, inv.invited_by)
  on conflict (organization_id, user_id)
  do update set role = excluded.role;

  update org_invites set accepted_at = now(), accepted_by = uid where id = inv.id;

  return jsonb_build_object('ok', true, 'organization_id', inv.organization_id, 'role', effective_role);
end;
$$;
grant execute on function accept_invite(uuid) to authenticated;

create or replace function add_member_by_email(_org uuid, _email text, _role member_role)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target_id uuid;
  caller uuid := auth.uid();
begin
  if not is_org_admin(caller, _org) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if _role = 'owner' or _role = 'pending_approval' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_role');
  end if;

  select id into target_id from auth.users where email = _email;
  if target_id is null then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  if exists (
    select 1 from organization_members
    where organization_id = _org and user_id = target_id and role = 'owner'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'cannot_modify_owner');
  end if;

  insert into organization_members (organization_id, user_id, role, invited_by)
  values (_org, target_id, _role, caller)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function add_member_by_email(uuid, text, member_role) to authenticated;

-- ----------------------------------------------------------------------------
-- Client activity recompute (called by pg_cron)
-- ----------------------------------------------------------------------------
create or replace function recompute_client_activity()
returns void language plpgsql security definer set search_path = public as $$
begin
  update clients c set status = 'active'
  where status not in ('active','paid')
    and exists (select 1 from programs p where p.client_id = c.id and p.status = 'active');

  update clients c set status = 'waiting'
  where status not in ('active','paid','waiting')
    and not exists (select 1 from programs p where p.client_id = c.id and p.status = 'active')
    and exists (
      select 1 from programs p where p.client_id = c.id and p.created_at > now() - interval '6 months'
    );

  update clients c set status = 'inactive'
  where status not in ('active','paid','inactive')
    and not exists (select 1 from programs p where p.client_id = c.id and p.status = 'active')
    and not exists (
      select 1 from programs p where p.client_id = c.id and p.created_at > now() - interval '6 months'
    );
end;
$$;
grant execute on function recompute_client_activity() to service_role;

-- ----------------------------------------------------------------------------
-- tg_guard_owner_role — organization_members insert/update guard
-- ----------------------------------------------------------------------------
create or replace function tg_guard_owner_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and OLD.role = 'owner' and NEW.role <> 'owner' then
    raise exception 'cannot demote the organization owner';
  end if;
  if NEW.role = 'owner' and (TG_OP = 'INSERT' or OLD.role <> 'owner') then
    if exists (
      select 1 from organization_members
      where organization_id = NEW.organization_id and role = 'owner'
        and (TG_OP = 'INSERT' or id <> NEW.id)
    ) then
      raise exception 'organization already has an owner';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger guard_owner_role
  before insert or update on organization_members
  for each row execute function tg_guard_owner_role();

-- ----------------------------------------------------------------------------
-- tg_program_set_client_active — new program -> client active
-- ----------------------------------------------------------------------------
create or replace function tg_program_set_client_active()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update clients set status = 'active' where id = NEW.client_id and status <> 'paid';
  return NEW;
end;
$$;

create trigger program_set_client_active
  after insert on programs
  for each row execute function tg_program_set_client_active();

-- ----------------------------------------------------------------------------
-- tg_session_completed_update_client
-- ----------------------------------------------------------------------------
create or replace function tg_session_completed_update_client()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'completed' and (TG_OP = 'INSERT' or OLD.status is distinct from 'completed') then
    update clients
      set last_completed_session_at = greatest(coalesce(last_completed_session_at, NEW.session_date), NEW.session_date)
      where id = NEW.client_id;
  end if;
  return NEW;
end;
$$;

create trigger session_completed_update_client
  after insert or update on sessions
  for each row execute function tg_session_completed_update_client();

-- ----------------------------------------------------------------------------
-- tg_session_postponed_reschedule — postpone -> auto-create next session
-- ----------------------------------------------------------------------------
create or replace function tg_session_postponed_reschedule()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prog programs%rowtype;
  last_date date;
  candidate date;
  target_time time;
  i int;
  wd int;
begin
  if NEW.status <> 'postponed' or OLD.status = 'postponed' then
    return NEW;
  end if;
  if NEW.program_id is null then
    return NEW;
  end if;

  select * into prog from programs where id = NEW.program_id;
  if not found or prog.weekly_days is null or array_length(prog.weekly_days,1) is null then
    return NEW;
  end if;

  select max(session_date)::date into last_date from sessions where program_id = NEW.program_id;
  last_date := coalesce(last_date, NEW.session_date::date);

  target_time := coalesce(nullif(prog.session_time,'')::time, '10:00'::time);

  for i in 1..365 loop
    candidate := last_date + i;
    wd := extract(dow from candidate)::int;
    if wd = any(prog.weekly_days) then
      insert into sessions (organization_id, program_id, client_id, session_date, status)
      values (NEW.organization_id, NEW.program_id, NEW.client_id,
              (candidate + target_time)::timestamptz, 'scheduled');
      exit;
    end if;
  end loop;

  return NEW;
end;
$$;

create trigger session_postponed_reschedule
  after update on sessions
  for each row execute function tg_session_postponed_reschedule();

-- ----------------------------------------------------------------------------
-- tg_client_waiting_followup_task
-- ----------------------------------------------------------------------------
create or replace function tg_client_waiting_followup_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'waiting' and (TG_OP = 'INSERT' or OLD.status is distinct from 'waiting') then
    if not exists (
      select 1 from tasks
      where client_id = NEW.id and source = 'waiting_followup' and status = 'todo'
    ) then
      insert into tasks (organization_id, title, priority, status, due_date, client_id, assigned_to, created_by, source)
      values (
        NEW.organization_id,
        'חזור ללקוח בהמתנה — ' || NEW.full_name,
        'medium', 'todo', now() + interval '10 days',
        NEW.id, coalesce(NEW.assigned_to, NEW.created_by), coalesce(NEW.assigned_to, NEW.created_by),
        'waiting_followup'
      );
    end if;
  end if;
  return NEW;
end;
$$;

create trigger client_waiting_followup_task
  after insert or update on clients
  for each row execute function tg_client_waiting_followup_task();
