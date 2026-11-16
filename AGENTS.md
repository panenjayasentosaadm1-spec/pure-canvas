<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Database API column names must follow the existing generated `src/integrations/supabase/types.ts`; `db-types.ts` mirrors it. Why: hand-written schema substitutions caused invalid queries and corrupted type helpers.

- Admin area: the client-only `/admin` layout guards children with the mock session API; `/admin/login` stays un-nested. Why: this frontend demo has no real authorization and login must bypass the guard.
- The Supabase browser client uses SDK-default session storage without Preview postMessage brokering; keep persistence and automatic refresh enabled. Why: independently hosted authentication must stay on the app's own origin.
- The posters bucket is public; display posters through the public-URL helper in src/api/storage-image.ts, never signed URLs (the browser's publishable key is rejected by Storage with "Object not found"). Why: generating signed URLs client-side fails and throwing on that error crashed every page.

- The `/anime` route is an Outlet layout with the unchanged catalog in its index leaf; anime detail and un-nested episode routes load published mock resources through query options; reusable resource states and episode lists live in components. Why: unpublished resources remain hidden and episode pages do not mount inside the detail page.
- Anime detail and episode pages share AnimeInfo; the episode picker stays local to the episode route and uses one accessible dialog with responsive positioning. Why: metadata stays consistent without changing the catalog, data interfaces, or shared site shell.
- Dashboard counts are read through the mock API layer, not directly from the store in UI. Why: UI remains independent of mock storage.
- Admin CRUD uses a shared API snapshot and transactional local mock-store writes; forms share validation with the API. Why: frontend-only persistence must report quota failures without partial writes and refresh public query caches.
- Anime forms share one validated component for create/edit and resize poster files in the browser before API writes. Why: identical validation and bounded images keep local persistence reliable.
- Episode admin leaves share EpisodeForm and API-layer validation under Outlet layouts; secondary admin sections remain placeholders. Why: create/edit rules, transactional writes, and public cache refresh stay consistent without rewriting anime administration.
- An empty episode thumbnail URL means use the current anime poster. Why: poster changes remain visible without duplicating large data URLs.
- Public pages that read store data (home, terbaru, catalog, genres, anime detail, episode) are `ssr: false` with skeleton pending components and load via `queryClient.fetchQuery`; list images are computed inside query functions, never at render. Why: store data lives in browser storage, so server renders would show seed data, and fetchQuery refetches invalidated caches after admin writes.
- List-card image ratio comes only from `LIST_CARD_ASPECT` in PosterCard (also used by skeletons, the admin recent list and the episode thumbnail preview); anime poster cards use `POSTER_CARD_ASPECT` (2:3 portrait) from the same file, and posters and the video player keep their own ratios. Why: ratio changes stay in one file and update every list consistently.
- The episode page keeps player and control bar in one wrapper sized on desktop from page-local CSS variables (header, padding, title, controls, gaps) so title, player and controls fit one viewport; mobile stays full width. Why: controls always match player width and viewport fit is tunable in one place.
- Admin image fields (poster, episode thumbnail, logo) share ImageUploadField for preview, change/remove actions, hint and processed-file info; per-image sizes and hints live in the lib/*-upload modules. Why: all upload fields behave and describe results identically.
- Poster and episode-thumbnail entry points share browser-only image-optimizer through their existing lib/*-upload wrappers; logo keeps its independent scaler. Why: optimized full-frame images retain existing API and Storage workflows without affecting video or logo behavior.
- Image Storage URL normalization and poster display share src/api/storage-image.ts; database writes keep object paths, not signed or display URLs. Why: edits must neither duplicate uploads nor persist expiring display credentials.
- Catalog type filtering is presentation-only over API results, and all catalog filters use router search state. Why: home links and history stay consistent without changing mock API interfaces.
- Episode playback goes through UniversalPlayer + src/lib/source-resolver.ts (iframe / direct / HLS / DASH / YouTube engines; hls.js and dashjs are lazy-loaded). Why: one resolver picks the engine so new providers are added as adapters without touching the episode page.
- Admin schema, API writes, previews and legacy embed helpers share source-resolver URL security checks; domain records are independent of episode workflows. Why: any-domain support must not bypass HTTPS, credentials, placeholder or URL-only validation.
- Generic provider frames use opaque-origin sandboxing without popups or navigation; only normalized YouTube nocookie frames allow same-origin and an origin referrer. Why: unregistered providers must not gain app-origin script access while official YouTube embeds retain compatibility.
- Ad settings use the existing site_settings singleton plus an atomic role-checked save_ad_slot RPC through src/api/ad-slots.ts; docs/ad-slots-setup.sql is manual incremental setup for the independent backend when managed migration access is unavailable. Why: retain the existing database and avoid extra settings tables or concurrent whole-map overwrites.
- Public global ad hosts live outside Outlet, with a browser-only per-document slot registry and sequential script execution; banners use opaque-origin srcdoc frames in their homepage locations. Why: globals do not reload on episode navigation, full snippets retain provider tags, and banner scripts cannot overwrite player markup.
