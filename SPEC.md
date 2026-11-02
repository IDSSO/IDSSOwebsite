# IDSSO Website Rebuild Spec: WordPress → Static Site on GitHub

**Audience:** the AI coding agent that will build this in the GitHub repository.
**Goal:** reproduce https://idssochi.org as a static site, visually and functionally identical to the live WordPress site, deployable to Cloudflare Pages (primary) or GitHub Pages (fallback), with all content in plain files so humans and AI agents can maintain it from the repo.
**Source audit date:** 2026-10-30. Everything below was extracted from the live site (rendered HTML, theme CSS, WP REST API). Treat the live site as ground truth; where this document and the live site differ, the live site wins and this document should be corrected.

> **Implementation status (2026-10-31):** built in this repo. See `README.md` for operations and `CONTENT_NOTES.md` for every deviation. Media (§5) and `/nmo/` (§9) could not be fetched from the build environment and must be mirrored with `npm run mirror` before first deploy.

---

## 0. Bottom line for the agent

1. Build an **Astro** static site (zero client JS by default) with content in Markdown/YAML, components for the repeated sections, and a single CSS token file that reproduces the Neve theme values listed in §4.
2. Reproduce **8 WordPress URLs** (7 pages + news index) and **2 news posts** at their exact current paths (§2), plus copy the standalone **/nmo/ orientation mini-site verbatim** (§9).
3. Preserve all copy **verbatim** (§6–§8). Do not paraphrase, "improve", or reorder content. Log suspected typos in `CONTENT_NOTES.md`; fix only the ones explicitly approved in §12.
4. Replace the three WordPress-only behaviors with static equivalents (§10): the Otter contact form backend, post comments, and sidebar search.
5. Ship with `_redirects`, favicons, sitemap, 404 page, and the deployment config in §11. Verify against the acceptance checklist in §13 before declaring done.

---

## 1. Current stack (what you are replacing)

| Item | Value |
|---|---|
| CMS | WordPress on SiteGround (SG Optimizer combines CSS/JS, lazy-loads images) |
| Theme | **Neve** (ThemeIsle), starter template "Web Agency" (Gutenberg variant). Home page slug is still `web-agency-gb-home`. |
| Page builder | Gutenberg + **Otter Blocks** (`themeisle-blocks`: Advanced Columns, Button Group, Advanced Heading, Flip Card, Timeline, Form) |
| Header | Neve Header Builder: logo left, primary menu right (desktop ≥960px); hamburger + off‑canvas slide‑left panel (<960px) |
| Footer | Neve Footer Builder: one row ("footer-bottom"), 3 columns, dark background |
| Fonts | Google Fonts **Poppins 400/600/700**; fallback `Arial, Helvetica, sans-serif` |
| Icons | WP core social-link SVGs; one Font Awesome `fa-circle` in the timeline (replace with CSS/SVG, do not load Font Awesome) |
| Extras | Neve "Scroll to top" button; WP comments open on posts (drop); right sidebar on single posts (Search, Recent Posts, Recent Comments) |
| Separate app | `/nmo/` = hand-coded Bootstrap 3 mini-site ("IDSSO New Member Orientation Packet"), **not** WordPress. 8 HTML pages + assets. Copy as-is. |

### 1.1 Ground-truth sources you can fetch while the WordPress site is still live

Use these to cross-check anything in this spec. All are public, no auth.

```
https://idssochi.org/wp-json/wp/v2/pages?per_page=100          # 7 pages, content.rendered = final HTML
https://idssochi.org/wp-json/wp/v2/posts?per_page=100          # 2 posts
https://idssochi.org/wp-json/wp/v2/media?per_page=100          # 84 media items (only ~20 are used; see §5)
https://idssochi.org/wp-sitemap.xml
https://idssochi.org/nmo/ (+ 7 subpages listed in §9)
```

The combined theme CSS is the single `<link rel="stylesheet">` on any page whose href contains `siteground-optimizer-combined-css-…css` (hash changes; read it from the page `<head>`). You do **not** need to copy that CSS; §4 contains the values that matter. If a visual detail is ambiguous, fetch the live page and inspect computed styles.

If the live site is unreachable from your environment, everything required is already in this document. Ask the team for a `wget --mirror` of `https://idssochi.org/nmo/` and `https://idssochi.org/wp-content/uploads/` (file list in §5 and §9).

---

## 2. URL map (must match exactly; trailing slashes on)

| Live URL | Type | Title shown on page? | Notes |
|---|---|---|---|
| `/` | Page (full-width template) | No (hero instead) | §6.1 |
| `/new-member-form/` | Page (default template, title hidden) | No | §6.2 |
| `/upcoming-events/` | Page (default template) | Yes, "Upcoming Events" | §6.3 |
| `/about-us/` | Page (full-width template) | No (section heading "About Us" instead) | §6.4 |
| `/news/` | Posts index (Neve blog list layout) | No | §6.5 |
| `/purpose-mission-vision-virtues/` | Page (default template) | Yes, "Purpose, Mission, & Virtues" | §6.6 |
| `/constitution/` | Page (default template) | Yes, "Constitution" | §6.7 |
| `/idsso-announces-incoming-executive-board-for-the-2026-2027-term/` | Post | Yes | §7.1 |
| `/information-and-decision-sciences-student-organization-recognized-as-a-registered-student-organization-at-uic/` | Post | Yes | §7.2 |
| `/nmo/` and 7 subpages | Static mini-site | n/a | §9 |
| `/wp-content/uploads/YYYY/MM/<file>` | Media | n/a | Redirect to `/uploads/…` (§10.4) |

**Navigation order (header and footer, identical):** Home · New Member Form · Upcoming Events · About Us · News · Purpose, Mission, & Virtues · Constitution.

Note: in WordPress the "Purpose, Mission, & Virtues" title is prefixed with seven invisible U+200E (left-to-right mark) characters, a hack used to force sort order in the auto-generated page list. **Strip them.** Hard-code the menu order above instead. Keep the `&` (not "and") in the label.

Site title: `Information and Decision Sciences Student Organization`. Tagline: `IDSSO`.
`<title>` format: home = `Information and Decision Sciences Student Organization – IDSSO`; all other pages/posts = `{Page Title} – Information and Decision Sciences Student Organization` (en dash). No meta descriptions exist today; you may add them (see §12).

---

## 3. Recommended stack and repo layout

**Framework:** Astro 4/5 (static output). Rationale: component model for the repeated sections, Markdown content collections for news, zero JS by default, first-class deploy guides for both Cloudflare Pages and GitHub Pages, widely understood by AI agents. Node 20+.

**Do not** use Tailwind or a component library; hand-written CSS from the §4 tokens reproduces Neve faithfully and keeps the diff surface small.

```
idsso-site/
├── README.md                      # how to edit content, run, deploy
├── SPEC.md                        # this document
├── CONTENT_NOTES.md               # typos / questions found during build (see §12)
├── package.json
├── astro.config.mjs               # site:'https://idssochi.org', trailingSlash:'always', build.format:'directory'
├── public/
│   ├── _redirects                 # Cloudflare Pages redirects (§10.4)
│   ├── robots.txt
│   ├── favicon.ico, icons…        # §4.9
│   ├── fonts/poppins-*.woff2      # self-hosted 400/600/700 (latin)
│   ├── uploads/2025/12/…          # media, keep WP year/month paths (§5)
│   ├── uploads/2026/01/…
│   ├── uploads/2026/02/…
│   ├── uploads/2026/04/…
│   └── nmo/                       # orientation mini-site, verbatim (§9)
└── src/
    ├── styles/tokens.css          # §4 CSS custom properties
    ├── styles/global.css          # base typography, buttons, container, utilities
    ├── layouts/Base.astro         # <head>, Header, Footer, ScrollToTop, skip link
    ├── components/
    │   ├── Header.astro           # desktop nav + mobile toggle
    │   ├── MobileNav.astro        # off-canvas panel (slide from left, 360px)
    │   ├── Footer.astro
    │   ├── ScrollToTop.astro
    │   ├── PageTitle.astro        # Neve "big title" block for default-template pages
    │   ├── Section.astro          # Otter "Advanced Columns" equivalent (full/wide, bg, padding, columns)
    │   ├── Button.astro           # variants: neve-primary, neve-outline, hero (see §4.6)
    │   ├── Timeline.astro / TimelineItem.astro
    │   ├── FlipCard.astro
    │   ├── OfficerRow.astro
    │   ├── SocialLinks.astro      # WP core social-links look-alike
    │   ├── FileEmbed.astro        # Constitution PDF block
    │   ├── PostList.astro         # /news/ list
    │   └── MemberForm.astro       # §10.1
    ├── data/
    │   ├── site.json              # title, tagline, socials, emails
    │   ├── nav.json               # ordered menu
    │   ├── officers.yaml          # §6.4 executive board
    │   └── events.yaml            # §6.3 timeline items
    ├── content/
    │   ├── config.ts
    │   └── news/                  # one .md per post, frontmatter: title, date, slug, author, excerpt
    └── pages/
        ├── index.astro
        ├── new-member-form.astro
        ├── upcoming-events.astro
        ├── about-us.astro
        ├── purpose-mission-vision-virtues.astro
        ├── constitution.astro
        ├── news/index.astro
        ├── [slug].astro           # news posts at ROOT (WordPress permalink = /%postname%/)
        └── 404.astro
```

**Content editing contract (what makes this AI-manageable):** officers, events, nav, socials, and posts live in `src/data/*` and `src/content/news/*`. Layout and styling live in components. A future agent asked to "add an event" or "update the board" must only touch data files.

---

## 4. Design tokens (exact values from the live theme)

### 4.1 Colors

```css
:root {
  /* Neve palette */
  --nv-primary-accent:   #2f5aae;   /* links, link hover, scroll-to-top, "Register" buttons */
  --nv-secondary-accent: #2f5aae;   /* identical to primary on this site */
  --nv-site-bg:          #ffffff;
  --nv-light-bg:         #f4f5f7;
  --nv-dark-bg:          #121212;
  --nv-text-color:       #272626;   /* body text */
  --nv-text-dark-bg:     #ffffff;
  --nv-c-1:              #9463ae;   /* unused on current pages */
  --nv-c-2:              #be574b;   /* event titles in timeline, "Upcoming events" hero button */

  /* Brand colors used inline in content (UIC navy / UIC red) */
  --uic-navy:   #001e62;            /* About Us dark section bg, officer names, "Latest News" outline button, "Executive Board" heading */
  --uic-red:    #d50032;            /* officer role labels, "Our Virtues"/"Upcoming Events" buttons, hero subtitle border */
  --hero-title-border: #253b78;     /* hero h1 border */
  --hero-box-bg: rgba(0,0,0,0.79);  /* #000000c9 behind hero h1/h2 */
  --btn-text-cream: #f2f7eb;        /* text on UIC-red buttons */

  /* Section backgrounds (About Us) */
  --bg-offwhite: #eef0ed;           /* "Who we are" + "See us in action" sections */
  --bg-row-alt:  #f5f5f5;           /* alternating officer rows */
  --rule:        #e0e0e0;           /* officer row dividers, timeline marker ring */

  /* Header / footer */
  --header-bg:   #ffffff;
  --menu-color:  #18191d;
  --menu-hover:  #faae48;
  --footer-bg:   #18191d;           /* footer-bottom row */
  --footer-text: #ffffff;

  /* Neve button defaults (used by .is-style-primary / .is-style-secondary) */
  --primarybtnbg: #fcaf3b;  --primarybtncolor: #000000;
  --primarybtnhoverbg: #0366d6; --primarybtnhovercolor: #ffffff;
  --secondarybtnbg: #2b2b2b; --secondarybtncolor: #ffffff; --secondarybtnhovercolor: #676767;

  /* WordPress core defaults that leak through on some blocks */
  --wp-btn-default-bg: #32373c;     /* default .wp-element-button (Constitution "Download", form "Submit", hero "New Member Orientaion") */
  --wp-black: #000000; --wp-white: #ffffff;

  /* Flip card gradient ("Midnight" preset) */
  --flip-gradient: linear-gradient(135deg, #020381 0%, #2874fc 100%);

  /* Timeline */
  --timeline-card-bg: #ecf0f1;
}
```

### 4.2 Typography (Poppins everywhere)

Self-host Poppins 400, 600, 700 (woff2, latin subset) in `public/fonts/` with `font-display: swap`. Fallback stack: `Arial, Helvetica, sans-serif`.

| Element | <576px | ≥576px | ≥960px | Weight | Line-height |
|---|---|---|---|---|---|
| body | 15px | 16px | 17px | 400 | 1.6 / 1.6 / 1.7 |
| h1 | 35px | 55px | 70px | 600 | 1.1 / 1.2 / 1.2 |
| h2 | 30px | 35px | 50px | 600 | 1.6 / 1.6 / 1.2 |
| h3 | 20px | 20px | 20px | 600 | 1.6 |
| h4 | 20px | 22px | 24px | 700 | 1.6 / 1.5 / 1.5 |
| h5 | 16px | 18px | 20px | 700 | 1.6 |
| h6 | 14px | 14px | 16px | 700 | 1.6 |

Letter-spacing 0, text-transform none, unless a block overrides (listed per page). WP preset sizes used in content: `has-x-large-font-size` = **42px**, `has-large-font-size` = 36px, medium 20px, small 13px. Paragraph default bottom margin: 30px (Neve). Heading default margin-bottom: 20px.

### 4.3 Layout

```css
:root { --container: 748px; }                 /* <576px  */
@media (min-width: 576px) { :root { --container: 992px; } }
@media (min-width: 960px) { :root { --container: 1170px; } }
.container { max-width: var(--container); margin: 0 auto; padding: 0 15px; }
```

* Breakpoints used by the theme and Otter blocks: **600px** (mobile), **960px** (tablet→desktop). WP core columns stack below **782px**.
* Pages on the default template render content inside `.container`. Pages on the full-width template (Home, About Us) have `alignfull` sections spanning the viewport whose inner content is capped at `--columns-width: 1170px` (About) / default (Home) and centered.
* `alignwide` sections on About Us: same 1170px cap, not full-bleed background (the background color spans only the capped box). In practice both look edge-to-edge at ≤1170px; at wider viewports `alignfull` sections (About hero strip, dark navy section) bleed to the edges while `alignwide` ones do not. Reproduce this distinction.
* No sidebar on pages. Single posts: content column 70% + right sidebar 30% at ≥960px (§6.8).

### 4.4 Header (Neve header builder, row "main", full-contained)

* Height: auto; row background `#ffffff`; row bottom border color `--nv-light-bg` (1px, barely visible).
* **Logo**: `/uploads/2025/12/cropped-IDSSO-Logo.png` (200×76 PNG, transparent), `alt=""`, `aria-label` on the link = `Information and Decision Sciences Student Organization IDSSO`, link to `/`. Max-width 120px (<576), 180px (≥576), 350px (≥960) → renders at natural 200px on desktop. Padding 10px 0.
* **Desktop primary menu** (visible ≥960px; hidden below): right-aligned flex list, items uppercase, Poppins 600, font-size `0.8em` of body (≈13.6px), color `#18191d`, hover color `#faae48`, active item color `#18191d`, gap 20px, item height 25px, no underline. No dropdowns (flat list of 7).
* **Mobile (<960px)**: logo left, hamburger button right. Button: three bars icon, 1px border, radius 3px, padding 10px 15px, `aria-label="Navigation Menu"`, `aria-expanded`. Click opens an **off-canvas panel sliding in from the left**, width 360px, background `#ffffff`, text `--nv-text-color`, full height, with a close (X) button top-right of the panel, and a dark page overlay (click overlay to close). Panel lists the same 7 links stacked, left-aligned, uppercase 600, 1em. Body class toggles `is-menu-sidebar`; transition `transform 0.3s`.
* Skip link: `<a class="skip-link" href="#content">Skip to content</a>` visually hidden until focused.

### 4.5 Footer (single row = Neve "footer-bottom")

* Background `#18191d`, text `#ffffff`, links `#ffffff` (hover: primary accent), contained to `--container`, padding ≈ 32px 0, 3 equal columns (`grid-template-columns: 1fr 1fr 1fr`, align top), stacking to 1 column below 960px with left alignment.
* **Column 1** (text widget):
  `Information & Decision Sciences Student Organization` `<br>` `University of Illinois Chicago`
* **Column 2** (page list, same 7 links, same order as header, plain vertical `<ul>`, no bullets).
* **Column 3**: paragraph `Follow Us`, then a social icon row (WP core "Social Icons", default style = colored round brand badges: each item is a **36×36 circle** (`border-radius: 9999px`) with a 24×24 white glyph and 6px padding; row gap **12px**). Items, all `target="_blank" rel="noopener nofollow"`:
  1. LinkedIn → `https://www.linkedin.com/company/information-and-decision-sciences-student-organization-at-uic`
  2. Instagram → `https://www.instagram.com/idsso_uic/`
  3. Facebook → `https://www.facebook.com/p/Idsso-Uic-61587390967378/`
  4. Threads → `https://www.threads.com/@idsso_uic?xmt=AQF0-2_8n0CwaAoi5OelhuoSUv6Flw7eyGzA-XwZv05BpEM` (keep the query string)
  5. Mail → `mailto:eboard@idssochi.org`
  6. "UIC Connection" (custom): a 50×50 round image badge using `/uploads/2026/02/Generated-image-1.png` as `background: url() center/cover`, no SVG, transparent background → `https://uic.campusgroups.com/feeds?type=club&type_id=70779&tab=about`. Screen-reader label `Link`.
  Circle colors (measured): LinkedIn `#0d66c2`, Instagram `#f00075`, Facebook `#0866ff`, Threads `#000000` (white glyphs); Mail `#f0f0f0` with a **black** glyph. Use the WP core SVG paths (24×24 viewBox) or equivalent simple-icons.
* No copyright line, no "Powered by".

### 4.6 Buttons (four looks exist on the site; implement as variants)

| Variant | Where | Styles |
|---|---|---|
| `neve-primary` (`.is-style-primary`) | About Us "Our Virtues", "Upcoming Events" | padding 12px 24px, radius 0, weight 700, body font-size; colors set inline per button: bg `#d50032`, text `#f2f7eb`. Hover: keep bg, slight darken acceptable (theme uses `--primarybtnhoverbg` only when no inline color; with inline colors Neve applies opacity ~0.9 hover). |
| `wp-outline` (`.is-style-outline`) | About Us "Latest News" | transparent bg, **2px** border `#001e62`, text `#001e62`, radius 9999px (pill), padding 10px 20px, weight 400 |
| `wp-default` (`.wp-element-button`) | "New Member Orientaion" hero button, Constitution "Download", form "Submit" | bg `#32373c`, text `#fff`, pill radius 9999px, padding 10px 20px (hero: 15px 30px) |
| `hero` (Otter button group) | Home hero 4 buttons | font-size 18px, uppercase, weight 400, padding 15px 30px, no border; per-button colors in §6.1 |
| `timeline` | "Register" buttons | bg `#2f5aae`, text `#fff`, pill, padding 12px 22px, weight 400 |

All buttons: `text-decoration: none`, `display: inline-block`, `transition: .2s`.

### 4.7 Scroll-to-top

Fixed, right 20px, bottom 30px, z-index 999, `<button aria-label="Scroll To Top">` with an up-chevron SVG 16×16 white, background `--nv-primary-accent`, padding 8px 10px, radius 3px, no border. Hidden until the user scrolls past ~ one viewport; fade in/out 0.3s. Shown on mobile too. Smooth scroll to top on click.

### 4.8 Page title block (default-template pages)

Pages "Upcoming Events", "Purpose, Mission, & Virtues", "Constitution" render a Neve "big title" block above the content: inside `.container`, `<h1>` at the h1 scale, left-aligned, color `--nv-text-color`, margin-bottom 20px, with ≈ 60px top padding on desktop (40px mobile) before the h1 and ≈ 40px before content. Home, About Us, New Member Form, and News do **not** show this block.

### 4.9 Favicons / head

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
<meta name="robots" content="max-image-preview:large">
<link rel="canonical" href="https://idssochi.org/<path>/">
<link rel="icon" href="/uploads/2025/12/cropped-Icon-32x32.png" sizes="32x32">
<link rel="icon" href="/uploads/2025/12/cropped-Icon-192x192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/uploads/2025/12/cropped-Icon-180x180.png">
<html lang="en-US">
```
Source icon: `/uploads/2025/12/cropped-Icon.png` (512×512). Generate the 32/180/192 sizes from it if the resized files are not mirrored. Add `favicon.ico` derived from the same image. Add Open Graph tags (title, type, url, image = `/uploads/2025/12/IDSSO-Logo.png` 1456×736) — not present today, harmless addition.

---

## 5. Media manifest (only files actually referenced by the site)

Mirror from `https://idssochi.org/wp-content/uploads/<path>` into `public/uploads/<path>` (same year/month folders). Normalize every `http://idssochi.org/...` and `https://idssochi.org/wp-content/uploads/...` reference in content to the relative `/uploads/...` path. Download the **original** file; generate responsive sizes with Astro `<Image>`/`<Picture>` rather than mirroring WordPress's `-300x225` variants.

| Path under `/uploads/` | Dimensions | Used where |
|---|---|---|
| `2025/12/cropped-IDSSO-Logo.png` | 200×76 | Header logo (desktop + mobile) |
| `2025/12/IDSSO-Logo.png` | 1456×736 | Logo original (OG image; also the source of the cropped logo) |
| `2025/12/cropped-Icon.png` (+ `-32x32`, `-192x192`, `-180x180`) | 512×512 | Favicons |
| `2025/12/UIC_Campus-scaled.jpg` | 2560×1706 | Home hero background |
| `2025/12/IDSSO-Logo-1125Revised-2-edited.png` | 1024×768 | New Member Form page, left column image |
| `2026/01/IDSSO-Bowling-edited.jpg` | 1211×908 | About Us "Who we are" image |
| `2026/01/IMG_6783-1.jpg` (WP serves `-1024x768` variant) | 1379×1034 | About Us navy section image |
| `2026/04/DSCF2204-1-scaled.jpeg` | 2560×1707 | About Us "See us in action" image (`alt="IDSSO event"`) |
| `2025/12/IMG_50221-1024x1019-3.jpg` | 1024×1019 | Officer photo: Grant Hauskins |
| `2026/01/IMG_8307.jpg` | 1768×2248 | Officer photo: Aleksandra Siuchta |
| `2025/12/thumbnail_Headshot1-edited.jpg` | 571×714 | Officer photo: Nabila Baklia |
| `2025/12/IMG_6769.gif` | 570×573 | Officer photo: Xavier Jalem (GIF; keep as GIF or convert to PNG, it is a still image) |
| `2026/04/Charlotte-Tran.png` | 461×461 | Officer photo: Charlotte Tran |
| `2026/04/1742164843646.jpg` | 200×200 | Officer photo: Trinity Montgomery |
| `2026/04/1706579831174.jpg` | 400×400 | Officer photo: Karen Cano |
| `2026/02/Generated-image-1.png` | 1536×1024 | Footer "UIC Connection" round badge (shown 50×50, `center/cover`) |
| `2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf` | PDF | Constitution page embed + download. **Keep this exact filename and path reachable** (linked from /nmo/ and likely from external emails). |

Everything else in the WP media library (84 items) is unused: Neve "Web Agency" demo assets from 2020, raw event photos from April 2026 (`DSCF21xx`, `IMG_08xx`, two `.mov`), unused logo variants, duplicate headshots. Do **not** mirror them into the repo. Keep a note in `CONTENT_NOTES.md` that they exist in the WP library in case the team wants a gallery later.

---

## 6. Page-by-page specification (content verbatim)

Conventions: text in code blocks or quotes is the exact copy. Keep punctuation, capitalization, curly quotes and dashes as written. "Section" = one horizontal band; "Column" = Otter column inside it. Where a WordPress color class is referenced it maps to §4.1 (`has-nv-site-bg-color` = white text, `has-neve-link-color-color` / `has-neve-link-hover-color-color` = `#2f5aae`, `has-nv-c-2-color` = `#be574b`, `has-neve-text-color-color` = `#272626`, `has-nv-light-bg-color` = `#f4f5f7`, `has-nv-dark-bg-color` = `#121212`).

### 6.1 Home — `/`

Full-width template, no page title. Body is centered content; the hero is edge-to-edge.

**Section A — Hero** (`alignfull`, 1 column, vertical-center)
* Background: `url(/uploads/2025/12/UIC_Campus-scaled.jpg) no-repeat 50% 15% / cover` (scroll, not fixed). No color overlay (overlay element is transparent).
* Padding: 80px 20px (≥960px); 40px 20px (≤960px). Inner column padding 20px, margin 20px 0. Content centered.
* `h1` — `Information and Decision Sciences Student Organization`
  * centered, 25px, weight 800, color `#ffffff`, background `rgba(0,0,0,0.79)`, border **7px solid #253b78**, padding `1.25em 2.375em`, radius 0, text-transform none.
* `h2` — `Empowering analytical leaders through community, collaboration, and more at the University of Illinois Chicago.`
  * centered, 19px, weight 500, color `#ffffff`, same dark background, border **7px solid #d50032**, padding `1.25em 2.375em`.
* Button group (centered, wraps; stacks full-width on mobile ≤600px). Four buttons, each 18px uppercase, weight 400, padding 15px 30px, white text:
  1. `Learn More` → `/about-us/` — bg `#2f5aae`, radius 0. Hover: text `#2b2b2b`, bg `#ffffff`.
  2. `Join IDSSO` → `/new-member-form/` — bg `#18191d`, radius 0. Hover: text `#000000`, bg `#ffffff`.
  3. `Upcoming events` → `/upcoming-events/` — bg `#be574b`, **pill** radius.
  4. `New Member Orientaion` → `/nmo/` — bg `#32373c`, **pill** radius. (Typo "Orientaion" is in the live site; see §12.)
  Gap between buttons ≈ 10px; group margin-top ≈ 20px.

**Section B — Quick links + "Who We Are" heading** (contained, centered)
* `h2` link: **`New Member Form`** → `/new-member-form/` — centered, bold, color `#2f5aae`, no underline.
* `h2` link: **`New Member Orientation`** → `/nmo/` — centered, bold, color `#2f5aae`.
* `h2`: `Who We Are` — centered, color `#272626`.

**Section C — Who We Are paragraph** (contained)
* `p` centered, **21px**:
  `The Information & Decision Sciences Student Organization (IDSSO) is a student-run community dedicated to empowering future leaders in Analytics, Technology, Supply Chain, Operations, and Information Systems.` `<br>` `We promote collaboration, career development, professional growth, and academic excellence within the UIC business community.`

**Section D — Join IDSSO**
* `h2` centered: `Join IDSSO`
* `p` centered, 21px: `Become part of a supportive community committed to professional development, leadership, and connecting members with opportunities in information and decision science topics.`

**Section E — Benefits of Joining**
* `h1` centered, **42px** (`has-x-large-font-size`), weight 600: `Benefits of Joining`
* Five centered `p` at 21px (each is its own paragraph; keep the leading hyphen as text, these are not list items):
  * `-Join a Growing Organization of Professionals in IDS Topics such as Information Systems, Artificial Intelligence, Supply Chain, Analytics`
  * `-Technical and Professional Development Programming`
  * `-Demonstrate and Develop Leadership`
  * `-Network with Peers and Employers`
  * `-Newsletter`
* Followed by ~2 empty paragraphs of whitespace (≈60px) before the footer. Reproduce the spacing, not the empty elements.

Vertical rhythm for B–E: standard Neve paragraph margin 30px; h2 margin-bottom 20px; the whole contained area has max-width 1170px with 15px side padding.

### 6.2 New Member Form — `/new-member-form/`

Default template with the **title hidden** (`nv-without-title`). Content in `.container` (max 748/992/1170). WP core 2-column layout (50/50 at ≥782px, stacked below), gap 2em.

* Top: `<hr>` separator, 2px solid `--nv-text-color`, full width, margin 10px 0 20px.
* **Left column**
  * `h2`: `Join the Information & Decision Sciences Student Organization (IDSSO)!` (note trailing space in source; ignore)
  * `p`: `We’re excited that you’re interested in becoming part of our community at UIC. This form helps us understand your academic background, interests, and how we can best support your growth as an analytical leader. Whether you’re passionate about data, supply chain, programming, AI, problem solving, or professional development, IDSSO offers opportunities to connect, learn, and get involved.`
  * Image: `/uploads/2025/12/IDSSO-Logo-1125Revised-2-edited.png` (1024×768), full column width, `alt=""`.
* **Right column**
  * `p`: `Complete the form below to join our mailing list, receive event updates, and access opportunities for leadership and involvement within the organization.`
  * **Form** (see §10.1 for the submission backend). Fields in order; `*` = required:
    1. `Name` * — text
    2. `UIC Email` * — email
    3. `Major` * — select: `Information and Decision Sciences`, `Accounting`, `Marketing`, `Business Admin`, `Finance`, `Computer Science`, `Engineering`, `Economics`, `Other`
    4. `Year in School` * — select: `Freshman`, `Sophomore`, `Junior`, `Senior`, `Graduate`
    5. `Interests` — checkboxes (multi): `Analytics & Data`, `Supply Chain & Operations`, `Information Systems`, `Programming (Python/SQL/Java)`, `AI / Machine Learning`, `Networking & Professional Development`, `Leadership Roles`, `Social Events`
    6. `Are you interested in volunteer/leadership opportunities?` — radio, inline: `Yes` / `No`
    7. Submit button: `Submit` (wp-default variant)
    Plus a honeypot checkbox (hidden) for spam, mirroring Otter's `o-anti-bot`.
  * Field styling: label 15–17px regular above the control, gap 10px; inputs/selects 1px solid `--nv-text-color`, radius 4px, padding 8px, height 42px, transparent background, full width; checkbox/radio rows stacked (radios inline for Q6); 16px gap between fields.

### 6.3 Upcoming Events — `/upcoming-events/`

Default template **with** page title block (`Upcoming Events`). Content in `.container`. Single column containing an Otter **Timeline** (vertical, left markers). Data lives in `src/data/events.yaml`; component renders one item per event.

Timeline rendering:
* Root: `position: relative; max-width: 1200px`. A vertical 2px line in `#e0e0e0` runs down the left (x ≈ 14px) behind the markers.
* Each item: `.container { position: relative; padding: 10px 25px 10px 70px }`.
* Marker: absolute, left ≈ -6px, top 15px, 40×40 circle, background `#ffffff`, **4px solid #e0e0e0** border, radius 50%, containing a 20px filled circle in `#e0e0e0` (replace Font Awesome `fa-circle` with an inline SVG or `::after` disc).
* Content card: background `#ecf0f1`, radius 8px, padding 20px, box-shadow `0 2px 4px rgba(0,0,0,.1)`, margin-bottom ≈ 20px.
* Inside each card: `h2` date (color `#2f5aae`), `h3` title (color `#be574b`), `h4` 16px subtitle, paragraphs, button.

Events (verbatim):

1. `h2` `April 25` · `h3` `IDS in Focus Capstone Competition` · `h4` `Spring Flagship Event`
   `p`: `Teams present AI-enabled information sciences solutions to corporate judges. Network with industry leaders, showcase your work, and compete for prizes. Includes breakfast and career conversations.`
   `p`: **`Time:`** ` 9:30 AM–4:00 PM` `<br>` **`Location:`** ` Student Center East`
   Button `Register` → `https://cglink.me/2gA/r2270818` (timeline variant)
2. `h2` `May 1` · `h3` `IDSSO Improv` · `h4` `Facilitator Led Workshop`
   `p`: **`Time:`** ` 1:00 PM – 3:00 PM` `<br>` **`Location:`** ` EMTSW`
   `p`: `Participants build their professional presence and form stronger connections with one another in this fun and constructive session.`
   Button `Register` → `https://cglink.me/2gA/r2270818`

Note the paragraph order differs between the two items (details then time, vs time then details). Preserve per item. Both register links are identical on the live site.

`events.yaml` schema: `date_label, title, subtitle, time, location, description, description_position (before|after), register_url, register_label`.

### 6.4 About Us — `/about-us/`

Full-width template, no page title block. Sections top to bottom (all content max-width 1170px, centered; "full" = background bleeds edge-to-edge, "wide" = background limited to the 1170px box):

**A. Title strip** (full, bg `#ffffff`, padding 0 20px, margin -10px 0 → effectively flush)
* `h1` `About Us` — left-aligned, standard h1 scale. (Mobile: padding 20px, margin-bottom 25px.)

**B. Who we are** (wide, bg `#eef0ed`, padding 0 20px 80px; 2 columns 50/50, vertically centered; stack <960px with 40px → 20px padding)
* Col 1: image `/uploads/2026/01/IDSSO-Bowling-edited.jpg`, full width, no padding.
* Col 2 (padding 40px): `h2` `Who we are`; `p` `The Information and Decision Sciences Student Organization at UIC is **an inclusive, cross-disciplinary community** that develops analytical leaders and collaborative problem solvers through hands-on learning, professional development, industry engagement, and mentorship.`

**C. Purpose/mission statement** (full, bg **`#001e62`**, padding 80px 20px; 2 columns 50/50, vertically centered)
* Col 1 (padding 40px): `h2` white: `We achieve our objectives through our purpose, mission, vision, and virtues`
  `p` white: `The Information and Decision Sciences Student Organization is an inclusive community of students committed to personal and professional growth. We develop analytical leaders with the mindset, skills, and perspective to turn insight into outcomes.`
  `p` (no explicit color class in source; on the navy background it must render white — Neve inherits `--nv-text-dark-bg` inside `.has-dark-bg`): `Our virtues form a shared code that unites our members. We recognize how this code leads us to achieve our objectives and supports each member in realizing their full potential.`
  Button `Our Virtues` → `/purpose-mission-vision-virtues/` — neve-primary variant, bg `#d50032`, text `#f2f7eb`.
* Col 2: image `/uploads/2026/01/IMG_6783-1.jpg` (use the 1024×768 rendition or responsive), full width.

**D. See us in action** (wide, bg `#eef0ed`, padding 0 20px 80px; 2 columns)
* Col 1 (padding 40px): `h2` `See us in action`; `p` `From certification panels and AI workshops to case competitions and social events, IDSSO creates hands-on opportunities for students to build skills, grow their networks, and put what they learn into practice.`
  Buttons row (gap 0.5em): `Upcoming Events` → `/upcoming-events/` (neve-primary, bg `#d50032`, text `#f2f7eb`); `Latest News` → `/news/` (wp-outline, `#001e62`).
* Col 2: image `/uploads/2026/04/DSCF2204-1-scaled.jpeg`, `alt="IDSSO event"`.

**E. Executive Board heading** (wide, bg `#ffffff`, padding 60px 20px 20px; tablet 40/20, mobile 30/10)
* `h2` centered, color `#001e62`: `Executive Board`
* `p` centered, color `#555555`: `The officers who lead IDSSO and serve our community.`

**F. Officer rows** ×7 (wide; each row: padding 40px 20px (tablet 30, mobile 20), 2 columns **30% / 70%**, vertically centered, bottom border 1px solid `#e0e0e0` except the last row; backgrounds alternate `#ffffff`, `#f5f5f5`, `#ffffff`, `#f5f5f5`, `#ffffff`, `#f5f5f5`, `#ffffff`)
* Photo column: circular image (`border-radius: 9999px`, WP "rounded" style), rendered at WP "medium" size (≈300px wide), `alt` = officer name. Row 6 (Trinity) has extra CSS: `aspect-ratio: 1/1; object-fit: cover; width: 100%; max-width: 300px` — apply this to **all** officer photos for consistency (safe improvement; the others are already square).
* Info column (padding 20px 20px 20px 30px; mobile 10px 0):
  * `h3` name — color `#001e62`, **28px**
  * `p` role — color `#d50032`, 16px, weight 600, letter-spacing 0.5px, uppercase, margin 0 0 16px
  * bio paragraphs — line-height 1.5, margin-bottom 8px
  * social icons row, WP "logos only" style (no circles, 24×24 glyphs, gap 12px): LinkedIn glyph in brand blue `#0d66c2`; Mail and the generic link glyph in text color `#272626`. Items: LinkedIn, Mail, and (Grant only) a generic chain-link icon → personal site.

Officer data (`officers.yaml`), verbatim:

1. **Grant Hauskins** — `President` — photo `2025/12/IMG_50221-1024x1019-3.jpg`
   * `Hi, I’m Grant Hauskins. I’m the President of IDSSO and a student in the IDS program at UIC. I’m helping lead IDSSO as we build a practical and welcoming community where students can develop professionally, connect with one another, and explore the various pathways within IDS—across Business Analytics, MIS, AI, and Supply Chain & Operations.`
   * `This year, my priority is creating more space for others to step up, contribute, and lead. If you’d like to get involved or are unsure where to start, please don’t hesitate to connect with me.`
   * Links: LinkedIn `https://www.linkedin.com/in/granthauskins` · Mail `mailto:ghaus@uic.edu` · Link `https://grant.hauskins.com`
2. **Aleksandra Siuchta** — `Vice President` — photo `2026/01/IMG_8307.jpg`
   * `Hello, I’m Aleksandra, and I am a senior undergraduate majoring in Information and Decision Sciences with a concentration in Business Analytics. I am passionate about building effective processes and using data analysis to make decisions, and I am excited to apply these skills to further IDSSO’s mission.`
   * `Over the coming months, I hope to leave behind a solid foundation and a lasting community that will continue to create valuable opportunities for UIC students both this year and well into the future.`
   * `Please feel free to reach out to me or any member of our team if you have questions about IDSSO or how to get involved.`
   * Links: LinkedIn `https://www.linkedin.com/in/aleksandra-s-03825b292/` · Mail `mailto:asiuc@uic.edu`
3. **Nabila Baklia** — `Secretary` — photo `2025/12/thumbnail_Headshot1-edited.jpg`
   * `Hi, I’m Nabila! I’m a Senior, IDS major, with a concentration in Business Analytics. I joined IDSSO to further my professional development, and to help create opportunities for IDS students to learn more about their major and the different pathways they can explore. I’m also passionate about helping UIC Business students understand how IDS connects to essential business functions across their majors.`
   * `During this semester, I aim to create a supportive space for UIC Business students to grow their network, learn what it means to be a professional and leader, and make strides in their goals.`
   * `Please feel free to reach out if you’d like to connect!`
   * Links: LinkedIn `https://www.linkedin.com/in/nabila-baklia-7a7654283/` · Mail `mailto:nbakl@uic.edu`
4. **Xavier Jalem** — `Treasurer` — photo `2025/12/IMG_6769.gif`
   * `My name is Xavier, and I’m a senior, majoring in IDS, with a concentration in MIS. I joined IDSSO to help procure an environment that fosters growth and community. Additionally, I wanted to help underclassmen find a place where they can connect with others who share their interest in what IDS has to offer. We can all achieve more by working together and lifting each other up. When I was an underclassman, I longed for a place to share my passion for my major. Although I was unable to find it, I take pleasure in the opportunity to bring it to someone else.`
   * `Over the next year, I aim to bring to life what I was looking for in the past. I want to help make IDS and the business world more approachable for everyone.`
   * `My line is always open to anyone seeking advice, learning, or direction. Please never hesitate to reach out. I am more than willing to help fellow students!`
   * Links: LinkedIn `https://www.linkedin.com/in/xavier-jalem/` · Mail `mailto:xjale2@uic.edu`
5. **Charlotte Tran** — `Director of Marketing` — photo `2026/04/Charlotte-Tran.png`
   * `Bio coming soon`
   * Links: LinkedIn `https://www.linkedin.com/in/charlotte-t-tran-43355b380/` · Mail `mailto:ttran265@uic.edu`
6. **Trinity Montgomery** — `Director of External Affairs` — photo `2026/04/1742164843646.jpg`
   * `Bio coming soon`
   * Links: LinkedIn `https://www.linkedin.com/in/trinity-montgomery/` · Mail `mailto:tmont@uic.edu`
7. **Karen Cano** — `Director of Membership Development` — photo `2026/04/1706579831174.jpg`
   * `Bio coming soon`
   * Links: LinkedIn `https://www.linkedin.com/in/karen-cano-romero/` · Mail `mailto:kcano8@uic.edu`

### 6.5 News — `/news/`

This is the WordPress "posts page" rendered by Neve's blog archive in the **"alternative" list layout**, full width (no sidebar), no page title, no thumbnails (posts have no featured images). Inside `.container`:

For each post, newest first:
```html
<article class="post">
  <h2 class="entry-title is-h4"><a href="/{slug}/">{title}</a></h2>     <!-- styled at h4 size (24px desktop), weight 600 -->
  <ul class="meta"><li>by <a href="/news/">IDSSO Admins</a></li></ul>   <!-- 13–15px, muted; author link may point to /news/ -->
  <div class="excerpt"><p>{first ~40 words of the post}…</p></div>
</article>
```
Separation between articles ≈ 40px. Excerpts are auto-generated (first 40 words + `…`); generate them from the post body at build time, or store `excerpt` in frontmatter with the text below.

Live excerpts (for parity):
* Post 1: `Chicago, IL — The Information and Decision Sciences Student Organization at the University of Illinois Chicago is pleased to announce the results of its recent executive board election for the upcoming academic term, pending final certification from our faculty advisor. The following students have been…`
* Post 2: `CHICAGO, IL — January 19, 2026 — The Information and Decision Sciences Student Organization (IDSSO) has been officially recognized as a Registered Student Organization at the University of Illinois Chicago. This milestone formalizes IDSSO’s presence on campus and strengthens its ability to deliver consistent programming,…`

### 6.6 Purpose, Mission, & Virtues — `/purpose-mission-vision-virtues/`

Default template **with** page title block: `Purpose, Mission, & Virtues` (strip the invisible U+200E prefix). Content in `.container`. Sections separated by a **wide separator**: `<hr>` full width, 2px, color `#2f5aae` (`has-neve-link-hover-color`), opacity 1, margin ≈ 30px 0.

**Purpose**
* `h2` centered: `Purpose`
* Quote block (Otter Advanced Columns, full-bleed background white, inner max 1140px, padding 0 24px; tablet 64px 24px; mobile 40px):
  * `p` centered, **italic, 28px** (tablet 40px, mobile 32px), background white, text color `--nv-text-color`:
    `“To foster an inclusive, cross-disciplinary community that empowers students to grow as analytical leaders and collaborative problem solvers”`
  * `p` centered, **uppercase, 18px** (≤960px: 12px), bold: `Information and decision sciences student organization Constitution`
* `h4` centered: `IDSSO supports students in realizing their full potential as emerging professionals in an increasingly data-driven world.`
* `p`: `We are an inclusive, cross-disciplinary community where students develop into analytical leaders and collaborative problem solvers—growing not only in technical and decision-making skills, but also in confidence, perspective, and professional identity necessary to succeed in complex organizations.`
* `p`: `We believe that professional development is not limited to coursework or credentials. It is about helping students develop the skills to think critically, collaborate with others, and present themselves as professionals. Through shared learning, meaningful engagement, and peer-driven leadership, members gain clarity about their interests, strengths, and career direction.`
* `p`: `Our purpose is simple: to help students grow with intention—so they are prepared not just to enter the workforce, but to contribute thoughtfully and responsibly wherever their paths lead.`
* `<hr>`

**Mission**
* `h2` centered: `Mission`
* `<blockquote>` WP "large" style (bigger text ≈ 1.25em, left border none, italic off, cite small):
  `The mission of IDSSO is to provide students with hands-on learning opportunities, professional development programming, industry engagement, and collaborative projects that strengthen analytical, technical, and decision-making skills. IDSSO serves all UIC students interested in Information and Decision Science topics by offering workshops, networking events, panel discussions, mentorship, and leadership opportunities that support academic and career success.`
  `<cite>Information and Decision Sciences Student Organization Constitution</cite>`
* `<hr>`

**Vision**
* `h2` centered: `Vision`
* `h4` (left): `What We Are Building`
* `p`: `The Information and Decision Sciences Student Organization envisions a student-led community that becomes a recognized center for learning, leadership, and professional development in Information and Decision Sciences at UIC and across the Chicago region.`
* `p`: `We envision a future where our members are actively exploring and developing a deep understanding of IDS topics—such as analytics, information systems, artificial intelligence, and operations management—while also cultivating the professional skills that define effective leaders: communication, collaboration, judgment, and accountability.`
* `p`: `Our vision is for IDSSO members to drive their own development. They will conceptualize and execute significant initiatives, host conferences and networking events, forge strategic partnerships, and cultivate opportunities that bolster both individual members and the wider campus community. IDSSO will serve as a platform where students develop not only problem-solving acumen but also essential leadership skills for managing people and projects.`
* `p`: `Beyond campus, IDSSO fosters lasting relationships with alumni, industry partners, and organizations that value thoughtful and capable talent. These partnerships create opportunities for mentorship, experiential learning, and real-world exposure—while positioning IDSSO members as professionals organizations want to recruit.`
* `p`: **`Our long-term aspiration is to be known for the quality of our people.`** `<br>` `Graduates of the IDSSO community are recognized not only for their technical knowledge and understanding but also for their professionalism, maturity, and ability to work effectively across disciplines.`
* `<hr>`

**Virtues**
* `h2` centered: `Virtues`
* `p` centered: `IDSSO is united by members’ adherence to six core virtues:`
* Six **flip cards**, each full content width, separated by `<hr>` (the wide 2px `#2f5aae` rule) after every card including the last.

Flip card spec (Otter "Flip" block, animation `flipX-rev`):
* Container: `perspective: 1000px`, height **240px** on desktop/tablet; mobile (≤600px) heights per card: 400, 440, 500, 500, 450, 500px (text needs the room). Padding 20px (cards 1–2), 0 (others) — treat as 20px for all.
* Front and back faces: absolute, full size, `backface-visibility: hidden`, radius **10px**, background `linear-gradient(135deg, #020381 0%, #2874fc 100%)`, content vertically and horizontally centered, text-align center, white text.
* Inner wrapper: `transform-style: preserve-3d; transition: transform 0.8s`. Back face pre-rotated `rotateX(180deg)`; on hover (desktop) or tap (touch; toggle a class) the inner rotates `rotateX(-180deg)` (the "rev" variant flips upward).
* Front: `h3` **32px** weight 600 + `p` **24px** (bold lead line, `<br>`, normal body). Back: `h2` `In practice:` (bold, white) + `h4` (bold, white or `#f4f5f7`).
* Note the live site has some mixed white shades inside the text (`#ffffff`, `#fbf9f9`, `#f4f5f7`) from editor artifacts; render all card text white.

Cards (front h3 / front p / back h4), verbatim:

1. `Open-Mindedness` / **`Seeking Understanding Before Judgment:`** `<br>` `We approach people, ideas, and problems with curiosity and respect. An open mind allows data, dialogue, and diverse perspectives to shape stronger decisions.` / `We listen actively, invite perspectives across disciplines, and challenge assumptions through respectful debate.`
2. `Informed Perspective` / **`Thinking with Evidence and Intent`** `<br>` `We make decisions grounded in data, reason, and context. An informed perspective means engaging critically with information and applying it responsibly.` / `We verify facts, cite sources, ask “What do we know—and how do we know it?”, and treat uncertainty as part of analysis.`
3. `Constructive Collaboration` / **`Building Together, Not Just Working Together`** `<br>` `We collaborate to create outcomes, not to comply. Constructive collaboration combines skills, data, and insight to produce results greater than what any individual could achieve alone.` / `We share credit, offer actionable feedback, bridge functional divides, and prioritize tangible progress.`
4. `Continuous Development` / **`Committing to Learning and Improvement`** `<br>` `We believe growth is a discipline. Continuous development reflects our commitment to evolving skill, judgment, and understanding through curiosity and consistent improvement.` / `We pursue learning opportunities, seek and provide feedback, reflect on mistakes, mentor peers, and translate new knowledge into action—supported by regular structures for organizational improvement.`
5. `Accountability` / **`Owning Outcomes Individually and Collectively`** `<br>` `We honor commitments, measure results, and learn from the impact of our actions. Accountability protects our standards and strengthens our culture.` / `We set clear expectations, follow through, communicate early, and use outcomes to improve.`
6. `Social Responsibility` / **`Giving Back to Our Community`** `<br>` `We recognize our responsibility to uplift the communities that support us. We seek opportunities to make a positive impact through service, philanthropy, and sharing our expertise.` / `We volunteer, partner with community organizations, support charitable initiatives, raise funds for scholarships, and apply our skills for the public good.`

Store these in `src/data/virtues.yaml` (`title, lead, body, practice, mobile_height`).

### 6.7 Constitution — `/constitution/`

Default template **with** page title block: `Constitution`. Content in `.container`, WP core **File** block:

```html
<div class="file-block">
  <object data="/uploads/2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf"
          type="application/pdf" style="width:100%;height:1100px"
          aria-label="Embed of IDSSO Constitution -December 15 Final Formatted Version."></object>
  <a href="/uploads/2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf">IDSSO Constitution -December 15 Final Formatted Version</a>
  <a class="btn wp-default" href="/uploads/2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf" download>Download</a>
</div>
```
Row below the embed: link text left, `Download` button (wp-default variant) inline right of it, margin-top 8px. On browsers without inline PDF support (iOS Safari) WordPress hides the `<object>`; reproduce with a small script or `<object>` fallback content showing the link only.

### 6.8 Single post layout (both news posts)

Body class `single-post`, **right sidebar** layout at ≥960px: content column `70%`, sidebar `30%`, inside `.container` (1170px). Below 960px the sidebar stacks under the content.

* Entry header: `h1.title` (h1 scale), then meta list: `by IDSSO Admins` (author link → `/news/`; original pointed to `/author/idsso-admins/`). No date is displayed on the live site (Neve meta shows author only). Keep it that way.
* Content: Markdown-rendered body with Neve typography; `h3` 20px/600; `h2` 50px/600; lists with standard bullets; `<hr>` separators thin `--nv-text-color` 2px? (core separator with alpha opacity; use 1px solid rgba(39,38,38,.4)).
* **Comments:** the live site shows a "Leave a Reply" form. **Omit** (no backend; see §10.2).
* **Sidebar** (`<aside>`), widgets in order, each with a widget title (h4-ish, 20px/700) and 30px spacing:
  1. `Search` — omit or implement client-side (§10.3). Default: omit.
  2. `Recent Posts` — `<ul>` of all post titles linking to their URLs (newest first).
  3. `Recent Comments` — shows "No comments to show." on live. Omit.
  With 1 and 3 removed the sidebar holds only Recent Posts; keep the 70/30 layout so the page still matches.

---

## 7. News posts (full content, verbatim)

Store as `src/content/news/<slug>.md` with frontmatter `title`, `date` (ISO), `author: "IDSSO Admins"`, `slug`. Render at `/{slug}/`.

### 7.1 `idsso-announces-incoming-executive-board-for-the-2026-2027-term`
* title: `IDSSO Announces Incoming Executive Board for the 2026–2027 Term` (en dash between years)
* date: `2026-03-17T01:36:28` (site timezone)

```markdown
Chicago, IL — The Information and Decision Sciences Student Organization at the University of Illinois Chicago is pleased to announce the results of its recent executive board election for the upcoming academic term, pending final certification from our faculty advisor.

The following students have been elected to serve as the incoming IDSSO Executive Board:

- **President:** Trinity Montgomery
- **Vice President:** Karen Cano
- **Treasurer:** Edgar Velasquez
- **Secretary:** Levi Atang
- **Director of Membership Development:** Damian Dziekonski
- **Director of Marketing:** Charlotte Tran
- **Director of External Affairs:** Simran Juneja

IDSSO congratulates each of these student leaders on their election and thanks all candidates and members who participated in the election process. Their willingness to serve reflects a shared commitment to building a strong, inclusive, and action-oriented organization that develops students as analytical, collaborative leaders.

As the organization looks ahead, the incoming Executive Board will work alongside the outgoing board during the transition period to review ongoing initiatives, organizational priorities, and responsibilities for the coming year. This transition process will help ensure continuity, strong leadership development, and momentum as IDSSO continues to grow its programming, partnerships, and impact across the UIC community.

IDSSO remains committed to fostering an inclusive, cross-disciplinary community that equips students with hands-on learning opportunities, professional development, industry engagement, and leadership experience in Information and Decision Sciences.

For questions regarding the transition process or the incoming board, please contact:

**Grant Hauskins**  
President, Information and Decision Sciences Student Organization  
University of Illinois Chicago  
ghaus@uic.edu
```

### 7.2 `information-and-decision-sciences-student-organization-recognized-as-a-registered-student-organization-at-uic`
* title: `Information and Decision Sciences Student Organization Recognized as a Registered Student Organization at UIC`
* date: `2026-01-19T21:04:50`

```markdown
**CHICAGO, IL — January 19, 2026** — The Information and Decision Sciences Student Organization (IDSSO) has been officially recognized as a Registered Student Organization at the University of Illinois Chicago. This milestone formalizes IDSSO’s presence on campus and strengthens its ability to deliver consistent programming, expand partnerships, and support student development.

“Today’s recognition reflects a shared effort. IDSSO exists because students stepped up early, contributed their time and ideas, and kept building when it was still just a vision,” said **Grant Hauskins, President of IDSSO**. “I’m grateful to our officers, members, advisors, and supporters for co-creating a community that will keep serving UIC students.”

### What this means

With RSO status, IDSSO can more effectively coordinate student engagement and deliver structured initiatives that help members build both technical capability and professional presence. IDSSO will begin hosting programming at UIC to support students who want to strengthen their real-world decision-making through analytics, judgment, and collaboration.

### For UIC students

IDSSO is open to **UIC students of all majors** who want to develop as **analytical, collaborative leaders**. Members can expect opportunities such as workshops, guest speakers, mentorship, and community-based learning that help students build skills, relationships, and confidence for careers in data-driven environments.

### For faculty, academics, and industry professionals

IDSSO welcomes partnerships that support UIC’s next generation of IDS talent. Faculty and professionals interested in contributing can participate through guest speaking, workshop facilitation, mentorship, or advisement — and by connecting IDSSO to broader academic and industry networks.

### Get involved

UIC students interested in joining can get started at **[https://idssochi.org](https://idssochi.org)**. Opportunities to participate are available for both new and experienced members, including pathways to contribute on projects, events, and leadership initiatives.

---

## About IDSSO

The Information and Decision Sciences Student Organization (IDSSO) is UIC’s community for students who want to improve how decisions are made in the real world. IDSSO develops members professionally as analytical, collaborative leaders by strengthening their technical understanding, communication, leadership, and adherence to responsible professional standards.

**Website:** https://idssochi.org  
**Contact:** eboard@idssochi.org  
**Media / Partnerships:** [IDSSO Media & Partnership Interest Form – Fill out form](https://forms.office.com/r/BQfqFgdW0b)
```

---

## 8. Shared behaviors

* **Lazy loading:** use native `loading="lazy"` on all images below the fold; hero background is CSS, not lazy. The header logo is eager (`skip-lazy` on live).
* **Links:** internal links relative with trailing slash. External links in content do **not** open in new tabs (live behavior) except footer social icons (`target="_blank"`).
* **Scroll behavior:** `html { scroll-behavior: smooth }` acceptable; "Skip to content" targets `#content` on `<main>`.
* **Accessibility baseline:** one `<h1>` per page (Home has two `h1`s on the live site: hero + "Benefits of Joining"; keep the visual size but you may demote "Benefits of Joining" to an `h2` styled at 42px. Record this in `CONTENT_NOTES.md`), visible focus rings, `aria-expanded` on the nav toggle, labels on all form controls.
* **No tracking/analytics** on the live site. Do not add any.
* **404 page:** Neve default. `h1` `Oops!` is not present; the live 404 shows: `It seems we can’t find what you’re looking for. Perhaps searching can help.` followed by a search form. Build `404.astro` with that sentence plus links to Home and News instead of the search box.

---

## 9. `/nmo/` — New Member Orientation mini-site (copy verbatim)

Standalone, hand-coded Bootstrap 3.3.7 site living beside WordPress. It is **already static**. Mirror it into `public/nmo/` exactly, preserving filenames (including spaces, e.g. `IDSSO Logo.png`) and directory-style URLs.

Pages (each is `…/index.html`):

| URL | `<title>` |
|---|---|
| `/nmo/` | `Home | IDSSO Orientation` |
| `/nmo/our-team/` | `Meet the Team | IDSSO Orientation` |
| `/nmo/about-idsso/` | `About IDSSO | IDSSO Orientation` |
| `/nmo/conduct-and-standards/` | `Conduct & Standards | IDSSO Orientation` |
| `/nmo/membership-benefits/` | `Membership Benefits | IDSSO Orientation` |
| `/nmo/leadership-and-involvement/` | `Leadership & Involvement | IDSSO Orientation` |
| `/nmo/our-constitution/` | `Constitution and Election Guide | IDSSO Orientation` |
| `/nmo/getting-started/` | `Getting Started | IDSSO Orientation` |

Local assets referenced (all under `/nmo/`): `bootstrap.min.css`, `portalbasictheme.css`, `theme.css`, `orientation-progress.css`, `orientation-pages.css`, `orientation-progress.js`, `committee-match.js`, and images: `IDSSO Logo.png`, `Board-Of-Directors-outline.png`, `Crown-outline.png`, `Group-outline.png`, `IMG50221-1024x1019.jpg`, `IMG8307.JPG`, `thumbnailHeadshot1.jpg`, `IMG6769.gif`, `Charlotte Tran.png`, `Trinity Montgomery.png`, `LundquistDoug2018.png`, `Picture1.png`, `Picture2.png`, `Picture3.png`, `Crane-outline.png`, `Bug-under-magnifying-glass-with-solid-fill.png`, `Head-with-gears-with-solid-fill.png`, `Marketing-with-solid-fill.png`, `Connections-outline.png`, `Employee-badge-with-solid-fill.png`, `Scales-of-justice-with-solid-fill.png`, `Eyes-with-solid-fill.png`, `Handshake-with-solid-fill.png`, `Arrow-circle-outline.png`, `Checklist-with-solid-fill.png`, `Group-with-solid-fill.png`, `Checkmark-with-solid-fill.png`, `Meeting-with-solid-fill.png`, `Chat-outline.png`, `Clipboard-with-solid-fill.png`, `Handshake-outline.png`, `Briefcase-outline.png`, `Classroom-with-solid-fill.png`, `Production-outline.png`, `IDSSO-Bowling-edited.jpg`, `IMG6783.jpg`. Run a link checker after mirroring to catch any asset this list missed.

External dependencies it loads (leave as-is): `https://code.jquery.com/jquery-3.6.0.min.js`, `https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js`, one image from `cdn.hubblecontent.osi.office.net` on the home page.

External links it contains (leave as-is): the Google Form (orientation completion), two Microsoft Teams channel deep links, `https://idssochi.org/constitution/` (keep absolute or make relative), officers' LinkedIn URLs, `https://grant.hauskins.com`. The 7-page progress tracker (`orientation-progress.js`) uses browser storage; it needs no server.

How to mirror: `wget --mirror --no-parent --page-requisites --adjust-extension --convert-links=off https://idssochi.org/nmo/` then verify every URL above returns 200 locally. Do not reformat or "modernize" these files; the only permitted edit is making the `/constitution/` link relative.

Treat `/nmo/` as a frozen artifact owned by the New Member Orientation Committee. Any future redesign of it is out of scope for this rebuild.

---

## 10. WordPress behaviors that need static replacements

### 10.1 New Member Form submission (required)

Today the Otter Forms block POSTs to the WordPress REST API, which emails the submission to the board. A static site has no backend, so the form needs an endpoint.

**Implementation contract:**
* Render the exact fields from §6.2 as a normal `<form method="POST" action={FORM_ENDPOINT}>` with `name` attributes: `name`, `email`, `major`, `year`, `interests[]`, `leadership_interest`, plus honeypot `_gotcha` (hidden, must stay empty) and a hidden `_subject` = `New IDSSO Member Form Submission`.
* `FORM_ENDPOINT` comes from an env var `PUBLIC_FORM_ENDPOINT` read at build time. If it is **unset**, render the form disabled with a notice: `Form temporarily unavailable — email eboard@idssochi.org to join.` Never fake a success state.
* On success, redirect to `/new-member-form/?submitted=1` and show `Thank you! You’re on the list.` (client-side check of the query param). On error, show the provider's message.
* Default provider (recommended): **Formspree** or **Web3Forms** (free tier, no code, submissions emailed to `eboard@idssochi.org`, spam filtering, exports to CSV). Both accept the plain HTML POST above. Alternative if the team wants zero third parties: a **Cloudflare Pages Function** at `/api/member-form` that validates, then forwards via Resend (needs an API key and a verified sending domain) or appends to a Google Sheet via Apps Script. Build the Formspree/Web3Forms path first; leave a stub `functions/api/member-form.ts` with a TODO only if the team picks the Cloudflare route.
* Document in `README.md` how to rotate the endpoint and where submissions land.

### 10.2 Comments
Both posts show a WordPress comment form with zero comments. Drop comments entirely. Do not embed Disqus/Giscus unless asked.

### 10.3 Search (404 page + post sidebar)
Drop the search box. If search is wanted later, Pagefind (static index generated at build) is the fit; not in scope now.

### 10.4 Redirects and legacy URLs (`public/_redirects`, Cloudflare Pages syntax)

```
/wp-content/uploads/*   /uploads/:splat            301
/author/*               /news/                     301
/category/*             /news/                     301
/feed                   /news/                     301
/feed/*                 /news/                     301
/wp-json/*              /                          301
/wp-admin/*             /                          302
/wp-login.php           /                          302
/?p=*                   /                          301
/web-agency-gb-home/    /                          301
```
If deploying to **GitHub Pages** instead: it has no server-side redirects. In that case keep media at `public/wp-content/uploads/...` (serve the original paths) and skip the rest of the table; add `<meta http-equiv="refresh">` stubs only for `/web-agency-gb-home/`.

### 10.5 Things to deliberately NOT carry over
WordPress emoji script, `wp-embed`, lazysizes, SG Optimizer, Font Awesome, jQuery (outside `/nmo/`), RSS feeds, `xmlrpc`, the `wp-json` API, author/category archives, the WP comment cookie-consent checkbox.

---

## 11. Build, deploy, and cutover

### 11.1 Project config
```js
// astro.config.mjs
export default defineConfig({
  site: 'https://idssochi.org',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],      // @astrojs/sitemap
});
```
`npm run build` → `dist/`. Commit a `.nvmrc` (Node 20) and a lockfile. Add `npm run check` (astro check) and a link checker (`lychee` or `linkinator`) to CI.

### 11.2 Cloudflare Pages (primary)
1. Create project → connect the GitHub repo → framework preset **Astro**; build command `npm run build`; output `dist`; Node version `20`.
2. Environment variable `PUBLIC_FORM_ENDPOINT` (production + preview).
3. Custom domains: `idssochi.org` and `www.idssochi.org` (www → apex redirect via Bulk Redirect or `_redirects` on the www project).
4. Every PR gets a preview URL; `main` deploys production. Protect `main` with required PR review.

### 11.3 GitHub Pages (fallback)
`.github/workflows/deploy.yml` using `withastro/action@v3` + `actions/deploy-pages@v4`; `public/CNAME` = `idssochi.org`; set `site` as above (no `base`). Enforce HTTPS in repo settings.

### 11.4 DNS cutover (do with the team, not unilaterally)
* Before: lower TTLs on `idssochi.org` A/CNAME to 300s; **inventory MX/TXT (SPF, DKIM, DMARC) records** — `eboard@idssochi.org` and the officer mail must keep working. Only the web records change.
* Verify parity on the preview URL with the §13 checklist.
* Cut: point apex + www at Cloudflare Pages (or GitHub Pages IPs/CNAME). Keep SiteGround up read-only for 30 days as a rollback.
* After: confirm `https://idssochi.org/wp-content/uploads/2025/12/IDSSO-Constitution-December-15-Final-Formatted-Version.pdf` still resolves (redirect), confirm `/nmo/` progress tracker works, submit a test member form.
* Then: export WordPress (Tools → Export, all content) and the `wp-content/uploads` folder into `archive/` in the repo (or a release asset) as the historical record, and cancel SiteGround when the team is ready.

---

## 12. Content notes and approved deviations

Record every deviation from the live site in `CONTENT_NOTES.md`. Pre-approved by the site owner (apply these):

| # | Live site | Action |
|---|---|---|
| 1 | Menu label prefixed with 7 invisible U+200E chars | Strip; hard-code menu order |
| 2 | Mixed `http://` / `https://` and absolute media URLs | Normalize to relative `/uploads/...` |
| 3 | Officer photo CSS fix applied only to row 6 | Apply square-crop rule to all officer photos |
| 4 | Two `<h1>` on Home | Keep visual; semantic demotion of "Benefits of Joining" allowed |
| 5 | Comment form, search widget, "Recent Comments" | Remove (§10) |
| 6 | Threads URL carries a tracking query string | Keep as-is (owner's link) |

**Flagged, NOT fixed — ask the owner (default: preserve verbatim):**
* Hero button `New Member Orientaion` (typo for "Orientation").
* Home "Benefits of Joining" items begin with a bare hyphen as text rather than a list.
* New Member Form heading has a trailing space; "Business Admin" option label.
* Purpose quote sub-line: `Information and decision sciences student organization Constitution` (lowercase, rendered uppercase by CSS).
* Officers 5–7 have `Bio coming soon`; the March 17 post announces a *new* board for 2026–2027 while About Us still shows the current board. Leave both as published; the team will update `officers.yaml` when the transition completes.
* Upcoming Events lists April 25 and May 1 with no year; both "Register" links are identical. Preserve.
* Meta descriptions do not exist. You may add one per page using the first paragraph of that page; mark as addition.

---

## 13. Acceptance checklist (run before declaring done)

**Parity**
- [ ] Every URL in §2 returns 200 with trailing slash; non-slash variant redirects.
- [ ] Side-by-side screenshots vs live at 390px, 768px, 1024px, 1440px, 1920px for all 7 pages + 2 posts: same section order, same copy, same colors (spot-check hex with a picker), same breakpoints (desktop nav appears at 960px; columns stack at 782px/960px per block).
- [ ] Header: logo links home; 7 menu items in the stated order; hover color `#faae48`; mobile panel slides from left, closes on overlay/X, traps nothing.
- [ ] Footer: 3 columns, 7 links, 6 social items with correct hrefs and colors; "UIC Connection" badge shows the image.
- [ ] Hero background image renders at `50% 15%` cover; the two bordered boxes and four buttons match §6.1.
- [ ] Upcoming Events timeline: 2 cards, markers, line, button styles.
- [ ] Virtues: 6 flip cards flip on hover and on tap; separators present.
- [ ] About Us: 7 officer rows alternate white/`#f5f5f5`, circular photos, correct links.
- [ ] Constitution PDF embeds (desktop) and downloads; filename unchanged.
- [ ] News list shows 2 posts with author line and 40-word excerpts; each post page renders fully with the Recent Posts sidebar.
- [ ] `/nmo/` and all 7 subpages load with their CSS/JS/images; progress tracker counts pages; "Meet The Team" button works.
- [ ] Scroll-to-top appears after scrolling and works.

**Quality**
- [ ] `astro check` and the link checker pass (0 broken internal links; external links return <400 or are allow-listed).
- [ ] No references to `wp-content`, `wp-json`, `siteground`, `themeisle`, `otter`, `neve` in built HTML (grep `dist/`), except inside `/nmo/` (none expected) and the redirect file.
- [ ] Lighthouse (mobile) ≥ 90 Performance/Accessibility/Best Practices/SEO on Home, About Us, Upcoming Events.
- [ ] Fonts self-hosted; no third-party requests on WordPress pages (the `/nmo/` CDN scripts are the only exception).
- [ ] Member form: unset endpoint shows the fallback notice; set endpoint delivers a test submission to `eboard@idssochi.org`.
- [ ] `sitemap-index.xml`, `robots.txt`, `404` page, favicons, canonical + OG tags present.
- [ ] `README.md` explains: edit officers/events/news/nav in data files; run locally; deploy flow; form endpoint; how to add a page.

---

## 14. Decisions for the team (answer in the repo README or issue tracker)

1. **Host:** Cloudflare Pages (recommended: redirects, previews, Functions option, custom domain + TLS, no bandwidth cap concerns) vs GitHub Pages (simpler, no redirects).
2. **Form provider:** Formspree / Web3Forms (fast, free tier) vs Cloudflare Function + Resend (no third party, more setup).
3. **Typo policy:** fix "Orientaion" and other flagged items, or preserve verbatim for the first release.
4. **Board transition:** keep the current officers on About Us until the 2026–2027 board is certified, then update `officers.yaml`.
5. **Archive:** where to store the WordPress export and unused media (repo `archive/` vs Drive).

---

*End of spec.*
