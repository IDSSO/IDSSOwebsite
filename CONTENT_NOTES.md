# Content notes

Every deviation from the live WordPress site (https://idssochi.org, audited 2026-10-30) is logged here, per SPEC.md §12.
Default policy: **preserve copy verbatim**. Only the pre-approved items below were applied.

## Applied (pre-approved by the site owner, SPEC.md §12)

| # | Live site | Action taken | Where |
|---|---|---|---|
| 1 | "Purpose, Mission, & Virtues" menu label prefixed with seven invisible U+200E characters | Stripped; menu order hard-coded | `src/data/nav.json` |
| 2 | Mixed `http://` / `https://` and absolute `wp-content/uploads` media URLs | Normalized to relative `/uploads/YYYY/MM/...` | all pages, `src/data/*.yaml` |
| 3 | Square-crop CSS (`aspect-ratio: 1/1; object-fit: cover; max-width: 300px`) applied only to officer row 6 | Applied to all seven officer photos | `src/components/OfficerRow.astro` |
| 4 | Two `<h1>` on Home (hero + "Benefits of Joining") | "Benefits of Joining" demoted to `<h2>` styled at the same 42px (`has-x-large-font-size`); visual unchanged | `src/pages/index.astro` |
| 5 | Comment form, sidebar Search widget, "Recent Comments" widget on posts; search form on 404 | Removed. Post sidebar keeps the 70/30 layout with Recent Posts only. 404 links to Home and News instead of a search box | `src/pages/[slug].astro`, `src/pages/404.astro` |
| 6 | Threads footer link carries a tracking query string (`?xmt=...`) | Kept as-is (owner's link) | `src/data/site.json` |
| 7 | No meta descriptions on the live site | Added one per page/post, taken from that page's first paragraph. Pure addition; no visible change | each page's `description` prop |
| 8 | No Open Graph tags on the live site | Added `og:*` + `twitter:card` using `/uploads/2025/12/IDSSO-Logo.png` (1456×736). Pure addition | `src/layouts/Base.astro` |

## Flagged, NOT fixed (preserved verbatim; owner to decide)

- **Hero button `New Member Orientaion`** (typo for "Orientation"). Live text kept. Change in `src/pages/index.astro` if approved.
- **Home "Benefits of Joining"** items begin with a bare hyphen as text (five separate paragraphs, not a list). Kept.
- **New Member Form** heading has a trailing space in the WordPress source (dropped, invisible). Option label `Business Admin` kept as-is.
- **Purpose quote sub-line** `Information and decision sciences student organization Constitution` is lowercase in source and rendered uppercase by CSS. Kept.
- **Officers 5–7** show `Bio coming soon`. The March 17 news post announces a *new* board for 2026–2027 while About Us still shows the current board. Both left as published. Update `src/data/officers.yaml` when the transition is certified.
- **Upcoming Events** lists April 25 and May 1 with no year; both "Register" links are identical (`https://cglink.me/2gA/r2270818`). Preserved.
- **Mixed white shades** inside flip-card text on the live site (`#ffffff`, `#fbf9f9`, `#f4f5f7`, editor artifacts). All card text rendered `#ffffff`.
- **Post author link** pointed to `/author/idsso-admins/` on the live site. Now points to `/news/` (author archives are not carried over; `/author/*` redirects to `/news/`).

## Technical notes

- **Fonts**: Poppins 400/600/700 (latin subset, woff2) self-hosted in `public/fonts/`, downloaded from Google Fonts. No third-party font requests.
- **Font Awesome** (one `fa-circle` in the timeline) replaced with a CSS disc. Not loaded.
- **Responsive image sizes**: WordPress served `-300x225`-style variants. This build references the original files with `loading="lazy"` and explicit `width`/`height`. Astro `<Image>` optimization was not used because the media could not be fetched during the build session (see below); it can be adopted once the files are in the repo.
- **Redirects**: Cloudflare Pages `_redirects` cannot match query strings, so the WordPress `/?p=ID` short permalink form is not redirected. Those links land on the home page.
- **Content collection config** lives at `src/content.config.ts` (Astro 5 convention) rather than `src/content/config.ts`.

## Media and /nmo/ not mirrored in the initial build

The build environment could not reach `idssochi.org` (network policy), so `public/uploads/` and `public/nmo/` are empty in the initial commit. Run `npm run mirror` from any machine that can reach the live site, then `npm run icons`, and commit the result. The file list is in `scripts/mirror-assets.sh` (matches SPEC.md §5) and the mini-site list in SPEC.md §9. The link checker reports these as warnings until they are present; pass `--strict` afterwards.

## Unused WordPress media library items

The WP media library holds 84 items; only the ~20 in SPEC.md §5 are referenced by the site. The rest (Neve "Web Agency" demo assets from 2020, raw April 2026 event photos `DSCF21xx` / `IMG_08xx`, two `.mov` files, unused logo variants, duplicate headshots) were deliberately **not** mirrored. They remain in the WordPress library / export archive in case the team wants a gallery later.
