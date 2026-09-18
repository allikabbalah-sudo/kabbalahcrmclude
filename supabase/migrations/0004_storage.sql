-- ============================================================================
-- Kabbalah CRM — Storage buckets & policies
-- Path convention: {organization_id}/{clientId|programId}/{timestamp}_{filename}
-- Client avatar: client-media/{org}/{clientId}/avatar/{ts}.{ext}  (upsert)
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('client-media', 'client-media', false),
  ('client-audio', 'client-audio', false),
  ('program-media', 'program-media', false),
  ('program-audio', 'program-audio', false)
on conflict (id) do nothing;

-- Client buckets: folder[1] = organization_id, folder[2] = client_id
create policy client_media_select on storage.objects for select to authenticated using (
  bucket_id in ('client-media','client-audio') and (
    is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
    or can_see_client(auth.uid(), (storage.foldername(name))[2]::uuid)
  )
);
create policy client_media_insert on storage.objects for insert to authenticated with check (
  bucket_id in ('client-media','client-audio')
  and is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  and can_see_client(auth.uid(), (storage.foldername(name))[2]::uuid)
);
create policy client_media_update on storage.objects for update to authenticated using (
  bucket_id in ('client-media','client-audio')
  and is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  and can_see_client(auth.uid(), (storage.foldername(name))[2]::uuid)
);
create policy client_media_delete on storage.objects for delete to authenticated using (
  bucket_id in ('client-media','client-audio')
  and is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  and can_see_client(auth.uid(), (storage.foldername(name))[2]::uuid)
);

-- Program buckets: folder[1] = organization_id — any org member
create policy program_media_all on storage.objects for all to authenticated using (
  bucket_id in ('program-media','program-audio')
  and is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
) with check (
  bucket_id in ('program-media','program-audio')
  and is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Files are always accessed via a 1-hour signed URL from the client/server —
-- buckets are private (public = false above), never served directly.
