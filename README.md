# Booster Tracker

A public, self-hosted website that tracks SpaceX rocket boosters and launches.
Powerful filtering, multi-column sorting, derived stats, and CSV/JSON export —
the things [boostertracker.com](https://boostertracker.com) doesn't do.

Phases 1 & 2 ship the full English-only experience: Boosters, Launches,
Droneships, and Launchpads tables (each with filter / sort / columns / aggregates
/ presets / CSV+JSON export); per-launch, per-launchpad, and per-location detail
pages; a `/stats` dashboard with Chart.js charts; `/healthz` and a token-gated
`/admin/status`. Phase 3 will add 6 additional locales (es/fr/de/ar/he/zh-Hans)
plus RTL support.

## Stack

- **SvelteKit** + TypeScript (Node adapter)
- **SQLite** via Drizzle ORM and `better-sqlite3`
- **Launch Library 2** API (mirrored locally on a schedule)
- **Paraglide JS** for i18n (English now; Spanish, French, German, Arabic, Hebrew, Mandarin in Phase 3)
- **Docker** for self-hosting

## Local development

```bash
git clone https://github.com/ajthom90/booster-tracker.git
cd booster-tracker

cp .env.example .env
# Edit .env if needed; defaults point to LL2's dev mirror.

npm install
npm run db:generate    # generate Drizzle migrations (only after schema changes)
npm run seed           # one-time: pull SpaceX data from LL2 into SQLite
npm run dev            # start dev server at http://localhost:5173
```

Useful scripts:

| Script             | What it does                                        |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Vite dev server, hot reload                         |
| `npm run build`    | Production build (Node adapter, output in `build/`) |
| `npm run preview`  | Run the production build locally                    |
| `npm run check`    | Svelte / TypeScript checks                          |
| `npm run lint`     | Prettier + ESLint + Stylelint                       |
| `npm run format`   | Auto-format with Prettier                           |
| `npm test`         | Vitest unit + integration                           |
| `npm run test:e2e` | Playwright e2e                                      |
| `npm run seed`     | Full sync from LL2 (one-time, ~minutes)             |

## Self-hosting (Docker)

```bash
# Pull the latest image and start the container
docker compose pull
docker compose up -d

# First-time only: seed the DB inside the running container (slow — ~hours
# against the LL2 free tier). Or skip the seed; see "Skip the initial seed" below.
docker compose exec app node --import tsx src/lib/seed.ts
```

The app listens on port 3000 inside the container, mapped to 3000 on the host.
Put a reverse proxy in front (Cloudflare Tunnel, Caddy, NGINX) to expose it publicly.

### Skip the initial seed (recommended)

A pre-seeded SQLite database is published weekly to GitHub Releases by the
`db-snapshot.yml` workflow. Download the latest snapshot before starting
the container:

```bash
mkdir -p data
curl -L "https://github.com/ajthom90/booster-tracker/releases/latest/download/data.db" \
  -o data/data.db
docker compose up -d
```

The container's daily cron will keep it current after that.

### Environment variables

See [`.env.example`](.env.example). Key ones:

- `LL2_BASE_URL` — `https://lldev.thespacedevs.com/2.2.0` for development, `https://ll.thespacedevs.com/2.2.0` for production.
- `LL2_API_TOKEN` — optional Patreon-tier token for higher rate limits.
- `ADMIN_TOKEN` — required for `/admin/*` endpoints. Generate with `openssl rand -hex 32`.
- `SYNC_FULL_CRON` / `SYNC_INCREMENTAL_CRON` — override sync schedules.
- `DATABASE_PATH` — defaults to `/data/data.db` in Docker, `./data/data.db` locally.

### Health check

The unauthenticated `/healthz` endpoint returns `{ "status": "ok" }` (200) when
the DB is readable, `{ "status": "degraded" }` (503) otherwise. Use it from
your reverse proxy or uptime monitor.

### Admin status

Visit `/admin/status?token=<ADMIN_TOKEN>` for per-resource sync state and a
"Trigger incremental sync" button.

### Updating

```bash
docker compose pull
docker compose up -d
```

Manual; no auto-update. The operator decides when to roll forward.

### Backup

```bash
docker compose stop app
cp data/data.db backup/data-$(date +%F).db
docker compose start app
```

## Data source

Booster, launch, launchpad, and landing data is mirrored from
[The Space Devs Launch Library 2 API](https://thespacedevs.com/llapi).
The free tier limits us to 15 requests/hour, so the sync runs once daily
(full) plus every 30 minutes (incremental, refreshing only upcoming and
recent launches).

## Contributing

PRs welcome. Run `npm run lint && npm run check && npm test` before submitting.

## License

MIT (TODO: add LICENSE file)
