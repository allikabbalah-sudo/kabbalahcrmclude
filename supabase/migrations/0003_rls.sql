-- ============================================================================
-- Kabbalah CRM — RLS policies
-- ============================================================================

-- clients
create policy clients_select on clients for select to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or created_by = auth.uid() or is_client_assignee(auth.uid(), id)
  )
);
create policy clients_update on clients for update to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or created_by = auth.uid() or is_client_assignee(auth.uid(), id)
  )
);
create policy clients_insert on clients for insert to authenticated with check (
  is_org_member(auth.uid(), organization_id)
);
create policy clients_delete on clients for delete to authenticated using (
  is_org_admin(auth.uid(), organization_id)
);

-- programs
create policy programs_select on programs for select to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);
create policy programs_update on programs for update to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);
create policy programs_insert on programs for insert to authenticated with check (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);
create policy programs_delete on programs for delete to authenticated using (
  is_org_admin(auth.uid(), organization_id)
);

-- sessions
create policy sessions_select on sessions for select to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);
create policy sessions_update on sessions for update to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);
create policy sessions_insert on sessions for insert to authenticated with check (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);
create policy sessions_delete on sessions for delete to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid()
    or can_see_client(auth.uid(), client_id)
  )
);

-- tasks
create policy tasks_select on tasks for select to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or (
      (assigned_to = auth.uid() or created_by = auth.uid())
      and (client_id is null or can_see_client(auth.uid(), client_id))
    )
  )
);
create policy tasks_insert on tasks for insert to authenticated with check (
  is_org_member(auth.uid(), organization_id)
);
create policy tasks_update on tasks for update to authenticated using (
  is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid() or created_by = auth.uid()
);
create policy tasks_delete on tasks for delete to authenticated using (
  is_org_admin(auth.uid(), organization_id) or assigned_to = auth.uid() or created_by = auth.uid()
);

-- client_assignees
create policy client_assignees_select on client_assignees for select to authenticated using (
  can_see_client(auth.uid(), client_id)
);
create policy client_assignees_insert on client_assignees for insert to authenticated with check (
  can_manage_client_assignees(auth.uid(), client_id)
  and exists (
    select 1 from clients c
    join organization_members om on om.organization_id = c.organization_id
    where c.id = client_id and om.user_id = client_assignees.user_id and om.role <> 'pending_approval'
  )
);
create policy client_assignees_delete on client_assignees for delete to authenticated using (
  can_manage_client_assignees(auth.uid(), client_id)
);

-- notifications
create policy notifications_select on notifications for select to authenticated using (
  user_id = auth.uid()
);
create policy notifications_update on notifications for update to authenticated using (
  user_id = auth.uid()
);
create policy notifications_insert on notifications for insert to authenticated with check (
  user_id = auth.uid() and is_org_member(auth.uid(), organization_id)
);

-- activity_logs (no update/delete)
create policy activity_logs_select on activity_logs for select to authenticated using (
  is_org_member(auth.uid(), organization_id) and (
    is_org_admin(auth.uid(), organization_id) or client_id is null or can_see_client(auth.uid(), client_id)
  )
);
create policy activity_logs_insert on activity_logs for insert to authenticated with check (
  is_org_member(auth.uid(), organization_id) and (user_id is null or user_id = auth.uid())
);

-- profiles
create policy profiles_select on profiles for select to authenticated using (
  id = auth.uid() or shares_org_with(auth.uid(), id)
);
create policy profiles_update on profiles for update to authenticated using (id = auth.uid());
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());

-- organization_members
create policy org_members_select on organization_members for select to authenticated using (
  user_id = auth.uid() or is_org_member(auth.uid(), organization_id)
);
create policy org_members_insert on organization_members for insert to authenticated with check (
  (user_id = auth.uid() and role = 'pending_approval') or is_org_admin(auth.uid(), organization_id)
);
create policy org_members_update on organization_members for update to authenticated using (
  (is_org_admin(auth.uid(), organization_id) and role <> 'owner') or user_id = auth.uid()
);
create policy org_members_delete on organization_members for delete to authenticated using (
  (is_org_admin(auth.uid(), organization_id) and role <> 'owner') or user_id = auth.uid()
);

-- org_invites (admin only; no update — acceptance goes through RPC)
create policy org_invites_select on org_invites for select to authenticated using (
  is_org_admin(auth.uid(), organization_id)
);
create policy org_invites_insert on org_invites for insert to authenticated with check (
  is_org_admin(auth.uid(), organization_id) and invited_by = auth.uid() and role <> 'owner'
);
create policy org_invites_delete on org_invites for delete to authenticated using (
  is_org_admin(auth.uid(), organization_id)
);

-- push_subscriptions
create policy push_subscriptions_all on push_subscriptions for all to authenticated using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);

-- organizations: members can read their orgs; owner can update
create policy organizations_select on organizations for select to authenticated using (
  is_org_member(auth.uid(), id)
);
create policy organizations_update on organizations for update to authenticated using (
  owner_id = auth.uid()
);
create policy organizations_insert on organizations for insert to authenticated with check (
  owner_id = auth.uid()
);
