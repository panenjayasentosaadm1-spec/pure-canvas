# UsagiNime — Project Status

_Last updated: 2026-10-24. This file is for an AI session continuing from a different repository or Lovable account._

## Architecture

- **Stack:** Lovable project (TanStack Start v1, React 19, Vite 7, Tailwind CSS v4 in `src/styles.css`, TanStack Query, TanStack Router).
- **Backend:** External Supabase project `aqzavboruvlppnbflfse` (PostgREST 14.18 / Postgres), connected by the user in Lovable Settings → External Supabase. Lovable managed migration tooling is **not** available for this project — schema/SQL changes are manual incremental files in `docs/`.
- **Supabase client:** standalone `@supabase/supabase-js` browser client in `src/integrations/supabase/client.ts` with SDK-default session storage (persistence + auto-refresh on, no Preview postMessage brokering).
- **Public pages** (home, terbaru, catalog, genres, anime detail, episode): `ssr: false` with skeleton pending components, data via `queryClient` query options.
- **Admin:** client-only `/admin` Outlet layout; real Supabase Auth session + `has_role(userId, 'admin')` check; `/admin/login` un-nested.
- **Content APIs:** `src/api/anime.ts`, `episodes.ts`, `tags.ts`, `settings.ts`, `hero.ts`, `ad-slots.ts`, `list-image.ts` read/write Supabase directly; shared helpers in `src/api/backend.ts` (error checks, admin session guard, row→app-model mapping).
- **Images:** public posters bucket, displayed via public-URL helper `src/api/storage-image.ts` — never signed URLs from the browser. DB writes keep object paths.
- **Episodes:** playback through `UniversalPlayer` + `src/lib/source-resolver.ts` (iframe / direct / HLS / DASH / YouTube; hls.js and dashjs lazy-loaded); URL security checks shared with admin forms; opaque-origin sandboxing for generic providers.
- **Ads:** `site_settings.ad_slots` JSONB on the existing singleton + atomic role-checked `save_ad_slot` RPC (`src/api/ad-slots.ts`); manual setup SQL in `docs/ad-slots-setup.sql`. Public ad hosts render outside the Outlet with a per-document slot registry; banners use opaque-origin `srcdoc` frames.
- **Hero (featured anime):** config stored on `site_settings.hero` (spec: `docs/hero-setup.sql`); API `src/api/hero.ts`, carousel `src/components/FeaturedHero.tsx`, admin `src/components/admin/HeroManager.tsx`.

## Confirmed live schema (re-checked via PostgREST OpenAPI spec, 2026-10-24)

- `anime`: id, title, slug, synopsis, poster_url, type, status, season, year, is_published, created_at, updated_at.
- `episodes`: id, anime_id, episode_number, title, embed_url, thumbnail_url, is_published, published_at, created_at, updated_at.
- `site_settings` (singleton id=1): site_name, tagline, logo_url, footer_text, **ad_slots** (live), created_at, updated_at.
- `tags`: id, name, slug. `anime_tags`: anime_id, tag_id (FKs to anime and tags). `allowed_embed_domains`: id, domain. `user_roles`: id, user_id, role.
- Functions: `save_ad_slot(_slot, _code, _enabled)`, `has_role(_role, _user_id)`.
- Enums: `anime_status` (ongoing/completed/upcoming), `anime_type` (tv/movie/ova/ona/special), `app_role` (admin/user).
- **NOT live:** `anime.alt_title`, `anime.studio`, `anime.rating`, `anime.duration_minutes`, `anime.total_episodes`, and `site_settings.hero` (hero SQL pending — code degrades gracefully without the column).

## Completed work

- **Phase 1 backend migration (done):** public and admin content APIs migrated from the localStorage mock store to Supabase, using the verified live column names. Published-only visibility enforced on public reads, including hiding episodes whose parent anime is unpublished. `anime_tags` relationships preserved. Mock store (`src/api/store.ts`, `mockData.ts`) remains only for tests/fixtures — **no production fallback**.
- **Schema alignment (done):** TS types (`src/integrations/supabase/types.ts`, `db-types.ts`) aligned to the live schema; obsolete doc-based column names (`poster_path`, `number`, `thumbnail_path`, `alt_title`, `logo_path`) removed.
- **Ads Management and Featured Hero** implemented per the patterns above.

## Verification results (previous session — not rerun since)

- TypeScript check: **pass**.
- Tests: **120 tests across 12 files — all pass** (`src/test/`).
- Production build: **pass**.
- Homepage browser verification: **pass**.

## Known limitations / unverified

- `docs/hero-setup.sql` (and originally `docs/ad-slots-setup.sql`) must be applied manually in the Supabase dashboard; hero is hidden until its SQL runs.
- Actual RLS policy behavior, admin mutations with a real admin account, private image access, and hosted ad-slot behavior have not been verified against the live project.
- Storage integration (uploads to Supabase Storage) is a separate, later phase.

## Next recommended task

Apply `docs/hero-setup.sql` in the Supabase dashboard, then verify the hero end-to-end with a real admin account; after that, verify RLS/authorization and ad slots against the hosted project.
