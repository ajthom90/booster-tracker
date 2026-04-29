# Booster Tracker — Design Spec

**Date**: 2026-04-29
**Status**: Approved (brainstorming) — pending implementation plan

## 1. Purpose & audience

A public website that tracks SpaceX rocket boosters and launches with first-class **filtering, sorting, derived stats, and data export**. Built primarily for the author's own use, but publicly accessible so the SpaceX-enthusiast community benefits too.

No user accounts, no community features. Just a fast, powerful, customizable read-only viewer of structured data.

The site competes with `boostertracker.com`, whose specific shortcomings drove this project:

1. No arbitrary column sorting.
2. No flexible filtering.
3. No filter-aware derived stats (avg turnaround, fleet aggregates).
4. No data export.

## 2. Architecture overview

Three logical pieces in a **single Docker container** running on the author's home server:

1. **LL2 sync worker** — a scheduled in-process job (`node-cron`) that paginates the Launch Library 2 API, upserts records into SQLite, and resolves derived fields. Runs daily (full) + every 30 min (incremental on upcoming/recent launches). Schedule overridable via env vars.
2. **SvelteKit web app** — SSR'd pages backed by SQLite reads. Renders tables, detail pages, dashboard. Serves CSV/JSON export endpoints. No client-side database; all data flows through `+page.server.ts` load functions and `+server.ts` API routes.
3. **SQLite database** — single file (`data.db`) on a Docker volume.

```
LL2 API ──(scheduled fetch)──> Sync worker ──(upserts)──> SQLite
                                                              │
                                                              ▼
                                             Browser ◀── SvelteKit SSR
```

Public access (Cloudflare Tunnel / Tailscale Funnel / reverse proxy) is **outside the app boundary**.

## 3. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **SvelteKit** | Single TS codebase, SSR, tiny client bundles, great fit for table-first apps |
| Database | **SQLite** (via `better-sqlite3`) | Single file; perfect for a self-hosted, read-heavy mirror; trivial backup |
| ORM | **Drizzle** | Type-safe SQL + migrations |
| Tables | **TanStack Table** (Svelte adapter) | De facto primitive for sort/filter/column visibility |
| i18n | **Paraglide JS** (Inlang) | Compile-time, type-safe, tree-shaken; native SvelteKit fit |
| Charts | **Chart.js** or **uPlot** (lightweight) | SVG-renderable, no D3 unless needed |
| Validation | **Zod** | Schema validation for LL2 responses |
| Tests | **Vitest** + **Playwright** | Unit/integration + e2e |
| Cron | **node-cron** (in-process) | One container, simplest path |
| Deploy | **Docker** + **GitHub Container Registry** | Public-repo-friendly, free |

## 4. Data model

Six tables. SpaceX-only at sync time (filter on `agency` / `launch_service_provider`).

### Core entities

**`booster`** — one row per LL2 `Launcher` for SpaceX
- `id` (PK, from LL2)
- `serial_number` (UNIQUE, e.g. "B1058")
- `status` (active / inactive / expended / lost / retired / unknown)
- `flights`, `successful_landings`, `attempted_landings`
- `first_launch_date`, `last_launch_date`
- `image_url`, `flight_proven`, `details`
- `launcher_config_id` (FK → `launcher_config`)
- `ll2_url`, `ll2_last_synced_at`

**`launch`** — one row per launch
- `id` (PK, LL2 UUID)
- `slug` (UNIQUE, url-friendly e.g. "starlink-group-7-1")
- `name`, `status`, `net` (launch time)
- `mission_name`, `mission_description`, `mission_type`, `orbit`
- `customer`, `agency_id`
- `launchpad_id` (FK)
- `image_url`, `webcast_url`, `rocket_name`
- `ll2_last_synced_at`

**`launchpad`** — `name` (SLC-40), `full_name`, `location`, `country_code`, `total_launches`, `image_url`.

**`landing_location`** — droneships *and* RTLS pads in one table:
- `name` ("Of Course I Still Love You"), `abbrev` (OCISLY)
- `location_type` (ASDS / RTLS / Ocean)
- `successful_landings`, `attempted_landings`, `description`

### Relationships

**`launch_booster`** (join table) — handles Falcon Heavy 3-booster flights:
- `launch_id`, `booster_id`, `role` (core / side / null)
- `flight_number` (this booster's *nth* flight)
- `landing_attempted`, `landing_success`, `landing_type`
- `landing_location_id` (FK)
- PK: `(launch_id, booster_id, role)`

**`launcher_config`** — Block 5, Falcon Heavy core, etc. (lookup table for booster variants)

### Bookkeeping

**`sync_state`** — per-resource sync metadata: `resource`, `last_full_sync_at`, `last_incremental_sync_at`, `next_url` (pagination cursor), `status`.

### Non-obvious decisions

1. **SpaceX-only at sync time** keeps the DB lean.
2. **Slugs for launch URLs** — generated from mission name + dedupe.
3. **Derived fields**: LL2-provided counts/dates are mirrored as columns. Computed aggregates (avg turnaround, fleet stats) run on-the-fly via SQL; no caching layer in v1.
4. **Droneships + RTLS in one table** — same question ("where did it land?"); distinguished by `location_type`.
5. **What we don't translate**: LL2 data (mission names, orbit codes, descriptions) stays as LL2 provides it. Only our UI chrome goes through Paraglide.

## 5. LL2 sync worker

### Scheduling

`node-cron` inside the SvelteKit Node server. Defaults (all overridable via env):
- **Full sync** at 03:00 server-local time, daily.
- **Incremental sync** every 30 min — refreshes only upcoming launches, launches in the last 30 days, and any record marked `stale` in `sync_state`.

### Rate limiting

In-process token bucket — 15 tokens/hour, gradual refill. Worker sleeps when budget is empty. Guarantees we never exceed LL2's free tier even if both schedules collide.

### Resilience

- Each pagination page is its own SQLite transaction → partial syncs leave a consistent DB.
- Errors per resource log + record in `sync_state.status` and surface in `/admin/status`.
- Retry with exponential backoff for 429 / 5xx.
- Manual "sync now" admin endpoint guarded by `ADMIN_TOKEN` env var.

### Initial seed

- `npm run seed` script — full sync from scratch. Hours on free tier; documented in README.
- Pre-seeded `data.db` snapshot attached to GitHub Releases (refreshed weekly by `db-snapshot.yml` GH Action). New self-hosters skip the multi-hour seed.

### Schema validation

LL2 responses parsed through Zod schemas. Unknown / changed fields **fail loudly** instead of silently mis-storing. Mitigates LL2 schema drift risk.

## 6. Frontend table UX (the heart of the product)

Four top-level table routes: `/boosters`, `/launches`, `/droneships`, `/launchpads`. Each has the same shape:

```
┌─────────────────────────────────────────────────────────────────┐
│  Boosters                          [Export ▾]  [Columns ▾]  [⚙] │
│                                                                  │
│  Filters: [Status ▾] [Block ▾] [Flights ≥ ▢] [Search ▢]  [+ Add]│
│                                                                  │
│  Showing 12 of 47 · avg flights 5.3 · total landings 67 · ...   │  ← aggregate bar
├─────────────────────────────────────────────────────────────────┤
│  Serial ↑  Status   Flights   Last flight   Days since   ...    │
│  B1058     Lost     14        2022-12-23    857          ...    │
│  B1067     Active   22        2026-04-15    14           ...    │
└─────────────────────────────────────────────────────────────────┘
```

### Filter system

- **Filter chip bar** below page title. `[+ Add]` lets users pick any column to filter on. Each column declares its filter type (enum / range / text / date / boolean); chip renders the appropriate input.
- **AND-only composition** in v1. (OR / nested expressions are explicit non-goals.)
- **Free-text search** hits indexed text columns (booster serial, mission name, customer).

### Sort

Click header → sort. Shift-click → multi-column sort. Sort state encoded in URL.

### Column visibility

`[Columns ▾]` dropdown toggles each column. Default: a sensible subset visible, "advanced" columns hidden. Persists in URL + localStorage.

### Aggregate bar

Recomputes live from the **current filtered set** (server-side). Per-table aggregate list declared in code (e.g., for boosters: count, avg flights, total landings, avg turnaround, success rate). Sticky above the table.

### URL state

Single compact query param `?v=<base64-encoded-JSON>` holding `{filters, sort, visibleCols, page}`. Updates via SvelteKit `goto` with `keepFocus: true`. Back/forward replays state.

### localStorage presets

"Save current view" stores current `?v=` payload under a user-chosen name. Per-device, no sync. A preset *is* a URL — same data shape.

### Export

`[Export ▾]` → CSV / JSON. Hits `/api/{table}/export?format=csv&v=...`, applies same filter/sort/columns, streams result. Filename includes filter hash + date.

### SSR vs. client

- Initial page load: SSR'd with full filtered dataset (or first page if paginated). Fast first paint, indexable.
- Filter/sort changes: SvelteKit `invalidate` re-runs load function server-side via fetch. No client DB; no client-side filtering of giant arrays. SQL is source of truth.
- Pagination: offset-based (booster + launch counts are small enough).

### Mobile

Tables collapse to card list below ~768px. Filter bar collapses into a drawer. Polished but not phone-first.

## 7. Detail pages

### Per-booster (`/boosters/B1058`)

- **Header**: serial number, status badge, hero image (LL2), key stats inline (flights, success rate, first/last flight, days active).
- **Flight history table**: chronological list — date, mission, launchpad, landing location, landing outcome, turnaround from previous flight. Sortable; not filterable.
- **Landing record breakdown**: counts by location, by outcome.
- **Details prose**: LL2 `details` field rendered as paragraph.
- **Related links**: launcher_config link, customer breakdown.
- Joins: `booster` × `launch_booster` × `launch` × `landing_location`.

### Per-launch (`/launches/<slug>`)

- **Header**: mission name, status badge, hero image, NET, countdown if upcoming.
- **Mission summary**: description, mission type, orbit, customer, agency.
- **Booster card(s)**: 1 for Falcon 9, 3 for Falcon Heavy. Each card: booster serial (linked), this booster's flight number, landing attempt + outcome + location.
- **Launchpad card**: name, location (linked).
- **Webcast embed**: if YouTube, iframe.

### Per-launchpad (`/launchpads/<slug>`) and per-location (`/locations/<slug>`)

Header with key stats + table of associated launches/landings (filter/sort like main tables, pre-scoped).

### SEO & sharing

- OpenGraph + Twitter card meta tags per page (hero image + key stats summary).
- Stable URLs (serial number / slug) — never change once set.

## 8. Stats dashboard (`/stats`)

Single page with **fleet-wide aggregates** that don't fit naturally on any one table. Static-feeling (not filter-aware — for filter-aware numbers, use the table aggregate bar).

### Sections

- **Fleet at a glance**: total boosters ever, currently active count, retired/lost/expended counts, total launches, total landings (attempted/successful + success rate).
- **Records**: most flown booster, longest-active booster, fastest turnaround (booster + days), most-used launchpad, most-used droneship.
- **Cadence**: launches per year (bar chart), launches per month for the last 24 months (sparkline).
- **Reliability over time**: rolling 12-month landing success rate (line chart).
- **Distribution**: count of boosters by flight count (histogram).

### Implementation

- Chart.js or uPlot. SSR-rendered SVG where possible; hydrate only if interactive.
- All aggregates are SQL queries — no precomputation in v1.
- HTTP cache: `Cache-Control: public, max-age=300` (stats don't change between syncs).

## 9. Internationalization (i18n) and RTL

### Library

**Paraglide JS** (Inlang). Compile-time message extraction, type-safe keys, tree-shaken.

### Locales (initial)

`en` (source), `es`, `fr`, `de`, `ar`, `he`, `zh-Hans`. BCP-47 codes throughout.

### Message files

Per-locale JSON in `messages/`:
```
messages/
  en.json      ← source of truth
  es.json
  fr.json
  de.json
  ar.json
  he.json
  zh-Hans.json
```

Keys like `boosters.column.flights` → translated equivalents. Paraglide compiles into typed functions.

### Locale detection (per request)

1. URL prefix (`/de/boosters`, `/ar/launches/...`) — explicit, shareable, indexable per-locale.
2. `?lang=` query param if no prefix.
3. `Accept-Language` header on first visit → redirect to localized prefix.
4. English fallback if requested locale isn't loaded.

Language switcher in page header changes URL prefix.

### What gets translated

UI chrome — column headers, button labels, filter type names, status badge labels (e.g., `"active"` → "Active" / "Aktiv" / "活跃"), aggregate labels, page titles, meta descriptions, error / empty-state copy, about/help docs.

### What stays as-is

- LL2 data: mission names, payload names, customer names, descriptions, webcast URLs, image alt text.
- Booster serial numbers, launchpad codes (`B1058`, `SLC-40` are universal).

### Locale-aware formatting

- Dates: `Intl.DateTimeFormat`
- Numbers: `Intl.NumberFormat`
- Relative times: `Intl.RelativeTimeFormat`
- Lists: `Intl.ListFormat`

### Sort caveat

Tables sort by raw column values, not localized strings — order is consistent across locales. Status sorts by enum value, not translated label.

### Translation workflow & sourcing

**Initial seed**: machine-translated (DeepL or similar) for `es`, `fr`, `de`, `ar`, `he`, `zh-Hans`. **Banner in non-English locales**: "Machine-translated — help improve it" linking to `/translate`.

**Crowdsourcing**:
- **Inlang Fink** primary path (`fink.inlang.com`) — translators log in with GitHub, edit in web UI, submit PRs. Repo is the source of truth.
- **Crowdin** secondary path (free OSS plan) — bidirectional sync via GitHub Action. For translators who already use Crowdin.

A `/translate` page on the site shows current locale completion percentages, links to Fink + Crowdin, briefly explains how to contribute.

### RTL support (`ar`, `he`)

- `<html dir="rtl">` set per request based on locale.
- **CSS uses logical properties end-to-end** (`margin-inline-start`, `padding-inline-end`, `text-align: start`). No `left`/`right` in stylesheets. Enforced by a stylelint rule.
- Directional icons (sort arrows, "next" chevrons, sparkline X-axis labels) flip in RTL contexts.
- Bidirectional text (Arabic mission descriptions mixed with `B1058` IDs): rely on browser's Unicode bidi algorithm; mark numerals/IDs with `<bdo>` only where it visibly breaks.
- Visual QA in both `ar` and `he` — Playwright snapshot test for `ar` in nightly e2e tier.

### Validation

GitHub Action validates that every locale has every key. Missing keys block merge. (Machine-translated fallback is acceptable — no key may be missing.)

## 10. Deployment, Docker, secrets, CI/CD

### Repo layout (public on GitHub)

```
booster-tracker/
├── .github/workflows/           CI: ci, i18n-validate, release, crowdin-sync, db-snapshot
├── messages/                    en.json + locale files
├── src/                         SvelteKit app
├── docker/
│   └── Dockerfile
├── docker-compose.yml           example for self-hosters
├── .env.example                 documented placeholders, COMMITTED
├── .gitignore                   excludes .env, .superpowers/, data.db
├── README.md
└── ...
```

### Docker image

- Multi-stage Dockerfile. Final: distroless Node + built SvelteKit + (optional) seed DB.
- Built on every push to `main` by GH Actions. Pushed to **GitHub Container Registry** (`ghcr.io/<user>/booster-tracker`). Free for public repos. Tagged `latest` + git sha + semver.

### Home server runtime

- `docker-compose.yml`: one service (`app`), one volume (`./data:/data`), published image.
- **Updates are manual**: `docker compose pull && docker compose up -d` on the home server. No Watchtower; the operator decides when to roll forward.
- Public access (Cloudflare Tunnel recommended) is out of the app boundary; documented in README.

### Secrets

**In the public repo, ever**: nothing sensitive. `.env.example` shows empty placeholders + comments.

**At runtime on the home server** — `.env` (chmod 600), referenced via `docker-compose.yml` `env_file:`:
- `LL2_API_TOKEN` (optional — only if Patreon tier)
- `ADMIN_TOKEN` (random string, gates `/admin/*`)
- `PUBLIC_BASE_URL`
- `SYNC_SCHEDULE` (cron expression override)
- `DATABASE_PATH` (default `/data/data.db`)
- `LOG_LEVEL`

**In GitHub Actions** — repo Secrets:
- `GITHUB_TOKEN` (automatic, GHCR push)
- `CROWDIN_API_TOKEN`, `CROWDIN_PROJECT_ID` (translation sync)

### CI/CD pipeline (GitHub Actions)

1. **`ci.yml`** — every PR + push: install, lint (incl. RTL stylelint rule), type-check, tests, build. Blocks merge.
2. **`i18n-validate.yml`** — PRs touching `messages/`: enforce all locales have all keys.
3. **`release.yml`** — push to `main`: build Docker image, tag, push to GHCR.
4. **`crowdin-sync.yml`** — daily schedule: pulls translations from Crowdin → opens PR with diff. Pushes new English source strings up to Crowdin.
5. **`db-snapshot.yml`** — weekly: ephemeral runner does fresh seed against LL2; attaches `data.db` to GH Release.

### Backup & recovery

- README documents one-liner: `docker compose stop app && cp data/data.db backup/data-$(date +%F).db && docker compose start app`.
- Optional host cron for nightly local backups + retention.

## 11. Testing strategy

### Unit (Vitest)

- Pure functions: filter expression → SQL builder, URL state encoding/decoding, derived stat computations, slug generation, locale detection.
- Zod schema validators for LL2 response parsing.

### Integration (Vitest + better-sqlite3 in-memory)

- Sync worker against recorded LL2 fixtures (HTTP responses cached as JSON, replayed via stub fetch). Verifies upsert behavior, pagination resumption, error handling.
- DB queries returning correct aggregates given known seed data.

### End-to-end (Playwright, headless in CI)

- **Tier 1** — every PR: smoke test of each top-level route (boosters, launches, droneships, launchpads, stats, representative detail page). 200 status, key text present.
- **Tier 2** — nightly: filter/sort/export round-trip; URL state survives reload; locale switch; RTL layout snapshot for `ar`.

### Translation completeness

GH Action validates keys (already covered in 10).

## 12. Observability

- **Structured JSON logs** to stdout (Docker captures). Levels: error / warn / info / debug. `LOG_LEVEL` env var.
- **`/admin/status`** (token-gated): per-resource sync state, record counts, error history, "sync now" button.
- **`/healthz`** endpoint: 200 if DB readable, 503 otherwise. For reverse proxy / uptime monitor.
- **No metrics platform** in v1. Logs + health endpoint only.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **LL2 schema drift** | Zod parsing fails loudly on unknown fields rather than silently mis-storing |
| **Falcon Heavy edge cases** (3 boosters/launch) | Test fixtures from real Heavy launches (USSF-44, USSF-67, etc.); join-table model handles role per booster |
| **Translation drift** | i18n-validate Action blocks PRs that introduce keys without all locales |
| **Initial seed time** (hours on free tier) | Pre-seeded DB attached to GH Releases |

## 14. Non-goals (v1)

- ❌ User accounts / auth (admin token only)
- ❌ Server-synced presets (URL + localStorage only)
- ❌ Real-time updates / websockets
- ❌ OR / nested filter expressions
- ❌ Drill-down from charts
- ❌ Stats date-range pickers / "vs last year" comparisons
- ❌ Comments, ratings, user-submitted content
- ❌ Other launch providers (SpaceX-only sync filter)
- ❌ Capsules / spacecraft / Starship as separate top-level views (Starship boosters appear if LL2 classifies them as Launchers)
- ❌ Native mobile apps (mobile *web* is responsive but not phone-first)
- ❌ Push notifications / email / RSS

## 15. Open questions for implementation planning

- **Repo bootstrapping**: project directory is empty; we need to decide whether to use SvelteKit's `npm create svelte@latest` template or hand-roll.
- **Routing for default locale**: do we redirect `/boosters` → `/en/boosters`, or keep `en` un-prefixed (`/boosters` is `en`, `/de/boosters` is German)? Recommend: `en` un-prefixed for cleaner default URLs.
- **First milestone scope**: probably ship boosters table + booster detail page + LL2 sync worker before adding the other table types. To be confirmed in implementation plan.
