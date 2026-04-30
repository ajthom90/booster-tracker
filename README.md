# Booster Tracker

A public, self-hosted website that tracks SpaceX rocket boosters and launches.
Powerful filtering, multi-column sorting, derived stats, and CSV/JSON export —
the things [boostertracker.com](https://boostertracker.com) doesn't do.

Phase 1 ships the **Boosters** view end-to-end (filter, sort, columns, presets,
export, detail page). Launches, droneships, launchpads, the stats dashboard,
and additional locales arrive in later phases.

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

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server, hot reload |
| `npm run build` | Production build (Node adapter, output in `build/`) |
| `npm run preview` | Run the production build locally |
| `npm run check` | Svelte / TypeScript checks |
| `npm run lint` | Prettier + ESLint + Stylelint |
| `npm run format` | Auto-format with Prettier |
| `npm test` | Vitest unit + integration |
| `npm run test:e2e` | Playwright e2e |
| `npm run seed` | Full sync from LL2 (one-time, ~minutes) |

## Self-hosting (Docker)

```bash
# Pull the latest image and start the container
docker compose pull
docker compose up -d

# First-time only: seed the DB inside the running container
docker compose exec app node --import tsx src/lib/seed.ts
```

The app listens on port 3000 inside the container, mapped to 3000 on the host.
Put a reverse proxy in front (Cloudflare Tunnel, Caddy, NGINX) to expose it publicly.

### Environment variables

See [`.env.example`](.env.example). Key ones:

- `LL2_BASE_URL` — `https://lldev.thespacedevs.com/2.2.0` for development, `https://ll.thespacedevs.com/2.2.0` for production.
- `LL2_API_TOKEN` — optional Patreon-tier token for higher rate limits.
- `ADMIN_TOKEN` — required for `/admin/*` endpoints (Phase 2). Generate with `openssl rand -hex 32`.
- `SYNC_FULL_CRON` / `SYNC_INCREMENTAL_CRON` — override sync schedules.
- `DATABASE_PATH` — defaults to `/data/data.db` in Docker, `./data/data.db` locally.

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
