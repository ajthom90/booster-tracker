# Phase 1 — Boosters MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working English-only site that lets visitors browse, filter, sort, and export every SpaceX booster, with a per-booster detail page.

**Architecture:** Single-container SvelteKit app backed by SQLite. A scheduled in-process worker mirrors the Launch Library 2 API into the local DB. The frontend renders SSR'd pages from SQLite with TanStack Table. URL state encodes filters/sort/columns; localStorage stores presets. CSV/JSON export endpoints stream filtered results.

**Tech Stack:** SvelteKit (TS), Drizzle ORM, better-sqlite3, TanStack Table (Svelte adapter), Paraglide JS, Zod, node-cron, Vitest, Playwright, ESLint + Prettier + stylelint, Docker.

**Spec reference:** `docs/superpowers/specs/2026-04-29-booster-tracker-design.md`

**Phase 1 scope (in):** project scaffold; full schema (all 6 entities + sync_state) since boosters need joins; LL2 sync worker (full + incremental); `/boosters` table with filter/sort/columns/aggregates/URL state/presets/CSV+JSON export; `/boosters/<serial>` detail page; i18n infrastructure (Paraglide, locale routing) with `en` only; Dockerfile + docker-compose; README; `ci.yml`; Vitest + Playwright tests.

**Phase 1 scope (out, deferred to later phases):** `/launches`, `/droneships`, `/launchpads` table views; per-launch / per-launchpad / per-location detail pages; `/stats` dashboard; locales beyond `en`; RTL; Crowdin/Fink; `release.yml`, `db-snapshot.yml`, `i18n-validate.yml`, `crowdin-sync.yml`; `/admin/status`; `/healthz`.

---

## File structure

```
booster-tracker/
├── .github/workflows/
│   └── ci.yml
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore                    (already present)
├── README.md                     (rewritten in Task 27)
├── messages/
│   └── en.json                   source-of-truth UI strings
├── project.inlang/
│   └── settings.json             Paraglide config
├── src/
│   ├── app.html
│   ├── app.d.ts
│   ├── hooks.server.ts           locale resolution + cron bootstrap
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── client.ts     better-sqlite3 + drizzle handle
│   │   │   │   ├── schema.ts     all tables
│   │   │   │   └── migrate.ts    runs migrations on boot
│   │   │   ├── ll2/
│   │   │   │   ├── schemas.ts    Zod for LL2 responses
│   │   │   │   ├── client.ts     fetch wrapper + rate limiter + retry
│   │   │   │   └── ratelimit.ts  token bucket
│   │   │   ├── sync/
│   │   │   │   ├── upsert.ts     generic upsert helper
│   │   │   │   ├── launchpads.ts
│   │   │   │   ├── launcher-configs.ts
│   │   │   │   ├── boosters.ts
│   │   │   │   ├── launches.ts   includes launch_booster + landing_location
│   │   │   │   ├── orchestrator.ts full + incremental
│   │   │   │   └── scheduler.ts  node-cron wiring
│   │   │   ├── boosters/
│   │   │   │   ├── columns.ts    declarative column metadata
│   │   │   │   ├── filters.ts    filter type model + URL codec
│   │   │   │   ├── query.ts      filter+sort+page → drizzle query
│   │   │   │   ├── aggregates.ts
│   │   │   │   └── export.ts     CSV/JSON streaming
│   │   │   └── url-state.ts      base64 JSON `?v=` codec
│   │   ├── i18n/
│   │   │   └── runtime.ts        thin Paraglide re-export + helpers
│   │   ├── components/
│   │   │   ├── FilterChipBar.svelte
│   │   │   ├── ColumnsMenu.svelte
│   │   │   ├── ExportMenu.svelte
│   │   │   ├── AggregateBar.svelte
│   │   │   ├── PresetsMenu.svelte
│   │   │   └── BoosterStatusBadge.svelte
│   │   └── seed.ts               script entrypoint for `npm run seed`
│   └── routes/
│       ├── +layout.svelte
│       ├── +layout.server.ts
│       ├── +page.svelte           home — links to /boosters
│       ├── boosters/
│       │   ├── +page.svelte
│       │   ├── +page.server.ts
│       │   └── [serial]/
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       └── api/
│           └── boosters/
│               └── export/
│                   └── +server.ts
├── tests/
│   ├── unit/                     vitest
│   │   ├── url-state.test.ts
│   │   ├── ratelimit.test.ts
│   │   ├── filters.test.ts
│   │   ├── query.test.ts
│   │   └── aggregates.test.ts
│   ├── integration/              vitest, in-memory sqlite
│   │   ├── upsert.test.ts
│   │   ├── sync-launchpads.test.ts
│   │   ├── sync-boosters.test.ts
│   │   └── sync-launches.test.ts
│   ├── fixtures/ll2/             recorded LL2 responses
│   │   ├── launchpads.page1.json
│   │   ├── launchpads.page2.json
│   │   ├── launchers.page1.json
│   │   └── launches.page1.json
│   └── e2e/                      playwright
│       ├── boosters-table.spec.ts
│       └── booster-detail.spec.ts
├── drizzle.config.ts
├── drizzle/                      generated migrations
├── playwright.config.ts
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml | package-lock.json
```

---

I'm going to keep these tasks bite-sized. Each ends with a commit. Code blocks contain real, runnable code — no placeholders.

---

## Task 1: SvelteKit + TypeScript scaffold

**Files:**

- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.d.ts`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, plus standard scaffold files

- [ ] **Step 1: Initialize SvelteKit (skeleton, TS, ESLint, Prettier, Vitest, Playwright)**

```bash
cd /Users/ajthom90/projects/booster-tracker
npx sv create . --template minimal --types ts --no-add-ons --install npm
```

If `sv` prompts, accept defaults; if it refuses to scaffold into a non-empty dir, run with `--force`.

Then install commonly-bundled dev tooling:

```bash
npx sv add eslint prettier vitest playwright
```

(`sv add` is the official Svelte CLI add-on installer — it wires the configs into `package.json`, `svelte.config.js`, and creates baseline config files.)

- [ ] **Step 2: Verify the scaffold runs**

```bash
npm run dev -- --port 5173
```

Expected: dev server starts, says `Local: http://localhost:5173/`. Visit in browser; should see the SvelteKit welcome / minimal page. Stop with Ctrl+C.

- [ ] **Step 3: Verify build + tests + e2e all run cleanly**

```bash
npm run build
npm test -- --run
npx playwright install --with-deps chromium
npm run test:e2e || true   # baseline e2e may not exist yet; this is just to confirm Playwright is wired
```

Expected: `build` finishes; `vitest` runs (zero or one passing scaffold test); Playwright either runs an empty/example spec or reports "no tests found". Anything else means the scaffold is broken — stop and investigate.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Scaffold SvelteKit app with TS, ESLint, Prettier, Vitest, Playwright"
```

---

## Task 2: Add data + i18n + table dependencies

**Files:**

- Modify: `package.json` (add deps)

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
npm install drizzle-orm better-sqlite3 zod node-cron @tanstack/table-core @inlang/paraglide-js
npm install -D drizzle-kit @types/better-sqlite3 @types/node-cron stylelint stylelint-config-standard
```

- [ ] **Step 2: Verify nothing broke**

```bash
npm run build
```

Expected: build succeeds. (No code uses these deps yet; we just confirm the scaffold still compiles.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add Drizzle, better-sqlite3, Zod, node-cron, TanStack Table, Paraglide, stylelint"
```

---

## Task 3: Configure stylelint with logical-property enforcement

**Files:**

- Create: `.stylelintrc.json`
- Modify: `package.json` (add `lint:css` script)

- [ ] **Step 1: Write `.stylelintrc.json`**

```json
{
	"extends": ["stylelint-config-standard"],
	"rules": {
		"declaration-property-value-disallowed-list": {
			"/^margin-(left|right)$/": [".+"],
			"/^padding-(left|right)$/": [".+"],
			"/^border-(left|right)/": [".+"],
			"text-align": ["left", "right"]
		},
		"comments": "Phase 3 will enforce logical properties globally; for Phase 1 we only flag obvious LTR-physical declarations to keep the door open."
	}
}
```

- [ ] **Step 2: Add lint script in `package.json`**

In the `scripts` object, add:

```json
"lint:css": "stylelint 'src/**/*.{css,svelte}' --allow-empty-input"
```

- [ ] **Step 3: Run it**

```bash
npm run lint:css
```

Expected: passes (no CSS yet) or warns trivially.

- [ ] **Step 4: Commit**

```bash
git add .stylelintrc.json package.json
git commit -m "Add stylelint with rules guarding against physical CSS properties"
```

---

## Task 4: Add a unified `lint` and `check` script

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Replace the `scripts` block** with:

```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
  "lint": "prettier --check . && eslint . && stylelint 'src/**/*.{css,svelte}' --allow-empty-input",
  "format": "prettier --write .",
  "test:unit": "vitest",
  "test": "vitest --run",
  "test:e2e": "playwright test",
  "seed": "node --import tsx src/lib/seed.ts",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push"
}
```

- [ ] **Step 2: Install `tsx` for the seed script**

```bash
npm install -D tsx
```

- [ ] **Step 3: Verify scripts wire up**

```bash
npm run check
npm run lint
npm test
```

Expected: `check` passes (or surfaces trivial scaffold issues — fix any). `lint` passes. `test` passes (zero or one scaffold test).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Unify lint/check/test scripts; add tsx for seed runner"
```

---

## Task 5: Set up Vitest config with separate unit/integration projects

**Files:**

- Create or modify: `vite.config.ts`
- Create: `tests/unit/.gitkeep`, `tests/integration/.gitkeep`, `tests/fixtures/ll2/.gitkeep`

- [ ] **Step 1: Replace `vite.config.ts` with**:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['tests/unit/**/*.test.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/integration/**/*.test.ts']
				}
			}
		]
	}
});
```

- [ ] **Step 2: Create the empty test directories**

```bash
mkdir -p tests/unit tests/integration tests/fixtures/ll2 tests/e2e
touch tests/unit/.gitkeep tests/integration/.gitkeep tests/fixtures/ll2/.gitkeep
```

- [ ] **Step 3: Verify**

```bash
npm test
```

Expected: vitest finds zero tests across both projects, exits 0.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts tests/
git commit -m "Configure Vitest with unit + integration projects"
```

---

## Task 6: Add `.env.example`

**Files:**

- Create: `.env.example`

- [ ] **Step 1: Write `.env.example`**

```env
# Public base URL of the deployed app (used in OpenGraph tags, sitemap, etc.)
PUBLIC_BASE_URL=http://localhost:5173

# LL2 API base URL — use the dev mirror locally to avoid hitting the rate limit
# Production:  https://ll.thespacedevs.com/2.2.0
# Dev mirror:  https://lldev.thespacedevs.com/2.2.0
LL2_BASE_URL=https://lldev.thespacedevs.com/2.2.0

# Optional Patreon-tier API token. Leave blank for free tier.
LL2_API_TOKEN=

# Random string. Required to access /admin/* endpoints. Generate with: openssl rand -hex 32
ADMIN_TOKEN=

# Path to the SQLite DB file. In Docker this is mapped to a volume.
DATABASE_PATH=./data/data.db

# Cron expression for full sync. Default: daily at 03:00 server-local.
SYNC_FULL_CRON=0 3 * * *

# Cron expression for incremental sync. Default: every 30 minutes.
SYNC_INCREMENTAL_CRON=*/30 * * * *

# Logging
LOG_LEVEL=info
```

- [ ] **Step 2: Confirm `.env` is gitignored**

```bash
grep -E '^\.env(\..*)?$|^\.env$' .gitignore
```

Expected output includes `.env` and `.env.local` lines. If missing, fix `.gitignore` first.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "Document environment variables in .env.example"
```

---

## Task 7: Wire up `data/` directory and ensure SQLite path exists

**Files:**

- Create: `data/.gitkeep`

- [ ] **Step 1: Create the `data/` directory with a `.gitkeep`**

```bash
mkdir -p data
touch data/.gitkeep
```

- [ ] **Step 2: Confirm `data/` is gitignored except for the placeholder**

`.gitignore` already lists `data.db` and `data/`. We need to keep the directory but ignore its contents. Update `.gitignore`:

```bash
# Replace the line `data/` with the two lines below:
# data/*
# !data/.gitkeep
```

In the editor, find this section in `.gitignore`:

```
# SQLite database files
data.db
data.db-journal
data.db-wal
data.db-shm
data/
```

And replace with:

```
# SQLite database files
data.db
data.db-journal
data.db-wal
data.db-shm
data/*
!data/.gitkeep
```

- [ ] **Step 3: Verify `git status`**

```bash
git status
```

Expected: `data/.gitkeep` is the only file under `data/` that's tracked. `data/data.db` (when it exists later) is ignored.

- [ ] **Step 4: Commit**

```bash
git add data/.gitkeep .gitignore
git commit -m "Reserve data/ directory for SQLite while ignoring DB files"
```

---

## Task 8: Define the Drizzle schema (all 6 tables + sync_state)

**Files:**

- Create: `src/lib/server/db/schema.ts`

- [ ] **Step 1: Write the schema**

```ts
import {
	sqliteTable,
	text,
	integer,
	primaryKey,
	index,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ---------- launcher_config ----------
export const launcherConfig = sqliteTable('launcher_config', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	family: text('family'),
	fullName: text('full_name'),
	variant: text('variant'),
	description: text('description')
});

// ---------- booster (LL2 Launcher) ----------
export const booster = sqliteTable(
	'booster',
	{
		id: integer('id').primaryKey(),
		serialNumber: text('serial_number').notNull(),
		status: text('status').notNull(), // active | inactive | expended | lost | retired | unknown
		details: text('details'),
		flightProven: integer('flight_proven', { mode: 'boolean' }),
		flights: integer('flights').notNull().default(0),
		successfulLandings: integer('successful_landings').notNull().default(0),
		attemptedLandings: integer('attempted_landings').notNull().default(0),
		firstLaunchDate: text('first_launch_date'),
		lastLaunchDate: text('last_launch_date'),
		imageUrl: text('image_url'),
		launcherConfigId: integer('launcher_config_id').references(() => launcherConfig.id),
		ll2Url: text('ll2_url'),
		ll2LastSyncedAt: text('ll2_last_synced_at')
	},
	(t) => ({
		serialUnique: uniqueIndex('booster_serial_unique').on(t.serialNumber),
		statusIdx: index('booster_status_idx').on(t.status)
	})
);

// ---------- launchpad ----------
export const launchpad = sqliteTable(
	'launchpad',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		fullName: text('full_name'),
		location: text('location'),
		countryCode: text('country_code'),
		totalLaunches: integer('total_launches').default(0),
		imageUrl: text('image_url'),
		slug: text('slug').notNull()
	},
	(t) => ({
		slugUnique: uniqueIndex('launchpad_slug_unique').on(t.slug)
	})
);

// ---------- landing_location ----------
export const landingLocation = sqliteTable(
	'landing_location',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		abbrev: text('abbrev'),
		locationType: text('location_type').notNull(), // ASDS | RTLS | Ocean
		description: text('description'),
		successfulLandings: integer('successful_landings').default(0),
		attemptedLandings: integer('attempted_landings').default(0),
		slug: text('slug').notNull()
	},
	(t) => ({
		slugUnique: uniqueIndex('landing_location_slug_unique').on(t.slug)
	})
);

// ---------- launch ----------
export const launch = sqliteTable(
	'launch',
	{
		id: text('id').primaryKey(), // LL2 UUID string
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		status: text('status').notNull(), // success | failure | upcoming | in_flight | partial_failure
		net: text('net').notNull(), // ISO 8601 datetime
		windowStart: text('window_start'),
		windowEnd: text('window_end'),
		missionName: text('mission_name'),
		missionDescription: text('mission_description'),
		missionType: text('mission_type'),
		orbit: text('orbit'),
		customer: text('customer'),
		agencyId: integer('agency_id'),
		launchpadId: integer('launchpad_id').references(() => launchpad.id),
		rocketName: text('rocket_name'),
		imageUrl: text('image_url'),
		webcastUrl: text('webcast_url'),
		ll2LastSyncedAt: text('ll2_last_synced_at')
	},
	(t) => ({
		slugUnique: uniqueIndex('launch_slug_unique').on(t.slug),
		netIdx: index('launch_net_idx').on(t.net),
		statusIdx: index('launch_status_idx').on(t.status)
	})
);

// ---------- launch_booster (join) ----------
export const launchBooster = sqliteTable(
	'launch_booster',
	{
		launchId: text('launch_id')
			.notNull()
			.references(() => launch.id, { onDelete: 'cascade' }),
		boosterId: integer('booster_id')
			.notNull()
			.references(() => booster.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default(''), // '', 'core', 'side' (Falcon Heavy)
		flightNumber: integer('flight_number'),
		landingAttempted: integer('landing_attempted', { mode: 'boolean' }),
		landingSuccess: integer('landing_success', { mode: 'boolean' }),
		landingType: text('landing_type'), // ASDS | RTLS | Ocean | Expended
		landingLocationId: integer('landing_location_id').references(() => landingLocation.id)
	},
	(t) => ({
		pk: primaryKey({ columns: [t.launchId, t.boosterId, t.role] }),
		boosterIdx: index('launch_booster_booster_idx').on(t.boosterId),
		launchIdx: index('launch_booster_launch_idx').on(t.launchId)
	})
);

// ---------- sync_state (per-resource bookkeeping) ----------
export const syncState = sqliteTable('sync_state', {
	resource: text('resource').primaryKey(), // 'launches' | 'launchers' | 'launchpads' | 'launcher_configs'
	lastFullSyncAt: text('last_full_sync_at'),
	lastIncrementalSyncAt: text('last_incremental_sync_at'),
	nextUrl: text('next_url'),
	status: text('status').notNull().default('ok'), // ok | in_progress | error
	errorMessage: text('error_message')
});

// ---------- relations ----------
export const boosterRelations = relations(booster, ({ one, many }) => ({
	launcherConfig: one(launcherConfig, {
		fields: [booster.launcherConfigId],
		references: [launcherConfig.id]
	}),
	flights: many(launchBooster)
}));

export const launchRelations = relations(launch, ({ one, many }) => ({
	launchpad: one(launchpad, {
		fields: [launch.launchpadId],
		references: [launchpad.id]
	}),
	boosters: many(launchBooster)
}));

export const launchBoosterRelations = relations(launchBooster, ({ one }) => ({
	launch: one(launch, { fields: [launchBooster.launchId], references: [launch.id] }),
	booster: one(booster, { fields: [launchBooster.boosterId], references: [booster.id] }),
	landingLocation: one(landingLocation, {
		fields: [launchBooster.landingLocationId],
		references: [landingLocation.id]
	})
}));

// Convenience type aliases
export type Booster = typeof booster.$inferSelect;
export type BoosterInsert = typeof booster.$inferInsert;
export type Launch = typeof launch.$inferSelect;
export type LaunchInsert = typeof launch.$inferInsert;
export type Launchpad = typeof launchpad.$inferSelect;
export type LandingLocation = typeof landingLocation.$inferSelect;
export type LauncherConfig = typeof launcherConfig.$inferSelect;
export type LaunchBooster = typeof launchBooster.$inferSelect;
export type SyncState = typeof syncState.$inferSelect;
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/schema.ts
git commit -m "Define Drizzle schema for all entities + sync_state"
```

---

## Task 9: Add Drizzle config + migration generation

**Files:**

- Create: `drizzle.config.ts`

- [ ] **Step 1: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DATABASE_PATH ?? './data/data.db'
	},
	verbose: true,
	strict: true
});
```

- [ ] **Step 2: Generate the initial migration**

```bash
npm run db:generate
```

Expected: a new directory `drizzle/` appears containing `0000_*.sql` and `meta/` files.

- [ ] **Step 3: Inspect the generated SQL**

```bash
ls drizzle/
cat drizzle/0000_*.sql | head -60
```

Expected: SQL `CREATE TABLE` statements matching the schema. If it doesn't look right, fix the schema and regenerate.

- [ ] **Step 4: Commit**

```bash
git add drizzle.config.ts drizzle/
git commit -m "Add drizzle-kit config and generate initial migration"
```

---

## Task 10: DB client module + migration runner

**Files:**

- Create: `src/lib/server/db/client.ts`, `src/lib/server/db/migrate.ts`

- [ ] **Step 1: Write `src/lib/server/db/client.ts`**

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as schema from './schema';

const DATABASE_PATH = process.env.DATABASE_PATH ?? './data/data.db';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb() {
	if (_db) return _db;
	mkdirSync(dirname(DATABASE_PATH), { recursive: true });
	_sqlite = new Database(DATABASE_PATH);
	_sqlite.pragma('journal_mode = WAL');
	_sqlite.pragma('foreign_keys = ON');
	_db = drizzle(_sqlite, { schema });
	return _db;
}

export function getRawSqlite(): Database.Database {
	if (!_sqlite) getDb();
	return _sqlite!;
}

export function closeDb() {
	if (_sqlite) {
		_sqlite.close();
		_sqlite = null;
		_db = null;
	}
}
```

- [ ] **Step 2: Write `src/lib/server/db/migrate.ts`**

```ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client';

export function runMigrations() {
	const db = getDb();
	migrate(db, { migrationsFolder: './drizzle' });
}
```

- [ ] **Step 3: Type-check**

```bash
npm run check
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/db/
git commit -m "Add SQLite client wrapper and migration runner"
```

---

## Task 11: Bootstrap migrations on server start

**Files:**

- Create or modify: `src/hooks.server.ts`

- [ ] **Step 1: Write `src/hooks.server.ts`**

```ts
import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';

let booted = false;

function bootOnce() {
	if (booted) return;
	booted = true;
	runMigrations();
}

bootOnce();

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
```

- [ ] **Step 2: Smoke test — start dev server**

```bash
rm -f data/data.db   # ensure fresh DB
npm run dev -- --port 5173 &
DEV_PID=$!
sleep 3
ls -la data/data.db
kill $DEV_PID
```

Expected: `data/data.db` exists after the dev server starts (migrations ran).

- [ ] **Step 3: Inspect tables**

```bash
sqlite3 data/data.db '.tables'
```

Expected output (alphabetical):

```
__drizzle_migrations  launch_booster        launchpad
booster               launcher_config       sync_state
landing_location      launch
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks.server.ts
git commit -m "Run DB migrations at server boot"
```

---

## Task 12: Token-bucket rate limiter (TDD)

**Files:**

- Create: `src/lib/server/ll2/ratelimit.ts`
- Create: `tests/unit/ratelimit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ratelimit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';

describe('TokenBucket', () => {
	it('starts with a full bucket', async () => {
		const bucket = new TokenBucket({ capacity: 3, refillPerHour: 3, now: () => 0 });
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
	});

	it('refills tokens linearly over time', async () => {
		let now = 0;
		const bucket = new TokenBucket({ capacity: 2, refillPerHour: 2, now: () => now });
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);

		// Half an hour later: 1 token refills
		now = 1800_000;
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
	});

	it('caps tokens at capacity even after long idle', async () => {
		let now = 0;
		const bucket = new TokenBucket({ capacity: 2, refillPerHour: 2, now: () => now });
		now = 24 * 3600_000; // a day later
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
	});

	it('acquireBlocking waits until a token is available', async () => {
		let now = 0;
		const sleeps: number[] = [];
		const bucket = new TokenBucket({
			capacity: 1,
			refillPerHour: 60,
			now: () => now,
			sleep: async (ms) => {
				sleeps.push(ms);
				now += ms;
			}
		});
		expect(await bucket.tryAcquire()).toBe(true);
		await bucket.acquireBlocking();
		expect(sleeps.length).toBeGreaterThan(0);
		expect(sleeps[0]).toBeGreaterThanOrEqual(60_000); // 1 minute per refill at 60/hr
	});
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: fails with `Cannot find module '../../src/lib/server/ll2/ratelimit'`.

- [ ] **Step 3: Implement `src/lib/server/ll2/ratelimit.ts`**

```ts
type Options = {
	capacity: number;
	refillPerHour: number;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
};

export class TokenBucket {
	private tokens: number;
	private lastRefillMs: number;
	private readonly capacity: number;
	private readonly refillPerMs: number; // tokens per ms
	private readonly now: () => number;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(opts: Options) {
		this.capacity = opts.capacity;
		this.tokens = opts.capacity;
		this.refillPerMs = opts.refillPerHour / 3_600_000;
		this.now = opts.now ?? (() => Date.now());
		this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
		this.lastRefillMs = this.now();
	}

	private refill() {
		const t = this.now();
		const elapsed = t - this.lastRefillMs;
		if (elapsed <= 0) return;
		this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
		this.lastRefillMs = t;
	}

	async tryAcquire(): Promise<boolean> {
		this.refill();
		if (this.tokens >= 1) {
			this.tokens -= 1;
			return true;
		}
		return false;
	}

	async acquireBlocking(): Promise<void> {
		while (true) {
			this.refill();
			if (this.tokens >= 1) {
				this.tokens -= 1;
				return;
			}
			const tokensNeeded = 1 - this.tokens;
			const waitMs = Math.ceil(tokensNeeded / this.refillPerMs);
			await this.sleep(waitMs);
		}
	}
}
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/ll2/ratelimit.ts tests/unit/ratelimit.test.ts
git commit -m "Add token-bucket rate limiter for LL2 client"
```

---

## Task 13: Zod schemas for LL2 responses

**Files:**

- Create: `src/lib/server/ll2/schemas.ts`

LL2 returns data in a consistent paginated envelope. We model only the fields we care about; unexpected fields are passed through silently.

- [ ] **Step 1: Write `src/lib/server/ll2/schemas.ts`**

```ts
import { z } from 'zod';

const paginatedEnvelope = <T extends z.ZodTypeAny>(item: T) =>
	z.object({
		count: z.number(),
		next: z.string().nullable(),
		previous: z.string().nullable(),
		results: z.array(item)
	});

// ---------- Pad ----------
export const ll2PadSchema = z.object({
	id: z.number(),
	name: z.string(),
	location: z
		.object({
			name: z.string().optional(),
			country_code: z.string().optional()
		})
		.nullable()
		.optional(),
	total_launch_count: z.number().optional(),
	map_image: z.string().nullable().optional(),
	url: z.string().optional()
});
export type Ll2Pad = z.infer<typeof ll2PadSchema>;
export const ll2PadListSchema = paginatedEnvelope(ll2PadSchema);

// ---------- Launcher Config ----------
export const ll2LauncherConfigSchema = z.object({
	id: z.number(),
	name: z.string(),
	family: z.string().optional(),
	full_name: z.string().optional(),
	variant: z.string().optional(),
	description: z.string().optional()
});
export type Ll2LauncherConfig = z.infer<typeof ll2LauncherConfigSchema>;

// ---------- Launcher (Booster) ----------
export const ll2LauncherSchema = z.object({
	id: z.number(),
	url: z.string().optional(),
	flight_proven: z.boolean().optional(),
	serial_number: z.string(),
	status: z.string(),
	details: z.string().nullable().optional(),
	launcher_config: ll2LauncherConfigSchema.nullable().optional(),
	image_url: z.string().nullable().optional(),
	flights: z.number().optional(),
	last_launch_date: z.string().nullable().optional(),
	first_launch_date: z.string().nullable().optional(),
	attempted_landings: z.number().optional(),
	successful_landings: z.number().optional()
});
export type Ll2Launcher = z.infer<typeof ll2LauncherSchema>;
export const ll2LauncherListSchema = paginatedEnvelope(ll2LauncherSchema);

// ---------- Landing location ----------
export const ll2LandingLocationSchema = z.object({
	id: z.number(),
	name: z.string(),
	abbrev: z.string().optional(),
	description: z.string().optional(),
	location: z.object({ name: z.string().optional() }).optional(),
	successful_landings: z.union([z.number(), z.string()]).optional(),
	attempted_landings: z.union([z.number(), z.string()]).optional()
});
export type Ll2LandingLocation = z.infer<typeof ll2LandingLocationSchema>;

// ---------- Landing (nested in launcher_stage) ----------
export const ll2LandingSchema = z.object({
	attempt: z.boolean().optional(),
	success: z.boolean().nullable().optional(),
	description: z.string().optional(),
	location: ll2LandingLocationSchema.nullable().optional(),
	type: z.object({ name: z.string().optional(), abbrev: z.string().optional() }).optional()
});
export type Ll2Landing = z.infer<typeof ll2LandingSchema>;

// ---------- Launcher stage (per-booster on a launch) ----------
export const ll2LauncherStageSchema = z.object({
	id: z.number().optional(),
	type: z.string().optional(), // 'core', 'side', or omitted on Falcon 9
	reused: z.boolean().optional(),
	launcher_flight_number: z.number().nullable().optional(),
	launcher: ll2LauncherSchema.partial().extend({ id: z.number(), serial_number: z.string() }),
	landing: ll2LandingSchema.nullable().optional()
});
export type Ll2LauncherStage = z.infer<typeof ll2LauncherStageSchema>;

// ---------- Launch ----------
export const ll2LaunchSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
	slug: z.string().optional(),
	name: z.string(),
	status: z.object({ id: z.number(), name: z.string(), abbrev: z.string().optional() }),
	net: z.string(),
	window_start: z.string().nullable().optional(),
	window_end: z.string().nullable().optional(),
	image: z.string().nullable().optional(),
	webcast_live: z.boolean().optional(),
	vidURLs: z.array(z.object({ url: z.string() })).optional(),
	pad: ll2PadSchema.nullable().optional(),
	mission: z
		.object({
			name: z.string().optional(),
			description: z.string().optional(),
			type: z.string().optional(),
			orbit: z.object({ name: z.string().optional() }).nullable().optional()
		})
		.nullable()
		.optional(),
	rocket: z
		.object({
			configuration: z
				.object({
					id: z.number().optional(),
					name: z.string().optional(),
					full_name: z.string().optional()
				})
				.optional(),
			launcher_stage: z.array(ll2LauncherStageSchema).optional()
		})
		.optional(),
	launch_service_provider: z.object({ id: z.number(), name: z.string() }).optional()
});
export type Ll2Launch = z.infer<typeof ll2LaunchSchema>;
export const ll2LaunchListSchema = paginatedEnvelope(ll2LaunchSchema);
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/ll2/schemas.ts
git commit -m "Add Zod schemas for LL2 API responses"
```

---

## Task 14: LL2 fetch client with retry + rate limit (TDD)

**Files:**

- Create: `src/lib/server/ll2/client.ts`
- Create: `tests/unit/ll2-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ll2-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';

const ok = (body: unknown, init?: ResponseInit) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
		...init
	});

describe('Ll2Client', () => {
	it('returns parsed JSON on success', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(ok({ count: 0, next: null, previous: null, results: [] }));
		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
		});
		const r = await client.getJson('/pad/');
		expect(r).toEqual({ count: 0, next: null, previous: null, results: [] });
		expect(fetchMock).toHaveBeenCalledWith('https://example/2.2.0/pad/', expect.any(Object));
	});

	it('retries on 429 and succeeds eventually', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
			.mockResolvedValueOnce(ok({ ok: true }));
		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 }),
			retryDelayMs: 1
		});
		const r = await client.getJson<{ ok: boolean }>('/pad/');
		expect(r.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('throws after exceeding max retries', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 }),
			retryDelayMs: 1,
			maxRetries: 2
		});
		await expect(client.getJson('/pad/')).rejects.toThrow(/HTTP 500/);
		expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
	});

	it('sets Authorization header when api token is provided', async () => {
		const fetchMock = vi.fn().mockResolvedValue(ok({}));
		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 }),
			apiToken: 'secret-token'
		});
		await client.getJson('/pad/');
		const init = fetchMock.mock.calls[0][1];
		expect(init.headers).toMatchObject({ Authorization: 'Token secret-token' });
	});
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: fails — module not found.

- [ ] **Step 3: Implement `src/lib/server/ll2/client.ts`**

```ts
import type { TokenBucket } from './ratelimit';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type Ll2ClientOptions = {
	baseUrl: string;
	bucket: TokenBucket;
	fetch?: FetchLike;
	apiToken?: string;
	maxRetries?: number;
	retryDelayMs?: number;
	sleep?: (ms: number) => Promise<void>;
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class Ll2Client {
	private readonly baseUrl: string;
	private readonly bucket: TokenBucket;
	private readonly fetchImpl: FetchLike;
	private readonly apiToken?: string;
	private readonly maxRetries: number;
	private readonly retryDelayMs: number;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(opts: Ll2ClientOptions) {
		this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
		this.bucket = opts.bucket;
		this.fetchImpl = opts.fetch ?? (globalThis.fetch as FetchLike);
		this.apiToken = opts.apiToken;
		this.maxRetries = opts.maxRetries ?? 3;
		this.retryDelayMs = opts.retryDelayMs ?? 2000;
		this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
	}

	/** GET an absolute URL (used to follow `next` pagination cursors). */
	async getJsonAbs<T = unknown>(absoluteUrl: string): Promise<T> {
		const headers: Record<string, string> = { Accept: 'application/json' };
		if (this.apiToken) headers.Authorization = `Token ${this.apiToken}`;

		let attempt = 0;
		while (true) {
			await this.bucket.acquireBlocking();
			const res = await this.fetchImpl(absoluteUrl, { headers });
			if (res.ok) {
				return (await res.json()) as T;
			}
			if (RETRYABLE_STATUSES.has(res.status) && attempt < this.maxRetries) {
				const backoff = this.retryDelayMs * Math.pow(2, attempt);
				attempt += 1;
				await this.sleep(backoff);
				continue;
			}
			throw new Error(`HTTP ${res.status} fetching ${absoluteUrl}`);
		}
	}

	/** GET a path relative to baseUrl. */
	getJson<T = unknown>(path: string): Promise<T> {
		const url = path.startsWith('http')
			? path
			: `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
		return this.getJsonAbs<T>(url);
	}
}
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test
```

Expected: 4 tests pass (plus the 4 from Task 12).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/ll2/client.ts tests/unit/ll2-client.test.ts
git commit -m "Add LL2 fetch client with retry + rate limiting"
```

---

## Task 15: Generic upsert helper (TDD)

**Files:**

- Create: `src/lib/server/sync/upsert.ts`
- Create: `tests/integration/upsert.test.ts`
- Create: `tests/integration/_db.ts` (shared in-memory DB helper)

- [ ] **Step 1: Write the in-memory DB helper**

```ts
// tests/integration/_db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../../src/lib/server/db/schema';

export function makeTestDb() {
	const sqlite = new Database(':memory:');
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: './drizzle' });
	return { db, sqlite };
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/integration/upsert.test.ts
import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { upsertMany } from '../../src/lib/server/sync/upsert';
import { launchpad } from '../../src/lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('upsertMany', () => {
	it('inserts new rows', async () => {
		const { db } = makeTestDb();
		await upsertMany(
			db,
			launchpad,
			[
				{ id: 1, name: 'SLC-40', slug: 'slc-40', location: 'Cape Canaveral' },
				{ id: 2, name: 'LC-39A', slug: 'lc-39a', location: 'Kennedy' }
			],
			'id'
		);
		const rows = await db.select().from(launchpad);
		expect(rows).toHaveLength(2);
	});

	it('updates existing rows on conflict', async () => {
		const { db } = makeTestDb();
		await upsertMany(
			db,
			launchpad,
			[{ id: 1, name: 'SLC-40', slug: 'slc-40', location: 'Cape Canaveral' }],
			'id'
		);
		await upsertMany(
			db,
			launchpad,
			[{ id: 1, name: 'SLC-40', slug: 'slc-40', location: 'Updated Location' }],
			'id'
		);
		const [row] = await db.select().from(launchpad).where(eq(launchpad.id, 1));
		expect(row.location).toBe('Updated Location');
	});

	it('handles empty input gracefully', async () => {
		const { db } = makeTestDb();
		await expect(upsertMany(db, launchpad, [], 'id')).resolves.toBeUndefined();
	});
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
npm test
```

Expected: fails on missing module.

- [ ] **Step 4: Implement `src/lib/server/sync/upsert.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { type SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Upsert many rows by a single conflict key. Uses sqlite's
 * ON CONFLICT(<key>) DO UPDATE SET <every-other-col> = excluded.<col>.
 */
export async function upsertMany<T extends SQLiteTable>(
	db: BetterSQLite3Database<any>,
	table: T,
	rows: Array<Record<string, unknown>>,
	conflictKey: keyof T['_']['columns'] & string
): Promise<void> {
	if (rows.length === 0) return;

	const config = getTableConfig(table as SQLiteTable);
	const columnNames = config.columns.map((c) => c.name);
	const conflictColumn =
		config.columns.find((c) => (c as any).name === conflictKey)?.name ?? conflictKey;
	const updateCols = columnNames.filter((n) => n !== conflictColumn);

	const setClause = updateCols.map((c) => `"${c}" = excluded."${c}"`).join(', ');

	await db
		.insert(table as any)
		.values(rows as any)
		.onConflictDoUpdate({
			target: (table as any)[conflictKey],
			set: Object.fromEntries(updateCols.map((c) => [c, sql.raw(`excluded."${c}"`)]))
		});
}
```

> Note for the implementer: Drizzle's `onConflictDoUpdate` builds an UPSERT correctly; the `setClause` string above is illustrative for SQL clarity, but the implementation uses Drizzle's typed builder. If TypeScript complains about the column reference in `target`, cast as `(table as any)[conflictKey]`.

- [ ] **Step 5: Run to confirm passing**

```bash
npm test
```

Expected: 3 upsert tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/sync/upsert.ts tests/integration/_db.ts tests/integration/upsert.test.ts
git commit -m "Add generic upsertMany helper for sync workers"
```

---

## Task 16: Sync launchpads (TDD with fixture)

**Files:**

- Create: `tests/fixtures/ll2/pads.page1.json`
- Create: `src/lib/server/sync/launchpads.ts`
- Create: `tests/integration/sync-launchpads.test.ts`

- [ ] **Step 1: Write the fixture `tests/fixtures/ll2/pads.page1.json`**

```json
{
	"count": 2,
	"next": null,
	"previous": null,
	"results": [
		{
			"id": 80,
			"name": "Space Launch Complex 40",
			"location": { "name": "Cape Canaveral, FL, USA", "country_code": "USA" },
			"total_launch_count": 200,
			"map_image": "https://example.com/slc40.jpg"
		},
		{
			"id": 39,
			"name": "Launch Complex 39A",
			"location": { "name": "Kennedy Space Center, FL, USA", "country_code": "USA" },
			"total_launch_count": 50,
			"map_image": "https://example.com/lc39a.jpg"
		}
	]
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/integration/sync-launchpads.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeTestDb } from './_db';
import { syncLaunchpads } from '../../src/lib/server/sync/launchpads';
import { launchpad } from '../../src/lib/server/db/schema';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';

describe('syncLaunchpads', () => {
	it('upserts launchpads from a paginated LL2 response', async () => {
		const { db } = makeTestDb();
		const fixture = JSON.parse(readFileSync('tests/fixtures/ll2/pads.page1.json', 'utf-8'));

		const fetchMock = async () =>
			new Response(JSON.stringify(fixture), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});

		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock as any,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
		});

		await syncLaunchpads(db, client);

		const rows = await db.select().from(launchpad);
		expect(rows).toHaveLength(2);
		const slc40 = rows.find((r) => r.id === 80)!;
		expect(slc40.name).toBe('Space Launch Complex 40');
		expect(slc40.location).toBe('Cape Canaveral, FL, USA');
		expect(slc40.totalLaunches).toBe(200);
		expect(slc40.slug).toBe('space-launch-complex-40');
	});
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
npm test
```

Expected: missing module.

- [ ] **Step 4: Implement `src/lib/server/sync/launchpads.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Ll2Client } from '../ll2/client';
import { ll2PadListSchema } from '../ll2/schemas';
import { launchpad } from '../db/schema';
import { upsertMany } from './upsert';

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export async function syncLaunchpads(db: BetterSQLite3Database<any>, client: Ll2Client) {
	// Filter to SpaceX at the API level.
	let url: string | null = '/pad/?launch_service_provider__name=SpaceX&limit=100';
	while (url) {
		const raw = await client.getJson<unknown>(url);
		const parsed = ll2PadListSchema.parse(raw);
		const rows = parsed.results.map((p) => ({
			id: p.id,
			name: p.name,
			fullName: p.name,
			location: p.location?.name ?? null,
			countryCode: p.location?.country_code ?? null,
			totalLaunches: p.total_launch_count ?? 0,
			imageUrl: p.map_image ?? null,
			slug: slugify(p.name)
		}));
		await upsertMany(db, launchpad, rows, 'id');
		url = parsed.next ?? null;
	}
}
```

- [ ] **Step 5: Run to confirm passing**

```bash
npm test
```

Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/ll2/pads.page1.json src/lib/server/sync/launchpads.ts tests/integration/sync-launchpads.test.ts
git commit -m "Sync launchpads from LL2 with slug + upsert"
```

---

## Task 17: Sync boosters + launcher_configs (TDD)

**Files:**

- Create: `tests/fixtures/ll2/launchers.page1.json`
- Create: `src/lib/server/sync/boosters.ts`
- Create: `tests/integration/sync-boosters.test.ts`

- [ ] **Step 1: Write the fixture `tests/fixtures/ll2/launchers.page1.json`**

```json
{
	"count": 2,
	"next": null,
	"previous": null,
	"results": [
		{
			"id": 100,
			"url": "https://ll.thespacedevs.com/2.2.0/launcher/100/",
			"flight_proven": true,
			"serial_number": "B1058",
			"status": "lost",
			"details": "Veteran booster.",
			"launcher_config": {
				"id": 1,
				"name": "Falcon 9 Block 5",
				"family": "Falcon",
				"full_name": "Falcon 9 Block 5",
				"variant": "Block 5",
				"description": "Latest Falcon 9 variant"
			},
			"image_url": "https://example.com/b1058.jpg",
			"flights": 14,
			"last_launch_date": "2022-12-23T12:00:00Z",
			"first_launch_date": "2020-05-30T19:22:00Z",
			"attempted_landings": 14,
			"successful_landings": 13
		},
		{
			"id": 101,
			"url": "https://ll.thespacedevs.com/2.2.0/launcher/101/",
			"flight_proven": true,
			"serial_number": "B1067",
			"status": "active",
			"launcher_config": {
				"id": 1,
				"name": "Falcon 9 Block 5",
				"family": "Falcon"
			},
			"flights": 22,
			"first_launch_date": "2021-06-03T17:29:00Z",
			"last_launch_date": "2026-04-15T10:00:00Z",
			"attempted_landings": 22,
			"successful_landings": 22
		}
	]
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/integration/sync-boosters.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeTestDb } from './_db';
import { syncBoosters } from '../../src/lib/server/sync/boosters';
import { booster, launcherConfig } from '../../src/lib/server/db/schema';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';
import { eq } from 'drizzle-orm';

describe('syncBoosters', () => {
	it('upserts boosters and their launcher_configs', async () => {
		const { db } = makeTestDb();
		const fixture = JSON.parse(readFileSync('tests/fixtures/ll2/launchers.page1.json', 'utf-8'));

		const fetchMock = async () =>
			new Response(JSON.stringify(fixture), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});

		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock as any,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
		});

		await syncBoosters(db, client);

		const configs = await db.select().from(launcherConfig);
		expect(configs).toHaveLength(1);
		expect(configs[0].name).toBe('Falcon 9 Block 5');

		const rows = await db.select().from(booster);
		expect(rows).toHaveLength(2);
		const b1058 = rows.find((r) => r.serialNumber === 'B1058')!;
		expect(b1058.flights).toBe(14);
		expect(b1058.successfulLandings).toBe(13);
		expect(b1058.launcherConfigId).toBe(1);
	});
});
```

- [ ] **Step 3: Implement `src/lib/server/sync/boosters.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Ll2Client } from '../ll2/client';
import { ll2LauncherListSchema } from '../ll2/schemas';
import { booster, launcherConfig } from '../db/schema';
import { upsertMany } from './upsert';

export async function syncBoosters(db: BetterSQLite3Database<any>, client: Ll2Client) {
	let url: string | null = '/launcher/?launch_service_provider__name=SpaceX&limit=100';
	while (url) {
		const raw = await client.getJson<unknown>(url);
		const parsed = ll2LauncherListSchema.parse(raw);

		// Collect unique launcher_configs first so the FK is satisfied.
		const configsById = new Map<number, any>();
		for (const r of parsed.results) {
			const c = r.launcher_config;
			if (c && !configsById.has(c.id)) {
				configsById.set(c.id, {
					id: c.id,
					name: c.name,
					family: c.family ?? null,
					fullName: c.full_name ?? null,
					variant: c.variant ?? null,
					description: c.description ?? null
				});
			}
		}
		if (configsById.size > 0) {
			await upsertMany(db, launcherConfig, [...configsById.values()], 'id');
		}

		const rows = parsed.results.map((r) => ({
			id: r.id,
			serialNumber: r.serial_number,
			status: r.status,
			details: r.details ?? null,
			flightProven: r.flight_proven ?? null,
			flights: r.flights ?? 0,
			successfulLandings: r.successful_landings ?? 0,
			attemptedLandings: r.attempted_landings ?? 0,
			firstLaunchDate: r.first_launch_date ?? null,
			lastLaunchDate: r.last_launch_date ?? null,
			imageUrl: r.image_url ?? null,
			launcherConfigId: r.launcher_config?.id ?? null,
			ll2Url: r.url ?? null,
			ll2LastSyncedAt: new Date().toISOString()
		}));
		await upsertMany(db, booster, rows, 'id');

		url = parsed.next ?? null;
	}
}
```

- [ ] **Step 4: Run**

```bash
npm test
```

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/ll2/launchers.page1.json src/lib/server/sync/boosters.ts tests/integration/sync-boosters.test.ts
git commit -m "Sync boosters and launcher_configs from LL2"
```

---

## Task 18: Sync launches + launch_booster + landing_locations (TDD)

This is the most complex sync task. A single launch can carry 1 (Falcon 9) or 3 (Falcon Heavy) boosters with per-booster landing details. Landing locations are nested in the launch payload — we extract them into the `landing_location` table on the fly.

**Files:**

- Create: `tests/fixtures/ll2/launches.page1.json`
- Create: `src/lib/server/sync/launches.ts`
- Create: `tests/integration/sync-launches.test.ts`

- [ ] **Step 1: Write the fixture `tests/fixtures/ll2/launches.page1.json`**

```json
{
	"count": 2,
	"next": null,
	"previous": null,
	"results": [
		{
			"id": "abc-001",
			"url": "https://ll.thespacedevs.com/2.2.0/launch/abc-001/",
			"slug": "starlink-7-1",
			"name": "Falcon 9 Block 5 | Starlink Group 7-1",
			"status": { "id": 3, "name": "Launch Successful", "abbrev": "Success" },
			"net": "2026-04-15T10:00:00Z",
			"image": "https://example.com/launch1.jpg",
			"vidURLs": [{ "url": "https://youtube.com/watch?v=abc" }],
			"pad": {
				"id": 80,
				"name": "Space Launch Complex 40",
				"location": { "name": "Cape Canaveral, FL, USA", "country_code": "USA" }
			},
			"mission": {
				"name": "Starlink Group 7-1",
				"description": "Internet constellation deployment.",
				"type": "Communications",
				"orbit": { "name": "Low Earth Orbit" }
			},
			"rocket": {
				"configuration": { "id": 1, "name": "Falcon 9 Block 5", "full_name": "Falcon 9 Block 5" },
				"launcher_stage": [
					{
						"id": 9001,
						"type": "",
						"reused": true,
						"launcher_flight_number": 22,
						"launcher": { "id": 101, "serial_number": "B1067", "status": "active" },
						"landing": {
							"attempt": true,
							"success": true,
							"type": { "name": "ASDS", "abbrev": "ASDS" },
							"location": {
								"id": 5,
								"name": "Of Course I Still Love You",
								"abbrev": "OCISLY",
								"successful_landings": 50,
								"attempted_landings": 52
							}
						}
					}
				]
			},
			"launch_service_provider": { "id": 121, "name": "SpaceX" }
		},
		{
			"id": "abc-002",
			"url": "https://ll.thespacedevs.com/2.2.0/launch/abc-002/",
			"slug": "ussf-67",
			"name": "Falcon Heavy | USSF-67",
			"status": { "id": 3, "name": "Launch Successful", "abbrev": "Success" },
			"net": "2023-01-15T22:56:00Z",
			"pad": { "id": 39, "name": "Launch Complex 39A" },
			"mission": { "name": "USSF-67", "type": "Government" },
			"rocket": {
				"configuration": { "id": 2, "name": "Falcon Heavy" },
				"launcher_stage": [
					{
						"id": 9100,
						"type": "core",
						"launcher_flight_number": 1,
						"launcher": { "id": 200, "serial_number": "B1070", "status": "expended" },
						"landing": { "attempt": false }
					},
					{
						"id": 9101,
						"type": "side",
						"launcher_flight_number": 5,
						"launcher": { "id": 201, "serial_number": "B1064", "status": "active" },
						"landing": {
							"attempt": true,
							"success": true,
							"type": { "name": "RTLS" },
							"location": { "id": 1, "name": "Landing Zone 1", "abbrev": "LZ-1" }
						}
					},
					{
						"id": 9102,
						"type": "side",
						"launcher_flight_number": 5,
						"launcher": { "id": 202, "serial_number": "B1065", "status": "active" },
						"landing": {
							"attempt": true,
							"success": true,
							"type": { "name": "RTLS" },
							"location": { "id": 2, "name": "Landing Zone 2", "abbrev": "LZ-2" }
						}
					}
				]
			},
			"launch_service_provider": { "id": 121, "name": "SpaceX" }
		}
	]
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/integration/sync-launches.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeTestDb } from './_db';
import { syncLaunches } from '../../src/lib/server/sync/launches';
import { syncBoosters } from '../../src/lib/server/sync/boosters';
import { syncLaunchpads } from '../../src/lib/server/sync/launchpads';
import {
	launch,
	launchBooster,
	landingLocation,
	booster,
	launchpad
} from '../../src/lib/server/db/schema';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';
import { eq } from 'drizzle-orm';

function fixtureClient(filename: string) {
	const fixture = JSON.parse(readFileSync(`tests/fixtures/ll2/${filename}`, 'utf-8'));
	const fetchMock = async () =>
		new Response(JSON.stringify(fixture), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	return new Ll2Client({
		baseUrl: 'https://example/2.2.0',
		fetch: fetchMock as any,
		bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
	});
}

describe('syncLaunches', () => {
	it('handles Falcon 9 (1 booster) and Falcon Heavy (3 boosters) correctly', async () => {
		const { db } = makeTestDb();

		// Pre-populate launchpads + boosters (FK requirements).
		await syncLaunchpads(db, fixtureClient('pads.page1.json'));
		await syncBoosters(db, fixtureClient('launchers.page1.json'));

		// Manually insert the Heavy boosters that aren't in the launcher fixture.
		await db
			.insert(booster)
			.values([
				{
					id: 200,
					serialNumber: 'B1070',
					status: 'expended',
					flights: 1,
					successfulLandings: 0,
					attemptedLandings: 0
				},
				{
					id: 201,
					serialNumber: 'B1064',
					status: 'active',
					flights: 5,
					successfulLandings: 5,
					attemptedLandings: 5
				},
				{
					id: 202,
					serialNumber: 'B1065',
					status: 'active',
					flights: 5,
					successfulLandings: 5,
					attemptedLandings: 5
				}
			])
			.onConflictDoNothing();

		await syncLaunches(db, fixtureClient('launches.page1.json'));

		const launches = await db.select().from(launch);
		expect(launches).toHaveLength(2);

		// Falcon 9 launch
		const f9 = launches.find((l) => l.id === 'abc-001')!;
		expect(f9.missionType).toBe('Communications');
		expect(f9.orbit).toBe('Low Earth Orbit');
		expect(f9.webcastUrl).toBe('https://youtube.com/watch?v=abc');
		expect(f9.launchpadId).toBe(80);

		const f9Boosters = await db
			.select()
			.from(launchBooster)
			.where(eq(launchBooster.launchId, 'abc-001'));
		expect(f9Boosters).toHaveLength(1);
		expect(f9Boosters[0].boosterId).toBe(101);
		expect(f9Boosters[0].landingSuccess).toBe(true);

		// Falcon Heavy launch — 3 booster rows
		const fhBoosters = await db
			.select()
			.from(launchBooster)
			.where(eq(launchBooster.launchId, 'abc-002'));
		expect(fhBoosters).toHaveLength(3);
		const roles = fhBoosters.map((b) => b.role).sort();
		expect(roles).toEqual(['core', 'side', 'side']);

		// Landing locations were upserted from nested data
		const locs = await db.select().from(landingLocation);
		const locNames = locs.map((l) => l.name).sort();
		expect(locNames).toEqual(['Landing Zone 1', 'Landing Zone 2', 'Of Course I Still Love You']);
	});
});
```

- [ ] **Step 3: Implement `src/lib/server/sync/launches.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import type { Ll2Client } from '../ll2/client';
import { ll2LaunchListSchema, type Ll2Launch, type Ll2LandingLocation } from '../ll2/schemas';
import { launch, launchBooster, landingLocation } from '../db/schema';
import { upsertMany } from './upsert';
import { slugify } from './launchpads';

function deriveSlug(l: Ll2Launch): string {
	if (l.slug) return l.slug;
	const base = l.mission?.name ?? l.name;
	return slugify(base) || l.id;
}

function statusToken(name: string): string {
	// Map LL2's display status to our enum tokens.
	const lower = name.toLowerCase();
	if (lower.includes('success')) return 'success';
	if (lower.includes('failure')) return 'failure';
	if (lower.includes('partial')) return 'partial_failure';
	if (lower.includes('go') || lower.includes('tbd')) return 'upcoming';
	if (lower.includes('flight')) return 'in_flight';
	return 'unknown';
}

function landingTypeToken(
	loc: Ll2LandingLocation | null | undefined,
	typeName: string | undefined
): string | null {
	if (typeName) return typeName;
	return loc?.location?.name ?? null;
}

export async function syncLaunches(db: BetterSQLite3Database<any>, client: Ll2Client) {
	let url: string | null = '/launch/?lsp__name=SpaceX&limit=50&mode=detailed';
	while (url) {
		const raw = await client.getJson<unknown>(url);
		const parsed = ll2LaunchListSchema.parse(raw);

		// Collect landing locations first so launch_booster FKs are satisfied.
		const locById = new Map<number, any>();
		for (const l of parsed.results) {
			for (const stage of l.rocket?.launcher_stage ?? []) {
				const loc = stage.landing?.location;
				if (loc && !locById.has(loc.id)) {
					locById.set(loc.id, {
						id: loc.id,
						name: loc.name,
						abbrev: loc.abbrev ?? null,
						description: loc.description ?? null,
						locationType: stage.landing?.type?.name ?? 'Unknown',
						successfulLandings:
							typeof loc.successful_landings === 'number' ? loc.successful_landings : 0,
						attemptedLandings:
							typeof loc.attempted_landings === 'number' ? loc.attempted_landings : 0,
						slug: slugify(loc.abbrev ?? loc.name)
					});
				}
			}
		}
		if (locById.size > 0) {
			await upsertMany(db, landingLocation, [...locById.values()], 'id');
		}

		// Upsert launches.
		const launchRows = parsed.results.map((l) => ({
			id: l.id,
			slug: deriveSlug(l),
			name: l.name,
			status: statusToken(l.status.name),
			net: l.net,
			windowStart: l.window_start ?? null,
			windowEnd: l.window_end ?? null,
			missionName: l.mission?.name ?? null,
			missionDescription: l.mission?.description ?? null,
			missionType: l.mission?.type ?? null,
			orbit: l.mission?.orbit?.name ?? null,
			customer: null,
			agencyId: l.launch_service_provider?.id ?? null,
			launchpadId: l.pad?.id ?? null,
			rocketName: l.rocket?.configuration?.name ?? null,
			imageUrl: l.image ?? null,
			webcastUrl: l.vidURLs?.[0]?.url ?? null,
			ll2LastSyncedAt: new Date().toISOString()
		}));
		await upsertMany(db, launch, launchRows, 'id');

		// Upsert launch_booster join rows. Replace any existing rows for the
		// launches we just synced to keep the join clean.
		const launchIds = parsed.results.map((l) => l.id);
		if (launchIds.length > 0) {
			await db.delete(launchBooster).where(sql`launch_id IN ${launchIds}`);
		}

		const joinRows: Array<typeof launchBooster.$inferInsert> = [];
		for (const l of parsed.results) {
			for (const stage of l.rocket?.launcher_stage ?? []) {
				joinRows.push({
					launchId: l.id,
					boosterId: stage.launcher.id,
					role: stage.type ?? '',
					flightNumber: stage.launcher_flight_number ?? null,
					landingAttempted: stage.landing?.attempt ?? null,
					landingSuccess: stage.landing?.success ?? null,
					landingType: stage.landing?.type?.name ?? null,
					landingLocationId: stage.landing?.location?.id ?? null
				});
			}
		}
		if (joinRows.length > 0) {
			await db.insert(launchBooster).values(joinRows).onConflictDoNothing();
		}

		url = parsed.next ?? null;
	}
}
```

- [ ] **Step 4: Run**

```bash
npm test
```

Expected: passes — Falcon 9 + Falcon Heavy fixtures both upsert correctly.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/ll2/launches.page1.json src/lib/server/sync/launches.ts tests/integration/sync-launches.test.ts
git commit -m "Sync launches with launch_booster join and landing locations"
```

---

## Task 19: Sync orchestrator (full + incremental) and sync_state tracking

**Files:**

- Create: `src/lib/server/sync/orchestrator.ts`

- [ ] **Step 1: Write `src/lib/server/sync/orchestrator.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import type { Ll2Client } from '../ll2/client';
import { syncLaunchpads } from './launchpads';
import { syncBoosters } from './boosters';
import { syncLaunches } from './launches';
import { syncState } from '../db/schema';

type ResourceName = 'launchpads' | 'boosters' | 'launches';

async function setStatus(
	db: BetterSQLite3Database<any>,
	resource: ResourceName,
	patch: Partial<typeof syncState.$inferInsert>
) {
	const existing = await db.select().from(syncState).where(eq(syncState.resource, resource));
	if (existing.length === 0) {
		await db.insert(syncState).values({ resource, status: 'ok', ...patch });
	} else {
		await db.update(syncState).set(patch).where(eq(syncState.resource, resource));
	}
}

async function runResource(
	db: BetterSQLite3Database<any>,
	resource: ResourceName,
	fn: () => Promise<void>,
	fullSync: boolean
) {
	await setStatus(db, resource, { status: 'in_progress', errorMessage: null });
	try {
		await fn();
		const ts = new Date().toISOString();
		await setStatus(db, resource, {
			status: 'ok',
			...(fullSync ? { lastFullSyncAt: ts } : { lastIncrementalSyncAt: ts })
		});
	} catch (err) {
		await setStatus(db, resource, {
			status: 'error',
			errorMessage: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

export async function fullSync(db: BetterSQLite3Database<any>, client: Ll2Client) {
	// Order matters: pads/boosters before launches because launches reference both.
	await runResource(db, 'launchpads', () => syncLaunchpads(db, client), true);
	await runResource(db, 'boosters', () => syncBoosters(db, client), true);
	await runResource(db, 'launches', () => syncLaunches(db, client), true);
}

export async function incrementalSync(db: BetterSQLite3Database<any>, client: Ll2Client) {
	// For Phase 1 incremental == refresh upcoming + last 30 days of launches,
	// and re-fetch boosters (their flight counts change after each launch).
	await runResource(db, 'boosters', () => syncBoosters(db, client), false);
	await runResource(db, 'launches', () => syncLaunches(db, client), false);
}
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/sync/orchestrator.ts
git commit -m "Add sync orchestrator with sync_state tracking"
```

---

## Task 20: Schedule sync jobs with node-cron

**Files:**

- Create: `src/lib/server/sync/scheduler.ts`
- Modify: `src/hooks.server.ts`

- [ ] **Step 1: Write `src/lib/server/sync/scheduler.ts`**

```ts
import cron from 'node-cron';
import { getDb } from '../db/client';
import { Ll2Client } from '../ll2/client';
import { TokenBucket } from '../ll2/ratelimit';
import { fullSync, incrementalSync } from './orchestrator';

let started = false;

export function startScheduler() {
	if (started) return;
	started = true;

	const baseUrl = process.env.LL2_BASE_URL ?? 'https://lldev.thespacedevs.com/2.2.0';
	const apiToken = process.env.LL2_API_TOKEN || undefined;
	const fullCron = process.env.SYNC_FULL_CRON ?? '0 3 * * *';
	const incCron = process.env.SYNC_INCREMENTAL_CRON ?? '*/30 * * * *';

	// 15 req/hour matches LL2 free tier; with a token, raise it.
	const bucket = new TokenBucket({ capacity: 15, refillPerHour: apiToken ? 200 : 15 });
	const client = new Ll2Client({ baseUrl, apiToken, bucket });
	const db = getDb();

	cron.schedule(fullCron, async () => {
		try {
			await fullSync(db, client);
		} catch (err) {
			console.error('Full sync failed:', err);
		}
	});

	cron.schedule(incCron, async () => {
		try {
			await incrementalSync(db, client);
		} catch (err) {
			console.error('Incremental sync failed:', err);
		}
	});

	console.log(`[scheduler] full=${fullCron} incremental=${incCron} baseUrl=${baseUrl}`);
}
```

- [ ] **Step 2: Wire into `src/hooks.server.ts`** — replace the existing file with:

```ts
import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';
import { startScheduler } from '$lib/server/sync/scheduler';

let booted = false;
function bootOnce() {
	if (booted) return;
	booted = true;
	runMigrations();
	if (process.env.NODE_ENV !== 'test') {
		startScheduler();
	}
}

bootOnce();

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};
```

- [ ] **Step 3: Smoke test — start dev server, confirm scheduler logs**

```bash
LL2_BASE_URL=https://lldev.thespacedevs.com/2.2.0 npm run dev -- --port 5173 &
DEV_PID=$!
sleep 3
kill $DEV_PID
```

Expected console contains: `[scheduler] full=0 3 * * * incremental=*/30 * * * * baseUrl=https://lldev.thespacedevs.com/2.2.0`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/sync/scheduler.ts src/hooks.server.ts
git commit -m "Wire node-cron scheduler for full + incremental syncs"
```

---

## Task 21: `npm run seed` script for first-time setup

**Files:**

- Create: `src/lib/seed.ts`

- [ ] **Step 1: Write `src/lib/seed.ts`**

```ts
import 'dotenv/config';
import { getDb } from './server/db/client';
import { runMigrations } from './server/db/migrate';
import { Ll2Client } from './server/ll2/client';
import { TokenBucket } from './server/ll2/ratelimit';
import { fullSync } from './server/sync/orchestrator';

async function main() {
	console.log('[seed] running migrations...');
	runMigrations();
	const db = getDb();

	const baseUrl = process.env.LL2_BASE_URL ?? 'https://lldev.thespacedevs.com/2.2.0';
	const apiToken = process.env.LL2_API_TOKEN || undefined;
	const bucket = new TokenBucket({ capacity: 15, refillPerHour: apiToken ? 200 : 15 });
	const client = new Ll2Client({ baseUrl, apiToken, bucket });

	console.log(`[seed] starting full sync from ${baseUrl}...`);
	const start = Date.now();
	await fullSync(db, client);
	console.log(`[seed] done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
	console.error('[seed] failed:', err);
	process.exit(1);
});
```

- [ ] **Step 2: Install `dotenv`**

```bash
npm install dotenv
```

- [ ] **Step 3: Smoke test — run seed against the dev mirror**

```bash
LL2_BASE_URL=https://lldev.thespacedevs.com/2.2.0 npm run seed
```

Expected: logs migrations, then `starting full sync from ...`, then a `done in X.Xs` line. SQLite at `data/data.db` should now contain real SpaceX data.

```bash
sqlite3 data/data.db 'SELECT COUNT(*) FROM booster;'
sqlite3 data/data.db 'SELECT COUNT(*) FROM launch;'
```

Expected: counts > 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/seed.ts package.json package-lock.json
git commit -m "Add npm run seed for first-time DB population"
```

---

## Task 22: Paraglide i18n scaffold (en only)

**Files:**

- Create: `project.inlang/settings.json`
- Create: `messages/en.json`
- Modify: `vite.config.ts` (add Paraglide plugin)
- Modify: `package.json` (compile script — most paraglide setups auto-compile via vite plugin)

- [ ] **Step 1: Initialize Paraglide via the official CLI**

```bash
npx @inlang/paraglide-js@latest init
```

Accept defaults when prompted; specify `en` as the source locale and `en` as the only locale for now. The CLI creates `project.inlang/settings.json` and `messages/en.json`.

If the CLI is not interactive in this environment, write the files manually:

`project.inlang/settings.json`:

```json
{
	"$schema": "https://inlang.com/schema/project-settings",
	"baseLocale": "en",
	"locales": ["en"],
	"modules": [
		"https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-empty-pattern@latest/dist/index.js",
		"https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-missing-translation@latest/dist/index.js"
	]
}
```

`messages/en.json` (initial keys we'll need):

```json
{
	"$schema": "https://inlang.com/schema/inlang-message-format",
	"site_title": "Booster Tracker",
	"nav_boosters": "Boosters",
	"boosters_page_title": "Boosters",
	"boosters_count_summary": "Showing {filtered} of {total}",
	"agg_total_flights": "Total flights",
	"agg_avg_flights": "Avg flights",
	"agg_total_landings": "Total landings",
	"agg_landing_success_rate": "Landing success rate",
	"agg_avg_turnaround_days": "Avg turnaround (days)",
	"col_serial_number": "Serial",
	"col_status": "Status",
	"col_flights": "Flights",
	"col_first_launch_date": "First flight",
	"col_last_launch_date": "Last flight",
	"col_days_since_last_flight": "Days since",
	"col_successful_landings": "Successful landings",
	"col_attempted_landings": "Attempted landings",
	"col_block": "Block",
	"btn_export_csv": "Export CSV",
	"btn_export_json": "Export JSON",
	"btn_columns": "Columns",
	"btn_add_filter": "Add filter",
	"btn_save_view": "Save view",
	"btn_clear_filters": "Clear filters",
	"filter_placeholder_search": "Search...",
	"status_active": "Active",
	"status_inactive": "Inactive",
	"status_expended": "Expended",
	"status_lost": "Lost",
	"status_retired": "Retired",
	"status_unknown": "Unknown",
	"detail_flight_history": "Flight history",
	"detail_landing_breakdown": "Landing record",
	"detail_no_flights": "No flights yet."
}
```

- [ ] **Step 2: Install the Paraglide Vite + SvelteKit adapters**

```bash
npm install -D @inlang/paraglide-vite @inlang/paraglide-sveltekit
```

- [ ] **Step 3: Wire Paraglide into `vite.config.ts`**

Replace `vite.config.ts` with:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		paraglide({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		}),
		sveltekit()
	],
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.test.ts'] }
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/integration/**/*.test.ts']
				}
			}
		]
	}
});
```

- [ ] **Step 4: Generate Paraglide runtime once**

```bash
npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

Expected: `src/lib/paraglide/` populated with runtime + per-message functions.

- [ ] **Step 5: Add `src/lib/paraglide/` to `.gitignore`**

Append to `.gitignore`:

```
# Paraglide compiled output (regenerated by Vite plugin)
src/lib/paraglide/
```

- [ ] **Step 6: Smoke test build**

```bash
npm run build
```

Expected: build succeeds with Paraglide messages compiled.

- [ ] **Step 7: Commit**

```bash
git add project.inlang/ messages/ vite.config.ts package.json package-lock.json .gitignore
git commit -m "Scaffold Paraglide i18n with English source messages"
```

---

## Task 23: Locale routing (en-only for Phase 1; structure for future locales)

**Files:**

- Modify: `src/hooks.server.ts`
- Create: `src/lib/i18n/runtime.ts`

For Phase 1 we only ship `en`, so we do **not** prefix URLs (`/boosters` is `en` by default). The locale resolver picks `en` and stores it on `event.locals` so layouts/pages can use `Intl.*` formatters keyed off it. Phase 3 will extend this to read URL prefixes / `Accept-Language`.

- [ ] **Step 1: Write `src/lib/i18n/runtime.ts`**

```ts
import * as m from '$lib/paraglide/messages';
import { setLocale, getLocale, baseLocale, locales } from '$lib/paraglide/runtime';

export { m, setLocale, getLocale, baseLocale, locales };

export function formatDate(iso: string | null, locale: string = baseLocale): string {
	if (!iso) return '';
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatNumber(n: number | null | undefined, locale: string = baseLocale): string {
	if (n == null) return '';
	return new Intl.NumberFormat(locale).format(n);
}

export function formatDaysSince(
	iso: string | null,
	locale: string = baseLocale,
	now: Date = new Date()
): string {
	if (!iso) return '';
	const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
	return new Intl.NumberFormat(locale).format(days);
}
```

- [ ] **Step 2: Update `src/hooks.server.ts`** — replace the existing file with:

```ts
import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';
import { startScheduler } from '$lib/server/sync/scheduler';
import { setLocale, baseLocale } from '$lib/i18n/runtime';

let booted = false;
function bootOnce() {
	if (booted) return;
	booted = true;
	runMigrations();
	if (process.env.NODE_ENV !== 'test') {
		startScheduler();
	}
}

bootOnce();

export const handle: Handle = async ({ event, resolve }) => {
	// Phase 1: lock locale to baseLocale (en). Phase 3 extends this with
	// URL-prefix detection, Accept-Language fallback, and language switcher.
	setLocale(baseLocale);
	event.locals.locale = baseLocale;
	return resolve(event);
};
```

- [ ] **Step 3: Update `src/app.d.ts`** to type `locals.locale`. Find the `Locals` interface block and add:

```ts
declare global {
	namespace App {
		interface Locals {
			locale: string;
		}
	}
}
export {};
```

- [ ] **Step 4: Type-check + build**

```bash
npm run check
npm run build
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/ src/hooks.server.ts src/app.d.ts
git commit -m "Wire Paraglide runtime into hooks and locals"
```

---

## Task 24: URL state codec (TDD)

The codec encodes view state (`{filters, sort, visibleCols, page}`) into a single compact URL parameter `?v=<base64-json>`. Used by every table page; tested in isolation.

**Files:**

- Create: `src/lib/url-state.ts`
- Create: `tests/unit/url-state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/url-state.test.ts
import { describe, it, expect } from 'vitest';
import { encodeViewState, decodeViewState } from '../../src/lib/url-state';

describe('url-state codec', () => {
	it('round-trips a simple state', () => {
		const state = {
			filters: [{ id: 'status', op: 'in', value: ['active'] }],
			sort: [{ id: 'flights', desc: true }],
			visibleCols: ['serial_number', 'status', 'flights'],
			page: 0
		};
		const encoded = encodeViewState(state);
		expect(typeof encoded).toBe('string');
		expect(encoded).not.toContain('{');
		const decoded = decodeViewState(encoded);
		expect(decoded).toEqual(state);
	});

	it('returns null for malformed input', () => {
		expect(decodeViewState('not-base64-😅')).toBeNull();
		expect(decodeViewState('')).toBeNull();
		expect(decodeViewState(null)).toBeNull();
	});

	it('uses URL-safe characters only', () => {
		const state = { filters: [], sort: [], visibleCols: [], page: 0 };
		const encoded = encodeViewState(state);
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it("rejects schemas that don't look like view state", () => {
		const buf = Buffer.from(JSON.stringify({ unrelated: true })).toString('base64url');
		expect(decodeViewState(buf)).toBeNull();
	});
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test
```

Expected: missing module.

- [ ] **Step 3: Implement `src/lib/url-state.ts`**

```ts
export type FilterClause = { id: string; op: string; value: unknown };
export type SortClause = { id: string; desc: boolean };

export type ViewState = {
	filters: FilterClause[];
	sort: SortClause[];
	visibleCols: string[];
	page: number;
};

export const EMPTY_VIEW_STATE: ViewState = { filters: [], sort: [], visibleCols: [], page: 0 };

function isViewState(x: unknown): x is ViewState {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	return (
		Array.isArray(o.filters) &&
		Array.isArray(o.sort) &&
		Array.isArray(o.visibleCols) &&
		typeof o.page === 'number'
	);
}

// Universal base64url codec — works in both Node and the browser.
// We avoid `Buffer` so this module can run unchanged in Svelte components
// that need to encode state when navigating client-side.

function utf8ToBytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}
function bytesToUtf8(b: Uint8Array): string {
	return new TextDecoder().decode(b);
}
function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	// btoa is available in browsers and in Node 18+ globally
	return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
}
function base64ToBytes(b64: string): Uint8Array {
	const bin =
		typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}
function toBase64Url(input: string): string {
	return bytesToBase64(utf8ToBytes(input))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}
function fromBase64Url(input: string): string {
	const padded =
		input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
	return bytesToUtf8(base64ToBytes(padded));
}

export function encodeViewState(state: ViewState): string {
	return toBase64Url(JSON.stringify(state));
}

export function decodeViewState(encoded: string | null | undefined): ViewState | null {
	if (!encoded) return null;
	try {
		const json = fromBase64Url(encoded);
		const parsed = JSON.parse(json);
		if (!isViewState(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
```

- [ ] **Step 4: Run to confirm passing**

```bash
npm test
```

Expected: 4 url-state tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-state.ts tests/unit/url-state.test.ts
git commit -m "Add base64-URL view state codec for table pages"
```

---

## Task 25: Boosters column metadata + filter type model

**Files:**

- Create: `src/lib/server/boosters/columns.ts`
- Create: `src/lib/server/boosters/filters.ts`
- Create: `tests/unit/filters.test.ts`

- [ ] **Step 1: Write `src/lib/server/boosters/columns.ts`**

```ts
import type { booster } from '../db/schema';

export type FilterType =
	| { kind: 'enum'; options: readonly string[] }
	| { kind: 'numberRange' }
	| { kind: 'dateRange' }
	| { kind: 'text' }
	| { kind: 'boolean' };

export type ColumnDef = {
	id: string; // matches schema column name (snake_case)
	label: string; // i18n key
	filter?: FilterType;
	defaultVisible: boolean;
};

export const BOOSTER_STATUSES = [
	'active',
	'inactive',
	'expended',
	'lost',
	'retired',
	'unknown'
] as const;

export const BOOSTER_COLUMNS: readonly ColumnDef[] = [
	{
		id: 'serial_number',
		label: 'col_serial_number',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{
		id: 'status',
		label: 'col_status',
		filter: { kind: 'enum', options: BOOSTER_STATUSES },
		defaultVisible: true
	},
	{ id: 'flights', label: 'col_flights', filter: { kind: 'numberRange' }, defaultVisible: true },
	{
		id: 'first_launch_date',
		label: 'col_first_launch_date',
		filter: { kind: 'dateRange' },
		defaultVisible: true
	},
	{
		id: 'last_launch_date',
		label: 'col_last_launch_date',
		filter: { kind: 'dateRange' },
		defaultVisible: true
	},
	{
		id: 'days_since_last_flight',
		label: 'col_days_since_last_flight',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	},
	{
		id: 'successful_landings',
		label: 'col_successful_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: false
	},
	{
		id: 'attempted_landings',
		label: 'col_attempted_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: false
	},
	{ id: 'block', label: 'col_block', filter: { kind: 'text' }, defaultVisible: false }
];

export const BOOSTER_DEFAULT_VISIBLE = BOOSTER_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/filters.test.ts
import { describe, it, expect } from 'vitest';
import { validateFilter } from '../../src/lib/server/boosters/filters';
import { BOOSTER_COLUMNS } from '../../src/lib/server/boosters/columns';

describe('validateFilter (boosters)', () => {
	it('accepts an enum filter for status with valid values', () => {
		const result = validateFilter(BOOSTER_COLUMNS, {
			id: 'status',
			op: 'in',
			value: ['active', 'lost']
		});
		expect(result.ok).toBe(true);
	});

	it('rejects an enum filter with unknown values', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'status', op: 'in', value: ['nope'] });
		expect(result.ok).toBe(false);
	});

	it('accepts a number-range filter on flights', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'flights', op: 'gte', value: 10 });
		expect(result.ok).toBe(true);
	});

	it('rejects a number-range filter on a text column', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'serial_number', op: 'gte', value: 10 });
		expect(result.ok).toBe(false);
	});

	it('rejects unknown column IDs', () => {
		const result = validateFilter(BOOSTER_COLUMNS, { id: 'made_up', op: 'in', value: [] });
		expect(result.ok).toBe(false);
	});
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
npm test
```

Expected: missing module.

- [ ] **Step 4: Implement `src/lib/server/boosters/filters.ts`**

```ts
import type { ColumnDef } from './columns';
import type { FilterClause } from '../../url-state';

export type ValidationResult = { ok: true } | { ok: false; reason: string };

const NUMBER_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);
const DATE_OPS = new Set(['eq', 'gt', 'gte', 'lt', 'lte', 'between']);
const TEXT_OPS = new Set(['contains', 'eq', 'startsWith']);
const ENUM_OPS = new Set(['in', 'eq']);
const BOOL_OPS = new Set(['eq']);

export function validateFilter(
	columns: readonly ColumnDef[],
	clause: FilterClause
): ValidationResult {
	const col = columns.find((c) => c.id === clause.id);
	if (!col) return { ok: false, reason: `unknown column ${clause.id}` };
	if (!col.filter) return { ok: false, reason: `column ${col.id} is not filterable` };

	switch (col.filter.kind) {
		case 'enum':
			if (!ENUM_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for enum` };
			if (clause.op === 'in') {
				if (!Array.isArray(clause.value)) return { ok: false, reason: 'in requires array' };
				for (const v of clause.value) {
					if (typeof v !== 'string' || !col.filter.options.includes(v)) {
						return { ok: false, reason: `unknown enum value ${String(v)}` };
					}
				}
			} else {
				if (typeof clause.value !== 'string' || !col.filter.options.includes(clause.value)) {
					return { ok: false, reason: 'unknown enum value' };
				}
			}
			return { ok: true };

		case 'numberRange':
			if (!NUMBER_OPS.has(clause.op))
				return { ok: false, reason: `bad op ${clause.op} for number` };
			if (typeof clause.value !== 'number' || !Number.isFinite(clause.value))
				return { ok: false, reason: 'number value required' };
			return { ok: true };

		case 'dateRange':
			if (!DATE_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for date` };
			if (clause.op === 'between') {
				if (!Array.isArray(clause.value) || clause.value.length !== 2)
					return { ok: false, reason: 'between requires [start, end]' };
				if (!clause.value.every((v) => typeof v === 'string'))
					return { ok: false, reason: 'date strings required' };
			} else if (typeof clause.value !== 'string') {
				return { ok: false, reason: 'date string required' };
			}
			return { ok: true };

		case 'text':
			if (!TEXT_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for text` };
			if (typeof clause.value !== 'string') return { ok: false, reason: 'string value required' };
			return { ok: true };

		case 'boolean':
			if (!BOOL_OPS.has(clause.op)) return { ok: false, reason: `bad op ${clause.op} for boolean` };
			if (typeof clause.value !== 'boolean') return { ok: false, reason: 'boolean value required' };
			return { ok: true };
	}
}

export function validateFilters(
	columns: readonly ColumnDef[],
	clauses: FilterClause[]
): { valid: FilterClause[]; rejected: { clause: FilterClause; reason: string }[] } {
	const valid: FilterClause[] = [];
	const rejected: { clause: FilterClause; reason: string }[] = [];
	for (const c of clauses) {
		const result = validateFilter(columns, c);
		if (result.ok) valid.push(c);
		else rejected.push({ clause: c, reason: (result as { ok: false; reason: string }).reason });
	}
	return { valid, rejected };
}
```

- [ ] **Step 5: Run to confirm passing**

```bash
npm test
```

Expected: 5 filter tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/boosters/columns.ts src/lib/server/boosters/filters.ts tests/unit/filters.test.ts
git commit -m "Define booster column metadata and filter validation"
```

---

## Task 26: Boosters query builder + sort + pagination (TDD)

**Files:**

- Create: `src/lib/server/boosters/query.ts`
- Create: `tests/integration/query.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/query.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { makeTestDb } from './_db';
import { booster } from '../../src/lib/server/db/schema';
import { runBoostersQuery } from '../../src/lib/server/boosters/query';

async function seed(db: ReturnType<typeof makeTestDb>['db']) {
	await db.insert(booster).values([
		{
			id: 1,
			serialNumber: 'B1058',
			status: 'lost',
			flights: 14,
			successfulLandings: 13,
			attemptedLandings: 14,
			lastLaunchDate: '2022-12-23T12:00:00Z'
		},
		{
			id: 2,
			serialNumber: 'B1067',
			status: 'active',
			flights: 22,
			successfulLandings: 22,
			attemptedLandings: 22,
			lastLaunchDate: '2026-04-15T10:00:00Z'
		},
		{
			id: 3,
			serialNumber: 'B1077',
			status: 'active',
			flights: 5,
			successfulLandings: 5,
			attemptedLandings: 5,
			lastLaunchDate: '2026-03-01T10:00:00Z'
		},
		{
			id: 4,
			serialNumber: 'B1071',
			status: 'retired',
			flights: 10,
			successfulLandings: 9,
			attemptedLandings: 10,
			lastLaunchDate: '2024-06-01T10:00:00Z'
		}
	]);
}

describe('runBoostersQuery', () => {
	it('returns all rows with no filter', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, { filters: [], sort: [], page: 0, pageSize: 50 });
		expect(r.total).toBe(4);
		expect(r.rows).toHaveLength(4);
	});

	it('filters by status enum', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [{ id: 'status', op: 'in', value: ['active'] }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
		expect(r.rows.map((b) => b.serialNumber).sort()).toEqual(['B1067', 'B1077']);
	});

	it('filters by flights >= 10', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [{ id: 'flights', op: 'gte', value: 10 }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(3);
	});

	it('sorts by flights descending', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [],
			sort: [{ id: 'flights', desc: true }],
			page: 0,
			pageSize: 50
		});
		expect(r.rows[0].serialNumber).toBe('B1067');
		expect(r.rows[3].serialNumber).toBe('B1077');
	});

	it('paginates correctly', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [],
			sort: [{ id: 'serial_number', desc: false }],
			page: 1,
			pageSize: 2
		});
		expect(r.total).toBe(4);
		expect(r.rows).toHaveLength(2);
		expect(r.rows[0].serialNumber).toBe('B1071');
	});

	it('supports text contains on serial_number', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [{ id: 'serial_number', op: 'contains', value: '107' }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.rows.map((b) => b.serialNumber).sort()).toEqual(['B1071', 'B1077']);
	});
});
```

- [ ] **Step 2: Implement `src/lib/server/boosters/query.ts`**

```ts
import { and, asc, desc, eq, gt, gte, lt, lte, like, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { booster } from '../db/schema';
import type { FilterClause, SortClause } from '../../url-state';
import { BOOSTER_COLUMNS } from './columns';

const COLUMN_MAP = {
	serial_number: booster.serialNumber,
	status: booster.status,
	flights: booster.flights,
	successful_landings: booster.successfulLandings,
	attempted_landings: booster.attemptedLandings,
	first_launch_date: booster.firstLaunchDate,
	last_launch_date: booster.lastLaunchDate
} as const;

function clauseToSql(clause: FilterClause): SQL | null {
	const col = (COLUMN_MAP as any)[clause.id];
	if (!col) {
		if (clause.id === 'days_since_last_flight') {
			// Computed column: julianday('now') - julianday(last_launch_date)
			const expr = sql<number>`CAST(julianday('now') - julianday(${booster.lastLaunchDate}) AS INTEGER)`;
			return numericClause(expr, clause);
		}
		return null;
	}
	switch (clause.op) {
		case 'eq':
			return eq(col, clause.value as any);
		case 'neq':
			return sql`${col} != ${clause.value}`;
		case 'gt':
			return gt(col, clause.value as any);
		case 'gte':
			return gte(col, clause.value as any);
		case 'lt':
			return lt(col, clause.value as any);
		case 'lte':
			return lte(col, clause.value as any);
		case 'in':
			if (!Array.isArray(clause.value) || clause.value.length === 0) return null;
			return sql`${col} IN ${clause.value}`;
		case 'contains':
			return like(col as any, `%${clause.value}%`);
		case 'startsWith':
			return like(col as any, `${clause.value}%`);
		case 'between':
			if (!Array.isArray(clause.value) || clause.value.length !== 2) return null;
			return sql`${col} BETWEEN ${clause.value[0]} AND ${clause.value[1]}`;
		default:
			return null;
	}
}

function numericClause(expr: SQL<number>, clause: FilterClause): SQL | null {
	const v = clause.value as number;
	switch (clause.op) {
		case 'eq':
			return sql`${expr} = ${v}`;
		case 'gt':
			return sql`${expr} > ${v}`;
		case 'gte':
			return sql`${expr} >= ${v}`;
		case 'lt':
			return sql`${expr} < ${v}`;
		case 'lte':
			return sql`${expr} <= ${v}`;
		default:
			return null;
	}
}

export type RunQueryArgs = {
	filters: FilterClause[];
	sort: SortClause[];
	page: number;
	pageSize: number;
};

export async function runBoostersQuery(db: BetterSQLite3Database<any>, args: RunQueryArgs) {
	const where = args.filters.map(clauseToSql).filter((s): s is SQL => s !== null);

	const whereExpr = where.length === 0 ? undefined : and(...where);

	// Total count for pagination + aggregate bar
	const totalRows = await db
		.select({ c: sql<number>`count(*)` })
		.from(booster)
		.where(whereExpr as any);
	const total = totalRows[0]?.c ?? 0;

	// Sort. Default to last_launch_date desc when no sort given.
	const orderBy =
		args.sort.length === 0
			? [desc(booster.lastLaunchDate)]
			: args.sort.map((s) => {
					const col = (COLUMN_MAP as any)[s.id];
					if (!col) return desc(booster.lastLaunchDate); // fallback
					return s.desc ? desc(col) : asc(col);
				});

	const rows = await db
		.select()
		.from(booster)
		.where(whereExpr as any)
		.orderBy(...orderBy)
		.limit(args.pageSize)
		.offset(args.page * args.pageSize);

	return { rows, total };
}
```

- [ ] **Step 3: Run**

```bash
npm test
```

Expected: 6 query tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/boosters/query.ts tests/integration/query.test.ts
git commit -m "Implement boosters query builder with filters, sort, pagination"
```

---

## Task 27: Aggregate computation (TDD)

**Files:**

- Create: `src/lib/server/boosters/aggregates.ts`
- Create: `tests/integration/aggregates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/integration/aggregates.test.ts
import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { booster } from '../../src/lib/server/db/schema';
import { computeBoosterAggregates } from '../../src/lib/server/boosters/aggregates';

describe('computeBoosterAggregates', () => {
	it('returns aggregates over filtered set', async () => {
		const { db } = makeTestDb();
		await db.insert(booster).values([
			{
				id: 1,
				serialNumber: 'B1',
				status: 'active',
				flights: 10,
				successfulLandings: 10,
				attemptedLandings: 10
			},
			{
				id: 2,
				serialNumber: 'B2',
				status: 'active',
				flights: 20,
				successfulLandings: 19,
				attemptedLandings: 20
			},
			{
				id: 3,
				serialNumber: 'B3',
				status: 'lost',
				flights: 5,
				successfulLandings: 4,
				attemptedLandings: 5
			}
		]);
		const agg = await computeBoosterAggregates(db, [{ id: 'status', op: 'in', value: ['active'] }]);
		expect(agg.count).toBe(2);
		expect(agg.totalFlights).toBe(30);
		expect(agg.avgFlights).toBeCloseTo(15);
		expect(agg.totalLandings).toBe(29);
		expect(agg.successRate).toBeCloseTo(29 / 30); // 29 successful of 30 attempted
	});

	it('returns zeros when no rows match', async () => {
		const { db } = makeTestDb();
		const agg = await computeBoosterAggregates(db, []);
		expect(agg.count).toBe(0);
		expect(agg.totalFlights).toBe(0);
		expect(agg.avgFlights).toBe(0);
		expect(agg.successRate).toBe(0);
	});
});
```

- [ ] **Step 2: Implement `src/lib/server/boosters/aggregates.ts`**

```ts
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sql, and, eq, gt, gte, lt, lte, like, type SQL } from 'drizzle-orm';
import { booster } from '../db/schema';
import type { FilterClause } from '../../url-state';

// Reuse the SQL builder from query.ts to avoid duplication
import { runBoostersQuery } from './query';

export type BoosterAggregates = {
	count: number;
	totalFlights: number;
	avgFlights: number;
	totalLandings: number;
	attemptedLandings: number;
	successRate: number;
};

export async function computeBoosterAggregates(
	db: BetterSQLite3Database<any>,
	filters: FilterClause[]
): Promise<BoosterAggregates> {
	// Pull the filtered set lightly. For Phase 1 the booster table is small
	// enough (~50-100 rows) to load + reduce in-process; if it grows large
	// we can replace this with a SUM/AVG SQL query that reuses the WHERE.
	const { rows, total } = await runBoostersQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0)
		return {
			count: 0,
			totalFlights: 0,
			avgFlights: 0,
			totalLandings: 0,
			attemptedLandings: 0,
			successRate: 0
		};

	let totalFlights = 0,
		totalLandings = 0,
		attempted = 0;
	for (const b of rows) {
		totalFlights += b.flights ?? 0;
		totalLandings += b.successfulLandings ?? 0;
		attempted += b.attemptedLandings ?? 0;
	}
	return {
		count: total,
		totalFlights,
		avgFlights: totalFlights / total,
		totalLandings,
		attemptedLandings: attempted,
		successRate: attempted === 0 ? 0 : totalLandings / attempted
	};
}
```

- [ ] **Step 3: Run**

```bash
npm test
```

Expected: 2 aggregates tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/boosters/aggregates.ts tests/integration/aggregates.test.ts
git commit -m "Compute filter-aware booster aggregates"
```

---

## Task 28: Boosters page load function

**Files:**

- Create: `src/routes/boosters/+page.server.ts`

- [ ] **Step 1: Write `src/routes/boosters/+page.server.ts`**

```ts
import type { PageServerLoad } from './$types';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { BOOSTER_COLUMNS, BOOSTER_DEFAULT_VISIBLE } from '$lib/server/boosters/columns';
import { validateFilters } from '$lib/server/boosters/filters';
import { runBoostersQuery } from '$lib/server/boosters/query';
import { computeBoosterAggregates } from '$lib/server/boosters/aggregates';
import { getDb } from '$lib/server/db/client';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const v = url.searchParams.get('v');
	const decoded = decodeViewState(v) ?? EMPTY_VIEW_STATE;

	const { valid: filters, rejected } = validateFilters(BOOSTER_COLUMNS, decoded.filters);
	const sort = decoded.sort;
	const page = Math.max(0, decoded.page);
	const visibleCols =
		decoded.visibleCols.length > 0 ? decoded.visibleCols : BOOSTER_DEFAULT_VISIBLE;

	const db = getDb();
	const [{ rows, total }, aggregates] = await Promise.all([
		runBoostersQuery(db, { filters, sort, page, pageSize: PAGE_SIZE }),
		computeBoosterAggregates(db, filters)
	]);

	return {
		rows,
		total,
		page,
		pageSize: PAGE_SIZE,
		aggregates,
		filters,
		sort,
		visibleCols,
		columns: BOOSTER_COLUMNS,
		rejected
	};
};
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/routes/boosters/+page.server.ts
git commit -m "Add boosters page load: parse URL state, run query, compute aggregates"
```

---

## Task 29: Boosters page UI (table, filter chips, aggregate bar, columns menu, presets)

This task creates several Svelte components. Code is long but each file is focused.

**Files:**

- Create: `src/routes/+layout.svelte`
- Create: `src/routes/+page.svelte` (home)
- Create: `src/routes/boosters/+page.svelte`
- Create: `src/lib/components/AggregateBar.svelte`
- Create: `src/lib/components/FilterChipBar.svelte`
- Create: `src/lib/components/ColumnsMenu.svelte`
- Create: `src/lib/components/PresetsMenu.svelte`
- Create: `src/lib/components/ExportMenu.svelte`
- Create: `src/lib/components/BoosterStatusBadge.svelte`

- [ ] **Step 1: Write `src/routes/+layout.svelte`**

```svelte
<script lang="ts">
	import { m } from '$lib/i18n/runtime';
</script>

<header class="site-header">
	<a href="/" class="brand">{m.site_title()}</a>
	<nav>
		<a href="/boosters">{m.nav_boosters()}</a>
	</nav>
</header>

<main>
	<slot />
</main>

<style>
	:global(html, body) {
		margin: 0;
		font-family: system-ui, sans-serif;
	}
	:global(*) {
		box-sizing: border-box;
	}
	.site-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding-block: 0.75rem;
		padding-inline: 1.5rem;
		border-block-end: 1px solid #e5e7eb;
	}
	.brand {
		font-weight: 600;
		text-decoration: none;
		color: inherit;
	}
	nav a {
		color: inherit;
		text-decoration: none;
		margin-inline-end: 1rem;
	}
	main {
		padding: 1.5rem;
	}
</style>
```

- [ ] **Step 2: Write `src/routes/+page.svelte`**

```svelte
<script lang="ts">
	import { m } from '$lib/i18n/runtime';
</script>

<h1>{m.site_title()}</h1>
<p>
	<a href="/boosters">{m.nav_boosters()} →</a>
</p>
```

- [ ] **Step 3: Write `src/lib/components/BoosterStatusBadge.svelte`**

```svelte
<script lang="ts">
	import { m } from '$lib/i18n/runtime';
	export let status: string;

	const labels: Record<string, () => string> = {
		active: m.status_active,
		inactive: m.status_inactive,
		expended: m.status_expended,
		lost: m.status_lost,
		retired: m.status_retired,
		unknown: m.status_unknown
	};
	$: label = (labels[status] ?? m.status_unknown)();
</script>

<span class="badge badge-{status}">{label}</span>

<style>
	.badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
	}
	.badge-active {
		background: #dcfce7;
		color: #166534;
	}
	.badge-inactive {
		background: #f3f4f6;
		color: #374151;
	}
	.badge-expended {
		background: #fef3c7;
		color: #854d0e;
	}
	.badge-lost {
		background: #fecaca;
		color: #991b1b;
	}
	.badge-retired {
		background: #e0e7ff;
		color: #3730a3;
	}
	.badge-unknown {
		background: #f3f4f6;
		color: #6b7280;
	}
</style>
```

- [ ] **Step 4: Write `src/lib/components/AggregateBar.svelte`**

```svelte
<script lang="ts">
	import { m, formatNumber } from '$lib/i18n/runtime';
	import type { BoosterAggregates } from '$lib/server/boosters/aggregates';
	export let aggregates: BoosterAggregates;
	export let total: number;
	export let filtered: number;
</script>

<div class="aggbar">
	<span><strong>{formatNumber(filtered)}</strong> / {formatNumber(total)}</span>
	<span>· {m.agg_avg_flights()}: <strong>{aggregates.avgFlights.toFixed(1)}</strong></span>
	<span>· {m.agg_total_landings()}: <strong>{formatNumber(aggregates.totalLandings)}</strong></span>
	<span
		>· {m.agg_landing_success_rate()}:
		<strong>{(aggregates.successRate * 100).toFixed(1)}%</strong></span
	>
</div>

<style>
	.aggbar {
		position: sticky;
		inset-block-start: 0;
		z-index: 5;
		background: #f8fafc;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
```

- [ ] **Step 5: Write `src/lib/components/FilterChipBar.svelte`**

```svelte
<script lang="ts">
	import { m } from '$lib/i18n/runtime';
	import type { FilterClause } from '$lib/url-state';
	import type { ColumnDef } from '$lib/server/boosters/columns';

	export let columns: readonly ColumnDef[];
	export let filters: FilterClause[];
	export let onChange: (next: FilterClause[]) => void;

	let pickerOpen = false;

	function removeAt(i: number) {
		const next = filters.slice();
		next.splice(i, 1);
		onChange(next);
	}

	function addFilter(col: ColumnDef) {
		pickerOpen = false;
		if (!col.filter) return;
		let initial: FilterClause;
		switch (col.filter.kind) {
			case 'enum':
				initial = { id: col.id, op: 'in', value: [col.filter.options[0]] };
				break;
			case 'numberRange':
				initial = { id: col.id, op: 'gte', value: 0 };
				break;
			case 'dateRange':
				initial = { id: col.id, op: 'gte', value: '2020-01-01' };
				break;
			case 'text':
				initial = { id: col.id, op: 'contains', value: '' };
				break;
			case 'boolean':
				initial = { id: col.id, op: 'eq', value: true };
				break;
		}
		onChange([...filters, initial]);
	}

	function updateAt(i: number, patch: Partial<FilterClause>) {
		const next = filters.slice();
		next[i] = { ...next[i], ...patch };
		onChange(next);
	}

	function describeColumn(id: string) {
		const col = columns.find((c) => c.id === id);
		return col?.label ?? id;
	}
</script>

<div class="chips">
	{#each filters as filter, i}
		{@const col = columns.find((c) => c.id === filter.id)}
		<span class="chip">
			<span class="chip-label">{describeColumn(filter.id)}</span>
			{#if col?.filter?.kind === 'enum'}
				<select
					value={Array.isArray(filter.value) ? filter.value[0] : filter.value}
					on:change={(e) => updateAt(i, { value: [(e.currentTarget as HTMLSelectElement).value] })}
				>
					{#each col.filter.options as opt}
						<option value={opt}>{opt}</option>
					{/each}
				</select>
			{:else if col?.filter?.kind === 'numberRange'}
				<select
					value={filter.op}
					on:change={(e) => updateAt(i, { op: (e.currentTarget as HTMLSelectElement).value })}
				>
					<option value="eq">=</option>
					<option value="gte">≥</option>
					<option value="lte">≤</option>
				</select>
				<input
					type="number"
					value={filter.value as number}
					on:input={(e) =>
						updateAt(i, { value: Number((e.currentTarget as HTMLInputElement).value) })}
				/>
			{:else if col?.filter?.kind === 'text'}
				<input
					type="text"
					value={filter.value as string}
					placeholder={m.filter_placeholder_search()}
					on:input={(e) => updateAt(i, { value: (e.currentTarget as HTMLInputElement).value })}
				/>
			{:else if col?.filter?.kind === 'dateRange'}
				<input
					type="date"
					value={filter.value as string}
					on:input={(e) => updateAt(i, { value: (e.currentTarget as HTMLInputElement).value })}
				/>
			{/if}
			<button class="x" on:click={() => removeAt(i)} aria-label="remove">×</button>
		</span>
	{/each}

	<button class="add" on:click={() => (pickerOpen = !pickerOpen)}>{m.btn_add_filter()}</button>
	{#if pickerOpen}
		<div class="picker">
			{#each columns.filter((c) => !!c.filter && !filters.some((f) => f.id === c.id)) as col}
				<button on:click={() => addFilter(col)}>{col.label}</button>
			{/each}
		</div>
	{/if}

	{#if filters.length > 0}
		<button class="clear" on:click={() => onChange([])}>{m.btn_clear_filters()}</button>
	{/if}
</div>

<style>
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		padding-block: 0.5rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: #f1f5f9;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		padding-inline: 0.5rem;
		padding-block: 0.25rem;
		font-size: 0.875rem;
	}
	.chip-label {
		font-weight: 500;
	}
	.chip select,
	.chip input {
		font: inherit;
		padding: 0.125rem 0.25rem;
	}
	.x,
	.add,
	.clear {
		font-family: inherit;
		cursor: pointer;
	}
	.x {
		background: transparent;
		border: 0;
		font-size: 1rem;
		line-height: 1;
	}
	.add,
	.clear {
		background: white;
		border: 1px solid #cbd5e1;
		padding-block: 0.25rem;
		padding-inline: 0.75rem;
		border-radius: 999px;
		font-size: 0.875rem;
	}
	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}
	.picker button {
		background: transparent;
		border: 0;
		text-align: start;
		padding: 0.25rem;
		cursor: pointer;
	}
	.picker button:hover {
		background: #f1f5f9;
	}
</style>
```

- [ ] **Step 6: Write `src/lib/components/ColumnsMenu.svelte`**

```svelte
<script lang="ts">
	import { m } from '$lib/i18n/runtime';
	import type { ColumnDef } from '$lib/server/boosters/columns';
	export let columns: readonly ColumnDef[];
	export let visible: string[];
	export let onChange: (next: string[]) => void;

	let open = false;

	function toggle(id: string) {
		if (visible.includes(id)) onChange(visible.filter((v) => v !== id));
		else onChange([...visible, id]);
	}
</script>

<div class="menu">
	<button on:click={() => (open = !open)}>{m.btn_columns()}</button>
	{#if open}
		<ul>
			{#each columns as col}
				<li>
					<label>
						<input
							type="checkbox"
							checked={visible.includes(col.id)}
							on:change={() => toggle(col.id)}
						/>
						{col.label}
					</label>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.menu {
		position: relative;
		display: inline-block;
	}
	ul {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		list-style: none;
		padding: 0.5rem;
		min-width: 12rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}
	li {
		padding: 0.125rem 0;
	}
	label {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		cursor: pointer;
	}
	button {
		font: inherit;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}
</style>
```

- [ ] **Step 7: Write `src/lib/components/ExportMenu.svelte`**

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { m } from '$lib/i18n/runtime';

	let open = false;

	$: v = $page.url.searchParams.get('v') ?? '';
	$: csvHref = `/api/boosters/export?format=csv${v ? `&v=${encodeURIComponent(v)}` : ''}`;
	$: jsonHref = `/api/boosters/export?format=json${v ? `&v=${encodeURIComponent(v)}` : ''}`;
</script>

<div class="menu">
	<button on:click={() => (open = !open)}>Export ▾</button>
	{#if open}
		<ul>
			<li><a href={csvHref}>{m.btn_export_csv()}</a></li>
			<li><a href={jsonHref}>{m.btn_export_json()}</a></li>
		</ul>
	{/if}
</div>

<style>
	.menu {
		position: relative;
		display: inline-block;
	}
	ul {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		list-style: none;
		padding: 0.5rem;
		min-width: 8rem;
	}
	li a {
		display: block;
		padding: 0.25rem 0.5rem;
		color: inherit;
		text-decoration: none;
	}
	li a:hover {
		background: #f1f5f9;
	}
	button {
		font: inherit;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}
</style>
```

- [ ] **Step 8: Write `src/lib/components/PresetsMenu.svelte`**

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { m } from '$lib/i18n/runtime';

	const STORAGE_KEY = 'boosterTracker.presets.boosters';

	type Preset = { name: string; v: string };
	let presets: Preset[] = [];
	let open = false;

	onMount(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			try {
				presets = JSON.parse(raw);
			} catch {
				presets = [];
			}
		}
	});

	function save() {
		const v = $page.url.searchParams.get('v') ?? '';
		if (!v) return;
		const name = prompt('Name this view');
		if (!name) return;
		presets = [...presets.filter((p) => p.name !== name), { name, v }];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}

	function load(p: Preset) {
		open = false;
		goto(`/boosters?v=${encodeURIComponent(p.v)}`);
	}

	function remove(name: string) {
		presets = presets.filter((p) => p.name !== name);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}
</script>

<div class="menu">
	<button on:click={save}>{m.btn_save_view()}</button>
	{#if presets.length > 0}
		<button on:click={() => (open = !open)}>Views ({presets.length})</button>
		{#if open}
			<ul>
				{#each presets as p}
					<li>
						<button class="link" on:click={() => load(p)}>{p.name}</button>
						<button class="x" on:click={() => remove(p.name)}>×</button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

<style>
	.menu {
		position: relative;
		display: inline-flex;
		gap: 0.5rem;
	}
	ul {
		position: absolute;
		inset-block-start: 100%;
		inset-inline-end: 0;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		list-style: none;
		padding: 0.5rem;
		min-width: 12rem;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}
	button {
		font: inherit;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		background: white;
	}
	button.link {
		border: 0;
		background: transparent;
		padding: 0.25rem;
		flex: 1;
		text-align: start;
	}
	button.link:hover {
		background: #f1f5f9;
	}
	button.x {
		border: 0;
		background: transparent;
	}
</style>
```

- [ ] **Step 9: Write `src/routes/boosters/+page.svelte`**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { m, formatDate, formatDaysSince } from '$lib/i18n/runtime';
	import { encodeViewState, type FilterClause, type SortClause } from '$lib/url-state';
	import AggregateBar from '$lib/components/AggregateBar.svelte';
	import FilterChipBar from '$lib/components/FilterChipBar.svelte';
	import ColumnsMenu from '$lib/components/ColumnsMenu.svelte';
	import ExportMenu from '$lib/components/ExportMenu.svelte';
	import PresetsMenu from '$lib/components/PresetsMenu.svelte';
	import BoosterStatusBadge from '$lib/components/BoosterStatusBadge.svelte';

	export let data: PageData;

	function navigateWith(patch: {
		filters?: FilterClause[];
		sort?: SortClause[];
		visibleCols?: string[];
		page?: number;
	}) {
		const next = encodeViewState({
			filters: patch.filters ?? data.filters,
			sort: patch.sort ?? data.sort,
			visibleCols: patch.visibleCols ?? data.visibleCols,
			page: patch.page ?? data.page
		});
		const url = new URL($page.url);
		url.searchParams.set('v', next);
		goto(url.toString(), { keepFocus: true, noScroll: true, replaceState: false });
	}

	function toggleSort(id: string, e: MouseEvent) {
		const existing = data.sort.find((s) => s.id === id);
		let next: SortClause[];
		if (e.shiftKey) {
			// Multi-column sort
			if (!existing) next = [...data.sort, { id, desc: false }];
			else if (!existing.desc)
				next = data.sort.map((s) => (s.id === id ? { ...s, desc: true } : s));
			else next = data.sort.filter((s) => s.id !== id);
		} else {
			if (!existing) next = [{ id, desc: false }];
			else if (!existing.desc) next = [{ id, desc: true }];
			else next = [];
		}
		navigateWith({ sort: next, page: 0 });
	}

	$: visible = new Set(data.visibleCols);

	function cellValue(row: any, colId: string) {
		switch (colId) {
			case 'serial_number':
				return row.serialNumber;
			case 'status':
				return null; // rendered specially
			case 'flights':
				return row.flights;
			case 'first_launch_date':
				return formatDate(row.firstLaunchDate);
			case 'last_launch_date':
				return formatDate(row.lastLaunchDate);
			case 'days_since_last_flight':
				return formatDaysSince(row.lastLaunchDate);
			case 'successful_landings':
				return row.successfulLandings;
			case 'attempted_landings':
				return row.attemptedLandings;
			case 'block':
				return ''; // requires launcher_config join — Phase 1 leaves blank if not loaded
			default:
				return '';
		}
	}
</script>

<svelte:head><title>{m.boosters_page_title()} · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<h1>{m.boosters_page_title()}</h1>
	<div class="actions">
		<ExportMenu />
		<ColumnsMenu
			columns={data.columns}
			visible={data.visibleCols}
			onChange={(next) => navigateWith({ visibleCols: next })}
		/>
		<PresetsMenu />
	</div>
</header>

<FilterChipBar
	columns={data.columns}
	filters={data.filters}
	onChange={(next) => navigateWith({ filters: next, page: 0 })}
/>

<AggregateBar aggregates={data.aggregates} total={data.total} filtered={data.aggregates.count} />

<table>
	<thead>
		<tr>
			{#each data.columns.filter((c) => visible.has(c.id)) as col}
				{@const sortInfo = data.sort.find((s) => s.id === col.id)}
				<th on:click={(e) => toggleSort(col.id, e)}>
					{col.label}
					{#if sortInfo}{sortInfo.desc ? '↓' : '↑'}{/if}
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each data.rows as row}
			<tr>
				{#each data.columns.filter((c) => visible.has(c.id)) as col}
					<td>
						{#if col.id === 'serial_number'}
							<a href="/boosters/{row.serialNumber}">{row.serialNumber}</a>
						{:else if col.id === 'status'}
							<BoosterStatusBadge status={row.status} />
						{:else}
							{cellValue(row, col.id) ?? ''}
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

{#if data.total > data.pageSize}
	<nav class="pager">
		<button disabled={data.page === 0} on:click={() => navigateWith({ page: data.page - 1 })}
			>← Prev</button
		>
		<span>Page {data.page + 1} of {Math.ceil(data.total / data.pageSize)}</span>
		<button
			disabled={(data.page + 1) * data.pageSize >= data.total}
			on:click={() => navigateWith({ page: data.page + 1 })}>Next →</button
		>
	</nav>
{/if}

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-block-end: 0.5rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
		margin-block-start: 0.5rem;
	}
	th,
	td {
		padding: 0.5rem 0.75rem;
		border-block-end: 1px solid #e5e7eb;
		text-align: start;
	}
	th {
		background: #f8fafc;
		font-weight: 600;
		cursor: pointer;
		user-select: none;
	}
	tbody tr:hover {
		background: #f9fafb;
	}
	.pager {
		display: flex;
		gap: 1rem;
		align-items: center;
		padding-block: 1rem;
	}
	.pager button {
		font: inherit;
		padding: 0.25rem 0.75rem;
	}
</style>
```

- [ ] **Step 10: Smoke test**

```bash
npm run dev -- --port 5173 &
DEV_PID=$!
sleep 3
curl -s http://localhost:5173/boosters | grep -o '<title>[^<]*</title>'
kill $DEV_PID
```

Expected: `<title>Boosters · Booster Tracker</title>` (or similar).

- [ ] **Step 11: Commit**

```bash
git add src/routes/+layout.svelte src/routes/+page.svelte src/routes/boosters/+page.svelte src/lib/components/
git commit -m "Add boosters table page with filters, sort, columns, presets, export menu"
```

---

## Task 30: CSV + JSON export endpoints

**Files:**

- Create: `src/routes/api/boosters/export/+server.ts`
- Create: `src/lib/server/boosters/export.ts`

- [ ] **Step 1: Write `src/lib/server/boosters/export.ts`**

```ts
import type { Booster } from '../db/schema';
import { BOOSTER_COLUMNS } from './columns';

function csvEscape(s: unknown): string {
	if (s == null) return '';
	const str = String(s);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

const FIELD_FOR_COL: Record<string, (b: Booster) => unknown> = {
	serial_number: (b) => b.serialNumber,
	status: (b) => b.status,
	flights: (b) => b.flights,
	successful_landings: (b) => b.successfulLandings,
	attempted_landings: (b) => b.attemptedLandings,
	first_launch_date: (b) => b.firstLaunchDate,
	last_launch_date: (b) => b.lastLaunchDate,
	days_since_last_flight: (b) =>
		b.lastLaunchDate
			? Math.floor((Date.now() - new Date(b.lastLaunchDate).getTime()) / 86_400_000)
			: null,
	block: (b) => null // requires launcher_config join — left blank in Phase 1
};

export function boostersToCsv(rows: Booster[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : BOOSTER_COLUMNS.map((c) => c.id);
	const header = cols.join(',');
	const body = rows
		.map((r) => cols.map((c) => csvEscape(FIELD_FOR_COL[c]?.(r))).join(','))
		.join('\n');
	return `${header}\n${body}\n`;
}

export function boostersToJson(rows: Booster[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : BOOSTER_COLUMNS.map((c) => c.id);
	return JSON.stringify(
		rows.map((r) => Object.fromEntries(cols.map((c) => [c, FIELD_FOR_COL[c]?.(r) ?? null]))),
		null,
		2
	);
}
```

- [ ] **Step 2: Write `src/routes/api/boosters/export/+server.ts`**

```ts
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { runBoostersQuery } from '$lib/server/boosters/query';
import { validateFilters } from '$lib/server/boosters/filters';
import { BOOSTER_COLUMNS, BOOSTER_DEFAULT_VISIBLE } from '$lib/server/boosters/columns';
import { boostersToCsv, boostersToJson } from '$lib/server/boosters/export';
import { getDb } from '$lib/server/db/client';

export const GET: RequestHandler = async ({ url }) => {
	const format = url.searchParams.get('format') ?? 'csv';
	if (format !== 'csv' && format !== 'json') {
		throw error(400, 'format must be csv or json');
	}

	const decoded = decodeViewState(url.searchParams.get('v')) ?? EMPTY_VIEW_STATE;
	const { valid: filters } = validateFilters(BOOSTER_COLUMNS, decoded.filters);
	const visibleCols =
		decoded.visibleCols.length > 0 ? decoded.visibleCols : BOOSTER_DEFAULT_VISIBLE;

	const db = getDb();
	const { rows } = await runBoostersQuery(db, {
		filters,
		sort: decoded.sort,
		page: 0,
		pageSize: 10_000
	});

	const stamp = new Date().toISOString().slice(0, 10);
	const filename = `boosters-${stamp}.${format}`;
	const body =
		format === 'csv' ? boostersToCsv(rows, visibleCols) : boostersToJson(rows, visibleCols);

	return new Response(body, {
		headers: {
			'content-type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json',
			'content-disposition': `attachment; filename="${filename}"`
		}
	});
};
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev -- --port 5173 &
DEV_PID=$!
sleep 3
curl -s http://localhost:5173/api/boosters/export?format=csv | head -3
curl -s http://localhost:5173/api/boosters/export?format=json | head -3
kill $DEV_PID
```

Expected: CSV with header `serial_number,status,...`; JSON array of objects.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/boosters/export.ts src/routes/api/boosters/export/+server.ts
git commit -m "Add CSV + JSON export endpoints for boosters"
```

---

## Task 31: Wire export links in the table page

`ExportMenu.svelte` already produces `/api/boosters/export?format=...&v=...`. No code change needed — verify by clicking an export link from the table page after running a filter.

- [ ] **Step 1: Manual verification**

1. Start dev server: `npm run dev -- --port 5173`.
2. Visit `http://localhost:5173/boosters`. Add a filter (e.g., status = active).
3. Click Export ▾ → CSV. A file downloads named `boosters-<date>.csv`.
4. Open it; the rows match the filtered table.
5. Repeat for JSON.

- [ ] **Step 2: If working, no commit needed (no code changed). If a bug surfaces, fix in `ExportMenu.svelte` or the export endpoint and commit.**

---

## Task 32: Booster detail page — load function

**Files:**

- Create: `src/routes/boosters/[serial]/+page.server.ts`

- [ ] **Step 1: Write the load function**

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import {
	booster,
	launchBooster,
	launch,
	launchpad,
	landingLocation,
	launcherConfig
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const serial = params.serial;

	const matches = await db.select().from(booster).where(eq(booster.serialNumber, serial));
	if (matches.length === 0) throw error(404, 'Booster not found');
	const b = matches[0];

	const config = b.launcherConfigId
		? (await db.select().from(launcherConfig).where(eq(launcherConfig.id, b.launcherConfigId)))[0]
		: null;

	// Flight history: every launch this booster flew on, ordered by date.
	const history = await db
		.select({
			launchId: launch.id,
			launchSlug: launch.slug,
			launchName: launch.name,
			launchDate: launch.net,
			launchpadName: launchpad.name,
			role: launchBooster.role,
			flightNumber: launchBooster.flightNumber,
			landingAttempted: launchBooster.landingAttempted,
			landingSuccess: launchBooster.landingSuccess,
			landingType: launchBooster.landingType,
			landingLocationName: landingLocation.name,
			landingLocationAbbrev: landingLocation.abbrev
		})
		.from(launchBooster)
		.innerJoin(launch, eq(launch.id, launchBooster.launchId))
		.leftJoin(launchpad, eq(launchpad.id, launch.launchpadId))
		.leftJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.boosterId, b.id))
		.orderBy(launch.net);

	// Compute turnaround between consecutive flights
	const historyWithTurnaround = history.map((h, i) => {
		if (i === 0) return { ...h, turnaroundDays: null as number | null };
		const prevDate = new Date(history[i - 1].launchDate).getTime();
		const thisDate = new Date(h.launchDate).getTime();
		return { ...h, turnaroundDays: Math.floor((thisDate - prevDate) / 86_400_000) };
	});

	// Landing breakdown
	const landingBreakdown = await db
		.select({
			locationName: landingLocation.name,
			abbrev: landingLocation.abbrev,
			attempts: sql<number>`count(*)`,
			successes: sql<number>`sum(CASE WHEN ${launchBooster.landingSuccess} THEN 1 ELSE 0 END)`
		})
		.from(launchBooster)
		.leftJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.boosterId, b.id))
		.groupBy(landingLocation.id);

	return { booster: b, config, history: historyWithTurnaround, landingBreakdown };
};
```

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/routes/boosters/\[serial\]/+page.server.ts
git commit -m "Add booster detail page load with flight history and landing breakdown"
```

---

## Task 33: Booster detail page — UI

**Files:**

- Create: `src/routes/boosters/[serial]/+page.svelte`

- [ ] **Step 1: Write the page**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { m, formatDate, formatNumber } from '$lib/i18n/runtime';
	import BoosterStatusBadge from '$lib/components/BoosterStatusBadge.svelte';

	export let data: PageData;
	$: b = data.booster;
</script>

<svelte:head><title>{b.serialNumber} · {m.site_title()}</title></svelte:head>

<header class="header">
	{#if b.imageUrl}
		<img src={b.imageUrl} alt={b.serialNumber} />
	{/if}
	<div>
		<h1>{b.serialNumber} <BoosterStatusBadge status={b.status} /></h1>
		<p class="meta">
			{#if data.config}<span><strong>{data.config.name}</strong></span>{/if}
			<span>· {m.col_flights()}: {formatNumber(b.flights)}</span>
			<span>· {m.col_first_launch_date()}: {formatDate(b.firstLaunchDate)}</span>
			<span>· {m.col_last_launch_date()}: {formatDate(b.lastLaunchDate)}</span>
		</p>
		{#if b.details}<p class="details">{b.details}</p>{/if}
	</div>
</header>

<section>
	<h2>{m.detail_landing_breakdown()}</h2>
	{#if data.landingBreakdown.length === 0}
		<p>—</p>
	{:else}
		<ul>
			{#each data.landingBreakdown as row}
				<li>
					{row.abbrev ?? row.locationName ?? '—'}: {row.successes ?? 0} / {row.attempts}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<h2>{m.detail_flight_history()}</h2>
	{#if data.history.length === 0}
		<p>{m.detail_no_flights()}</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>#</th>
					<th>Date</th>
					<th>Mission</th>
					<th>Pad</th>
					<th>Role</th>
					<th>Landing</th>
					<th>Turnaround</th>
				</tr>
			</thead>
			<tbody>
				{#each data.history as h, i}
					<tr>
						<td>{i + 1}</td>
						<td>{formatDate(h.launchDate)}</td>
						<td><a href="/launches/{h.launchSlug}">{h.launchName}</a></td>
						<td>{h.launchpadName ?? '—'}</td>
						<td>{h.role || '—'}</td>
						<td>
							{#if h.landingAttempted == null}—
							{:else if h.landingAttempted === false}Not attempted
							{:else if h.landingSuccess}{h.landingLocationAbbrev ?? h.landingLocationName ?? 'OK'}
							{:else}Failed{/if}
						</td>
						<td>{h.turnaroundDays != null ? `${h.turnaroundDays}d` : '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	.header {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		padding-block: 1rem;
	}
	.header img {
		inline-size: 200px;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.5rem;
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		color: #475569;
		font-size: 0.9rem;
	}
	.details {
		color: #334155;
		max-width: 60ch;
	}
	section {
		padding-block: 1rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		padding: 0.5rem 0.75rem;
		border-block-end: 1px solid #e5e7eb;
		text-align: start;
	}
	th {
		background: #f8fafc;
		font-weight: 600;
	}
</style>
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev -- --port 5173 &
DEV_PID=$!
sleep 3
# Use a serial that exists in your seeded DB; replace B1067 if needed.
curl -s http://localhost:5173/boosters/B1067 | grep -o '<title>[^<]*</title>'
kill $DEV_PID
```

Expected: title contains the serial. If the seeded DB doesn't include `B1067`, sub in any existing serial from `sqlite3 data/data.db 'SELECT serial_number FROM booster LIMIT 5'`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/boosters/\[serial\]/+page.svelte
git commit -m "Add booster detail page UI with flight history and landings"
```

---

## Task 34: Playwright smoke e2e tests

**Files:**

- Create: `tests/e2e/boosters-table.spec.ts`
- Create: `tests/e2e/booster-detail.spec.ts`
- Modify: `playwright.config.ts` (point to dev server, set port)

- [ ] **Step 1: Confirm `playwright.config.ts` has a `webServer` block**

The Svelte CLI's Playwright add-on usually generates this. Open `playwright.config.ts` and verify it contains:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests/e2e'
});
```

If it doesn't, replace the file with the above.

- [ ] **Step 2: Write `tests/e2e/boosters-table.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('boosters page renders and exposes the table', async ({ page }) => {
	await page.goto('/boosters');
	await expect(page.locator('h1')).toContainText('Boosters');
	await expect(page.locator('table thead th').first()).toBeVisible();
	// At least one row should be present (assumes seed has run).
	await expect(page.locator('table tbody tr').first()).toBeVisible();
});

test('clicking a sort header updates the URL', async ({ page }) => {
	await page.goto('/boosters');
	const flightsHeader = page.getByRole('columnheader').filter({ hasText: /Flights/i });
	await flightsHeader.click();
	await expect(page).toHaveURL(/\?v=/);
});

test('export link includes current view state', async ({ page }) => {
	await page.goto('/boosters');
	await page.getByRole('button', { name: /export/i }).click();
	const csv = page.getByRole('link', { name: /CSV/i });
	const href = await csv.getAttribute('href');
	expect(href).toMatch(/^\/api\/boosters\/export\?format=csv/);
});
```

- [ ] **Step 3: Write `tests/e2e/booster-detail.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('clicking a serial navigates to its detail page', async ({ page }) => {
	await page.goto('/boosters');
	const firstSerial = page.locator('table tbody tr td a').first();
	const text = await firstSerial.textContent();
	await firstSerial.click();
	await expect(page).toHaveURL(new RegExp(`/boosters/${text}`));
	await expect(page.locator('h1')).toContainText(text!);
});
```

- [ ] **Step 4: Run e2e against a seeded DB**

Make sure `data/data.db` has been populated (see Task 21) before running. Then:

```bash
npm run test:e2e
```

Expected: 4 tests pass. If "no rows" causes failures, run `npm run seed` first.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "Add Playwright smoke tests for boosters table and detail pages"
```

---

## Task 35: Configure SvelteKit for Node adapter (Docker target)

**Files:**

- Modify: `svelte.config.js`
- Install: `@sveltejs/adapter-node`

- [ ] **Step 1: Switch from default adapter to Node adapter**

```bash
npm uninstall @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-node
```

- [ ] **Step 2: Update `svelte.config.js`**

Replace its contents with:

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: false,
			envPrefix: ''
		})
	}
};
```

- [ ] **Step 3: Verify build produces a Node server**

```bash
npm run build
ls build/
```

Expected: `build/index.js` (or similar entry) exists.

- [ ] **Step 4: Smoke test the production server**

```bash
PORT=3000 node build &
PROD_PID=$!
sleep 2
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'
kill $PROD_PID
```

Expected: HTML response with the site title.

- [ ] **Step 5: Commit**

```bash
git add svelte.config.js package.json package-lock.json
git commit -m "Switch SvelteKit to Node adapter for Docker deployment"
```

---

## Task 36: Dockerfile + docker-compose.yml

**Files:**

- Create: `docker/Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

- [ ] **Step 1: Write `docker/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install deps with caching
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source and build
COPY . .
RUN npm run build

# Strip dev deps for the production install
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/data.db

# Required runtime tooling for better-sqlite3
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy built app + production node_modules + drizzle migrations + seed entry
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src/lib/seed.ts ./src/lib/seed.ts
COPY --from=builder /app/src/lib/server ./src/lib/server

VOLUME ["/data"]
EXPOSE 3000
USER node

CMD ["node", "build"]
```

- [ ] **Step 2: Write `.dockerignore`**

```
node_modules
build
.svelte-kit
data
.git
.github
docs
tests
.superpowers
.env
.env.local
*.log
playwright-report
test-results
```

- [ ] **Step 3: Write `docker-compose.yml`**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    image: ghcr.io/ajthom90/booster-tracker:latest
    container_name: booster-tracker
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_PATH: /data/data.db
      PORT: 3000
    volumes:
      - ./data:/data
    ports:
      - '3000:3000'
```

- [ ] **Step 4: Build the image locally**

```bash
docker build -t booster-tracker:dev -f docker/Dockerfile .
```

Expected: build succeeds.

- [ ] **Step 5: Run the container against the local data dir**

```bash
docker run --rm -p 3000:3000 \
  -v $(pwd)/data:/data \
  --env-file .env.example \
  booster-tracker:dev &
DOCKER_PID=$!
sleep 5
curl -s http://localhost:3000/ | grep -o '<title>[^<]*</title>'
docker stop booster-tracker || true
```

Expected: title appears in the response. (The container needs an existing seeded DB at `./data/data.db` for booster pages to render rows; the homepage works regardless.)

- [ ] **Step 6: Commit**

```bash
git add docker/Dockerfile .dockerignore docker-compose.yml
git commit -m "Add Dockerfile, .dockerignore, and docker-compose for self-host"
```

---

## Task 37: README

**Files:**

- Create or replace: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Booster Tracker

A public, self-hosted website that tracks SpaceX rocket boosters and launches.
Powerful filtering, multi-column sorting, derived stats, and CSV/JSON export —
the things [boostertracker.com](https://boostertracker.com) doesn't do.

Phase 1 ships the **Boosters** view end-to-end (filter, sort, columns, presets, export, detail page).
Launches, droneships, launchpads, the stats dashboard, and additional locales arrive in later phases.

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
````

## Self-hosting

```bash
# Pull the latest image and start the container
docker compose pull
docker compose up -d

# First-time only: seed the DB inside the running container
docker compose exec app npm run seed
```

The app listens on port 3000 inside the container, mapped to 3000 on the host.
Put a reverse proxy in front (Cloudflare Tunnel, Caddy, NGINX) to expose it publicly.

### Environment variables

See [`.env.example`](.env.example). Notable ones:

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
[The Space Devs Launch Library 2 API](https://thespacedevs.com/llapi). Data
licensed under their terms.

## Contributing

PRs welcome. Run `npm run lint && npm test && npm run check` before submitting.

## License

[Choose a license — recommend MIT or Apache-2.0 for an open data viewer.]

````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with setup, deployment, and contribution docs"
````

---

## Task 38: GitHub Actions CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Paraglide messages
        run: npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run check

      - name: Unit + integration tests
        run: npm test

      - name: Build
        run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Paraglide messages
        run: npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run migrations and seed e2e fixture data
        env:
          LL2_BASE_URL: https://lldev.thespacedevs.com/2.2.0
          DATABASE_PATH: ./data/data.db
        run: |
          mkdir -p data
          # For e2e in CI we use a tiny fixture-driven seed instead of pulling real data,
          # to keep the run hermetic. Run vitest integration suite — its in-memory
          # fixtures populate similar shapes — then copy a seeded fixture in.
          # Simplest path: just hit the real dev mirror (no auth, no rate limit).
          npm run seed

      - name: Run Playwright tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report
```

- [ ] **Step 2: Smoke test the workflow file syntactically**

```bash
# If you have `act` installed, dry-run:
# act -n -W .github/workflows/ci.yml
# Otherwise just lint manually for typos.
cat .github/workflows/ci.yml | head -20
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI: lint, check, test, build, e2e"
```

---

## Phase 1 acceptance checklist

When all 38 tasks are complete, the following should be true:

- [ ] `npm install && npm run seed && npm run dev` produces a working site at http://localhost:5173.
- [ ] `/boosters` shows a sortable, filterable, exportable table of every SpaceX booster.
- [ ] Filter changes update the URL `?v=...` and survive page reload.
- [ ] Saving a "preset" stores it in localStorage; clicking a preset restores the view.
- [ ] CSV export downloads a file named `boosters-<date>.csv` containing the filtered rows.
- [ ] JSON export does the same, with `application/json` MIME and the same filtered set.
- [ ] `/boosters/<serial>` renders for any seeded booster, with flight history and landing breakdown.
- [ ] All Vitest unit + integration tests pass.
- [ ] Playwright smoke tests pass.
- [ ] `docker build` produces an image; `docker compose up` runs the app on port 3000.
- [ ] GitHub Actions CI passes on a PR.
- [ ] All UI strings come through Paraglide (no hardcoded English in components).

---

## Notes for Phase 2 / Phase 3

- The query builder, URL state codec, filter validation, presets, and aggregate bar are all written generically enough that adding the `/launches`, `/droneships`, `/launchpads` views in Phase 2 should be a matter of declaring per-entity column metadata + filter sets + aggregate sets, plus thin wrapper queries.
- The `/admin/status` and `/healthz` endpoints are deliberately deferred to Phase 2 because they're more useful once there's more to observe.
- The `block` column on boosters is a placeholder in Phase 1 (the join to `launcher_config` is in the load only on the detail page, not the table). Phase 2 wires it through the table query.
- All physical CSS properties were avoided where reasonable (using `inset-block-start`, `margin-inline-end`, `text-align: start`). Phase 3's stylelint rule will tighten this further; any leftover `left`/`right` from Phase 1 should be flagged and fixed there.
