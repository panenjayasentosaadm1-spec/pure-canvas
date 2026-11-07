# UsagiNime public SEO metadata

## Scope
- Update homepage and About metadata to the supplied Indonesian titles and descriptions.
- Give catalog, latest episodes, genres, and copyright pages distinct, concise Indonesian search snippets.
- Build anime detail metadata from the loaded anime title, synopsis, and status.
- Build regular and special episode metadata from the anime title and the existing episode number or special label.
- Keep each route's canonical URL, Open Graph values, SSR metadata behavior, and all page functionality intact; leave policy content unchanged.

## Technical approach
- Edit only the relevant public route `head()` definitions, using existing loaders and API fields; no schema, routing, sitemap, structured-data, or UI changes.
- Verify with the project's automatic typecheck/build and inspect the final metadata definitions for all public routes.
