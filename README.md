# Kabbalah CRM

Multi-tenant clinic CRM built from the spec: React 19 + TanStack Start (SSR) on
Cloudflare Workers, Supabase (Postgres + Auth + Storage + Realtime), Web Push,
PWA. RTL Hebrew UI throughout.

## What's implemented

- **Database**: full schema, RLS policies, storage buckets/policies, and
  business-logic triggers — `supabase/migrations/0001..0004`. This is the
  most load-bearing part of the app and is complete and ready to run.
- **Auth**: email/password + Google OAuth, session-aware routing guard.
- **Multi-tenancy**: organizations, membership roles, org switcher, invite
  links, pending-approval flow.
- **Clients**: list/search/filter, detail view, status pipeline (Kanban,
  drag-and-drop), WhatsApp/phone quick actions.
- **Programs & sessions**: recurrence-rule program creation that eagerly
  materializes sessions; per-session status editing; auto-reschedule on
  postpone (DB trigger).
- **Tasks**: CRUD, priority, due dates, assignment notifications.
- **Notifications**: in-app feed with Realtime updates + Web Push (VAPID),
  service worker for push + basic offline app-shell caching.
- **Cron hooks**: `/api/public/hooks/task-reminders` and
  `/api/public/hooks/session-reminders`, secret-protected, meant to be called
  by Cloudflare Cron Triggers or an external scheduler.
- **Export**: admin-only full-organization data export as a ZIP of JSON.

## What's intentionally stubbed / left for you

- **Email delivery** for invites (`src/lib/server-fns/invites.ts` has a
  `TODO` where you wire in Resend/Postmark/etc — Supabase Auth emails for
  signup/reset work out of the box, but invite emails are your own domain).
- **App icons** (`public/icon-192.png`, `public/icon-512.png`) — add your own.
- **`src/lib/database.types.ts`** is a loose placeholder; regenerate it
  against your real project (command below) for full type safety.
- Some secondary screens implied by the spec (bulk client import, advanced
  reporting/analytics charts, audio waveform playback UI) have their data
  layer in place (`audio_urls`/`image_urls` columns, storage buckets, signed
  URL helper) but no dedicated screen yet — the `FileGallery`/`AudioRecorder`
  component stubs in `src/components/media/` are the place to build them out.
- Cloudflare Cron Trigger wiring (`scheduled()` handler that calls the two
  hook routes) — add to a `_worker.ts`/Wrangler cron config per current
  Cloudflare + TanStack Start docs, since exact glue code depends on your
  Wrangler version.

## Setup

1. **Supabase project**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push   # runs supabase/migrations/*.sql in order
   ```
2. **Enable Google OAuth** (optional) in Supabase Dashboard → Authentication → Providers.
3. **VAPID keys** for Web Push:
   ```bash
   npx web-push generate-vapid-keys
   ```
4. **Environment variables** — copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (browser-safe, anon key)
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `CRON_SECRET` (any random string; must match what your scheduler sends)
5. **Install & run**
   ```bash
   npm install
   npm run dev
   ```
6. **Generate real DB types** (recommended before writing more features):
   ```bash
   npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/database.types.ts
   ```
7. **Deploy** to Cloudflare:
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put VAPID_PUBLIC_KEY
   npx wrangler secret put VAPID_PRIVATE_KEY
   npx wrangler secret put VAPID_SUBJECT
   npx wrangler secret put CRON_SECRET
   npm run deploy
   ```

## Project structure

```
supabase/migrations/     Schema, RPC functions & triggers, RLS, storage policies
src/routes/               File-based routes (TanStack Router)
  _authenticated.tsx       Auth guard + org context + app shell layout
  _authenticated/          Dashboard, clients, pipeline, calendar, tasks, notifications, settings
  api/public/hooks/        Cron-triggered notification endpoints
src/lib/server-fns/       createServerFn mutations (clients, programs, tasks, invites, push, export)
src/lib/business-logic.ts Pure functions: recurrence expansion, WhatsApp links, labels
src/hooks/                 AuthProvider, OrganizationProvider
src/components/            Layout shell, client cards, kanban board, dialogs
public/sw.js               PWA service worker (push + offline shell)
```

## Notes on correctness vs. the spec

- RLS mirrors the visibility rule from the spec: admins/owners see everything
  in the org; therapists/members see only clients they're assigned to,
  created, or were added to via `client_assignees`.
- The "waiting client follow-up" and "new program → client active" behaviors
  are implemented as DB triggers, not client-side logic, so they hold even
  for direct DB writes / other future clients of this schema.
- Session recurrence expansion is duplicated intentionally in two places —
  `src/lib/business-logic.ts` (client-side preview) and the Postgres
  `tg_session_postponed_reschedule` trigger (server-side, for postponements)
  — kept in sync conceptually but not literally shared code, since one runs
  in the browser/Node and the other in PL/pgSQL.

This is a full, runnable scaffold — not a finished production app. Framework
versions (TanStack Start, Tailwind v4) move quickly; if `npm install` surfaces
peer-dependency mismatches, check the current docs for the exact pinned
versions before forcing installs.
