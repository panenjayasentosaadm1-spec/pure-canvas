# UsagiNime — Project Rules

Lasting rules for any AI session continuing this project (possibly from a different repository or Lovable account).

## Verify before changing

- Always verify the **current source** and the **live schema** before editing data-layer code. Confirm columns via the project's PostgREST OpenAPI spec; the last confirmed re-check was 2026-10-24. A spec document or older chat may name columns that don't exist — trust the live re-check.
- Avoid unnecessary full audits. Do targeted checks for the area you touch (relevant tables, relevant API files, affected tests). Full audits are for new sessions without documentation, not routine changes.

## Preserve the backend architecture

- **Ads Management:** keep `site_settings.ad_slots` on the existing singleton + the atomic role-checked `save_ad_slot` RPC (`src/api/ad-slots.ts`, `docs/ad-slots-setup.sql`). Do not add settings tables or whole-map concurrent overwrites.
- **Supabase security:** never weaken or bypass RLS; never bypass the `has_role` admin check; no service-role keys in browser code; public reads return published content only; no public write policies; do not loosen embed-domain restrictions.
- **Schema discipline:** do not reintroduce obsolete columns (`poster_path`, `number`, `thumbnail_path`, `alt_title`, `logo_path`, `anime.studio`/`rating`/`duration_minutes`/`total_episodes`) or invent new ones without a live-schema check. Schema changes are manual incremental SQL in `docs/` (managed migration tooling is unavailable).
- **No production mock fallback:** `src/api/store.ts` / `mockData.ts` are test/fixture only. Never silently fall back to mock data in production paths.

## Process discipline

- Never run destructive database actions; never rewrite published git history (force push, rebase, amend, squash of pushed commits).
- Storage migration (uploads to Supabase Storage) is a separate phase — don't fold it into content-API work.
- Don't claim tests/builds were run unless you actually ran them in that session; record prior verified results as such.
- **Keep documentation updated when switching repositories or Lovable accounts:** refresh `PROJECT_STATUS.md` (schema re-check date, verification results, open items) and append a `CHANGELOG.md` entry for every completed chunk of work. Schema confirmations are per-project — re-verify when the Supabase project or Lovable account changes.
