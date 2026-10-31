# IDSSO website (idssochi.org)

Static rebuild of the Information and Decision Sciences Student Organization website, previously WordPress (Neve theme + Otter Blocks on SiteGround). Built with [Astro](https://astro.build) 5, no client-side framework, hand-written CSS that reproduces the Neve theme tokens. All content lives in plain files so people and AI agents can maintain it from this repo.

The build specification is in [`SPEC.md`](SPEC.md). Every deviation from the live WordPress site is logged in [`CONTENT_NOTES.md`](CONTENT_NOTES.md).

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs dist/
npm run preview    # serve dist/ locally
npm run check      # astro check (types + templates)
npm run links      # internal link checker over dist/
```

Node 20+ (`.nvmrc`). No environment variables are required to build; see "Member form" for the one optional variable.

## Before first deploy: mirror media and /nmo/

The initial commit contains **no images, PDF, or the `/nmo/` orientation mini-site** because the build environment could not reach `idssochi.org`. From any machine that can:

```bash
npm run mirror        # downloads the 20 media files into public/uploads/ and mirrors /nmo/ into public/nmo/
npm run icons         # generates favicon sizes + favicon.ico from public/uploads/2025/12/cropped-Icon.png
npm run build && npm run links -- --strict
git add public && git commit -m "Add mirrored media and /nmo/ mini-site"
```

`scripts/mirror-assets.sh` holds the exact file list (SPEC.md §5 and §9). It accepts `media` or `nmo` to run one half. `/nmo/` is a frozen, hand-coded Bootstrap 3 site owned by the New Member Orientation Committee; copy it verbatim and do not restyle it. The only permitted edit (made automatically by the script) is turning the absolute `https://idssochi.org/constitution/` link into `/constitution/`.

## Editing content (the only files most changes need)

| What | File | Notes |
|---|---|---|
| Executive board | `src/data/officers.yaml` | Order = display order. Row backgrounds alternate automatically. Photos go in `public/uploads/YYYY/MM/` and are referenced relative to `/uploads/`. |
| Upcoming events | `src/data/events.yaml` | One entry per timeline card. `description_position: before|after` controls whether the description sits above or below Time/Location. |
| Six virtues (flip cards) | `src/data/virtues.yaml` | `mobile_height` is the card height at ≤600px. |
| Menu (header + footer) | `src/data/nav.json` | Ordered list. Keep labels exactly as shown on the site. |
| Site title, socials, emails, logo | `src/data/site.json` | Footer social badges and the "UIC Connection" image badge are here. |
| News posts | `src/content/news/<slug>.md` | File name = URL slug at the site root (`/<slug>/`). Frontmatter: `title`, `date`, `author`, optional `excerpt`/`description`. If `excerpt` is omitted, the first 40 words are used. |
| Page copy | `src/pages/*.astro` | Copy is inline in the page templates. Preserve wording verbatim unless the owner approves a change; log changes in `CONTENT_NOTES.md`. |

### Adding a news post

1. Create `src/content/news/my-post-slug.md` with frontmatter (`title`, `date: 2026-05-01T12:00:00-05:00`, `author: "IDSSO Admins"`).
2. Write the body in Markdown. It renders at `/my-post-slug/`, appears first on `/news/`, and in the Recent Posts sidebar.
3. `npm run build` to confirm.

### Adding a page

1. Create `src/pages/my-page.astro`, import `Base` from `../layouts/Base.astro` and (for default-template pages) `PageTitle`.
2. Wrap content in `<div class="container page-content">`.
3. Add the page to `src/data/nav.json` if it belongs in the menu. The sitemap updates automatically.

## Project layout

```
public/            static files copied as-is: _redirects, robots.txt, fonts/, uploads/ (media), nmo/ (orientation mini-site)
src/styles/        tokens.css (design tokens from SPEC.md §4) and global.css (base typography, buttons, utilities)
src/layouts/       Base.astro (head, header, footer, scroll-to-top)
src/components/    Header, Footer, SocialLinks, Timeline, FlipCard, OfficerRow, FileEmbed, PostList, MemberForm, …
src/data/          site.json, nav.json, officers.yaml, events.yaml, virtues.yaml
src/content/news/  one Markdown file per post
src/pages/         one file per URL; [slug].astro renders posts at the root
src/lib/           data loader (YAML) and excerpt helper
scripts/           mirror-assets.sh, generate-icons.mjs, check-links.mjs
```

## Member form

The New Member Form posts to the URL in the `PUBLIC_FORM_ENDPOINT` environment variable (read at build time). If it is unset, the form renders disabled with the notice "Form temporarily unavailable — email eboard@idssochi.org to join." It never fakes a success state.

**Recommended provider: Formspree or Web3Forms** (free tier, submissions emailed to `eboard@idssochi.org`, spam filtering, CSV export).

1. Create a form at the provider, set the notification email to `eboard@idssochi.org`.
2. Set `PUBLIC_FORM_ENDPOINT` to the provider's POST URL (for example `https://formspree.io/f/xxxxxxxx`) in Cloudflare Pages → Settings → Environment variables (Production and Preview), or in GitHub → Settings → Variables → Actions for the Pages workflow.
3. Redeploy. The form submits via `fetch` and redirects to `/new-member-form/?submitted=1`, which shows "Thank you! You’re on the list." If JavaScript is off, the plain POST still works; the hidden `_next`/`_redirect` fields tell Formspree/Web3Forms where to send the user afterwards.

Field names sent: `name`, `email`, `major`, `year`, `interests[]`, `leadership_interest`, `_subject`, plus the honeypot `_gotcha` (must stay empty). **Rotating the endpoint** is a one-line change to the environment variable and a redeploy; no code change.

Zero-third-party alternative (not built): a Cloudflare Pages Function at `/api/member-form` forwarding to Resend or a Google Sheet. If the team chooses it, add `functions/api/member-form.ts` and set `PUBLIC_FORM_ENDPOINT=/api/member-form`.

## Deploying

### Cloudflare Pages (primary)

1. Workers & Pages → Create → Pages → Connect to Git → this repo.
2. Framework preset **Astro**, build command `npm run build`, output directory `dist`, Node version `20` (set `NODE_VERSION=20`).
3. Add `PUBLIC_FORM_ENDPOINT` (Production and Preview).
4. Custom domains: `idssochi.org` and `www.idssochi.org` (redirect www → apex with a Bulk Redirect).
5. Every PR gets a preview URL; `main` deploys production. Protect `main` with required review.

`public/_redirects` carries the legacy WordPress URL redirects (`/wp-content/uploads/*` → `/uploads/*`, author/category/feed → `/news/`, `wp-json`/`wp-admin`/`wp-login.php` → `/`). Cloudflare Pages cannot match query strings, so old `/?p=ID` links land on the home page.

### GitHub Pages (fallback)

`.github/workflows/deploy-pages.yml` is included but disabled (`if: false`). To use it: enable the two jobs, set Pages → Source to "GitHub Actions", add `public/CNAME` containing `idssochi.org`, and enforce HTTPS. GitHub Pages has no server-side redirects, so also copy media to `public/wp-content/uploads/` to keep legacy media URLs working.

### CI

`.github/workflows/ci.yml` runs on every push and PR: `astro check`, `astro build`, the internal link checker, and a grep that fails if built HTML references `wp-content`, `wp-json`, `siteground`, `themeisle`, `otter`, or `neve`.

## DNS cutover (do with the team)

1. Lower TTLs on the `idssochi.org` A/CNAME records to 300s. Inventory MX/TXT (SPF, DKIM, DMARC): `eboard@idssochi.org` and officer mail must keep working. Only web records change.
2. Verify the preview URL against the acceptance checklist in SPEC.md §13.
3. Point apex + www at Cloudflare Pages. Keep SiteGround up read-only for 30 days as a rollback.
4. Confirm `https://idssochi.org/wp-content/uploads/2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf` redirects, `/nmo/` works, and a test member form submission arrives.
5. Export WordPress content and `wp-content/uploads` into an archive (repo `archive/` or Drive), then cancel SiteGround when ready.

## Open decisions for the team (SPEC.md §14)

1. Host: Cloudflare Pages (recommended) vs GitHub Pages.
2. Form provider: Formspree / Web3Forms vs Cloudflare Function + Resend.
3. Typo policy: fix "Orientaion" and the other flagged items in `CONTENT_NOTES.md`, or keep verbatim for the first release.
4. Board transition: when to update `src/data/officers.yaml` for the 2026–2027 board.
5. Where to archive the WordPress export and unused media.
