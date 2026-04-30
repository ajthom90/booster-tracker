# Phase 2 — Launches, Droneships, Launchpads, Stats Dashboard, Deploy Automation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the English-only public site by adding Launches, Droneships, and Launchpads table views; per-launch / per-launchpad / per-location detail pages; a `/stats` dashboard with charts; `/admin/status` and `/healthz`; and the GitHub Actions release pipeline so self-hosters can pull a versioned Docker image.

**Architecture:** Phase 1 left us with a hard-coded `runBoostersQuery` and a per-entity `+page.server.ts` for the boosters table. Phase 2 starts by extracting the table query and aggregate-bar pipeline into a generic `runEntityQuery` + entity config pattern. Then each new table view is a ~50-line declarative file (column metadata, filter set, aggregate computation) plus a thin Svelte page that re-uses the existing components. Charts arrive via Chart.js (Svelte component wrapper). Admin auth is a constant-time token compare against `ADMIN_TOKEN`. Deployment automation builds a multi-arch Docker image on every `main` push and publishes to GHCR; a separate weekly job seeds a fresh DB and attaches it to a GitHub Release.

**Tech Stack:** Same as Phase 1 (SvelteKit + Drizzle + better-sqlite3 + Paraglide + Vitest + Playwright + Docker), plus **Chart.js** (for stats charts) and **GitHub Container Registry** (for image distribution).

**Spec reference:** `docs/superpowers/specs/2026-04-29-booster-tracker-design.md` sections 6 (frontend table UX), 7 (detail pages), 8 (stats dashboard), 10 (deployment), 12 (observability).

**Phase 2 scope (in):**

- Generic `runEntityQuery` abstraction (one refactor task)
- `/launches`, `/droneships`, `/launchpads` table views (filter, sort, columns, aggregates, presets, CSV/JSON export, URL state) — same UX as `/boosters`
- Per-launch, per-launchpad, per-location detail pages
- `/stats` dashboard with 4 charts (launches/year, monthly sparkline, rolling 12-mo success rate, flight-count histogram) plus fleet-at-a-glance + records sections
- `/admin/status` (token-gated): per-resource sync state + manual "sync now"
- `/healthz` (unauthenticated): 200/503 based on DB readability
- `release.yml`: build + push Docker image to GHCR on every push to `main`
- `db-snapshot.yml`: weekly seeded `data.db` attached to a GitHub Release
- Updated `docker-compose.yml` to pull from GHCR by default

**Phase 2 scope (out, deferred to Phase 3):**

- Locales beyond English (`es`, `fr`, `de`, `ar`, `he`, `zh-Hans`)
- RTL support
- Inlang Fink / Crowdin sync
- `i18n-validate.yml` workflow
- Stylelint hardening to ban physical CSS properties globally
- `/translate` page

---

## File structure overview

```
booster-tracker/
├── .github/workflows/
│   ├── ci.yml                          (Phase 1, unchanged)
│   ├── release.yml                     (NEW Phase 2)
│   └── db-snapshot.yml                 (NEW Phase 2)
├── messages/en.json                    (NEW keys for new pages)
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── entity-query/
│   │   │   │   ├── types.ts            (NEW: EntityConfig)
│   │   │   │   └── query.ts            (NEW: generic runEntityQuery)
│   │   │   ├── boosters/
│   │   │   │   ├── columns.ts          (Phase 1, exports ColumnDef as a shared type)
│   │   │   │   ├── filters.ts          (Phase 1, generic over ColumnDef)
│   │   │   │   ├── query.ts            (Phase 1, refactored to use runEntityQuery)
│   │   │   │   ├── aggregates.ts       (Phase 1, unchanged)
│   │   │   │   └── export.ts           (Phase 1, unchanged)
│   │   │   ├── launches/               (NEW)
│   │   │   ├── locations/              (NEW)
│   │   │   ├── launchpads/             (NEW)
│   │   │   ├── stats/                  (NEW)
│   │   │   │   └── queries.ts
│   │   │   └── admin/                  (NEW)
│   │   │       └── auth.ts             (constant-time token compare)
│   │   └── components/
│   │       ├── ChartCard.svelte        (NEW)
│   │       └── LaunchStatusBadge.svelte (NEW)
│   └── routes/
│       ├── boosters/+page.server.ts    (Phase 1, unchanged)
│       ├── launches/                   (NEW)
│       │   ├── +page.svelte
│       │   ├── +page.server.ts
│       │   └── [slug]/{+page.svelte,+page.server.ts}
│       ├── droneships/                 (NEW; lists landing_location rows)
│       │   ├── +page.svelte
│       │   └── +page.server.ts
│       ├── launchpads/                 (NEW)
│       │   ├── +page.svelte
│       │   ├── +page.server.ts
│       │   └── [slug]/{+page.svelte,+page.server.ts}
│       ├── locations/[slug]/           (NEW; per-landing-location detail)
│       ├── stats/                      (NEW)
│       │   ├── +page.svelte
│       │   └── +page.server.ts
│       ├── healthz/+server.ts          (NEW)
│       ├── admin/status/{+page.svelte,+page.server.ts} (NEW)
│       └── api/
│           ├── boosters/export/+server.ts (Phase 1, unchanged)
│           ├── launches/export/+server.ts (NEW)
│           ├── droneships/export/+server.ts (NEW)
│           ├── launchpads/export/+server.ts (NEW)
│           └── admin/sync/+server.ts   (NEW: manual sync trigger, token-gated)
└── tests/
    ├── unit/admin-auth.test.ts         (NEW)
    ├── unit/entity-query.test.ts       (NEW)
    └── integration/{launches,locations,launchpads,stats}-query.test.ts (NEW)
```

---

## Conventions reminder (from Phase 1)

- **Svelte 5 runes**: `let { x } = $props()`, `let foo = $state(false)`, `let bar = $derived(...)`, `{@render children?.()}`, `onclick=` (not `on:click=`).
- **Internal links**: use `resolve()` from `$app/paths`. Cast as `ResolvedPathname` if needed by ESLint (`svelte/no-navigation-without-resolve`).
- **CSS uses logical properties only** (`margin-inline-start`, `padding-block-end`, `text-align: start`). No `margin-left`/`right`, etc. The stylelint config catches `margin-left/right`, `padding-left/right`, `border-left/right*`, and `text-align: left/right`.
- **i18n**: all UI strings go through `m.<key>()`. Add new keys to `messages/en.json`. Vite plugin recompiles on save.
- **Drizzle DB type**: use `import type { AppDb } from '$lib/server/db/types'`.
- **Test count starts at 37** (Phase 1 final). Each TDD task lands a few new tests; final Phase 2 count is around 50-55.
- **Commit per task** with the exact message specified. Working tree must be clean after each task.

---

## Task 1: Generic `runEntityQuery` + boosters refactor

**Goal**: stop duplicating filter-clause-to-SQL builder per entity. Make adding launches / droneships / launchpads cheap (~50-line declarative file each).

**Files:**

- Create: `src/lib/server/entity-query/types.ts`
- Create: `src/lib/server/entity-query/query.ts`
- Create: `tests/unit/entity-query.test.ts`
- Modify: `src/lib/server/boosters/query.ts` (becomes a thin wrapper)

### Step 1: Define the entity config type

Create `src/lib/server/entity-query/types.ts`:

```ts
import type { SQL, AnyColumn } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { FilterClause } from '../../url-state';

export type EntityColumnRef =
	| AnyColumn
	| {
			kind: 'computed';
			toSql: (clause: FilterClause) => SQL | null;
			orderBy: SQL;
	  };

export type EntityConfig<TTable extends SQLiteTable> = {
	table: TTable;
	columnMap: Record<string, EntityColumnRef>;
	defaultSort: SQL[];
};
```

### Step 2: Write the failing test

Create `tests/unit/entity-query.test.ts`. The test creates a small standalone `widget` schema (so it doesn't depend on app schema), seeds it with three rows, then runs `runEntityQuery` against multiple filter/sort/page combinations:

```ts
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { desc, sql } from 'drizzle-orm';
import { runEntityQuery } from '../../src/lib/server/entity-query/query';
import type { EntityConfig } from '../../src/lib/server/entity-query/types';

const widget = sqliteTable('widget', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	count: integer('count').notNull().default(0)
});

function makeDb() {
	const sqlite = new Database(':memory:');
	const db = drizzle(sqlite);
	sqlite
		.prepare(
			'CREATE TABLE widget (id INTEGER PRIMARY KEY, name TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0)'
		)
		.run();
	const insert = sqlite.prepare('INSERT INTO widget (id, name, count) VALUES (?, ?, ?)');
	insert.run(1, 'alpha', 10);
	insert.run(2, 'beta', 20);
	insert.run(3, 'gamma', 5);
	return db;
}

const config: EntityConfig<typeof widget> = {
	table: widget,
	columnMap: { id: widget.id, name: widget.name, count: widget.count },
	defaultSort: [desc(widget.id)]
};

describe('runEntityQuery', () => {
	it('returns all rows with no filter', async () => {
		const db = makeDb();
		const r = await runEntityQuery(db as never, config, {
			filters: [],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(3);
		expect(r.rows).toHaveLength(3);
	});

	it('filters by gte on a number column', async () => {
		const db = makeDb();
		const r = await runEntityQuery(db as never, config, {
			filters: [{ id: 'count', op: 'gte', value: 10 }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
	});

	it('filters by contains on a text column', async () => {
		const db = makeDb();
		const r = await runEntityQuery(db as never, config, {
			filters: [{ id: 'name', op: 'contains', value: 'eta' }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.rows.map((row) => (row as { name: string }).name)).toEqual(['beta']);
	});

	it('paginates', async () => {
		const db = makeDb();
		const r = await runEntityQuery(db as never, config, {
			filters: [],
			sort: [{ id: 'id', desc: false }],
			page: 1,
			pageSize: 1
		});
		expect(r.total).toBe(3);
		expect(r.rows).toHaveLength(1);
		expect((r.rows[0] as { id: number }).id).toBe(2);
	});

	it('uses defaultSort when sort is empty', async () => {
		const db = makeDb();
		const r = await runEntityQuery(db as never, config, {
			filters: [],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect((r.rows[0] as { id: number }).id).toBe(3);
	});

	it('supports computed columns', async () => {
		const db = makeDb();
		const computedConfig: EntityConfig<typeof widget> = {
			table: widget,
			columnMap: {
				...config.columnMap,
				count_doubled: {
					kind: 'computed',
					toSql: (clause) => {
						if (clause.op === 'gte') return sql`(${widget.count} * 2) >= ${clause.value}`;
						return null;
					},
					orderBy: sql`(${widget.count} * 2) DESC`
				}
			},
			defaultSort: [desc(widget.id)]
		};
		const r = await runEntityQuery(db as never, computedConfig, {
			filters: [{ id: 'count_doubled', op: 'gte', value: 30 }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(1);
		expect((r.rows[0] as { name: string }).name).toBe('beta');
	});
});
```

### Step 3: Run, see fail (module not found)

```bash
npm test
```

### Step 4: Implement `src/lib/server/entity-query/query.ts`

```ts
import { and, asc, desc, eq, gt, gte, lt, lte, like, sql, type SQL, inArray } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { AppDb } from '../db/types';
import type { FilterClause, SortClause } from '../../url-state';
import type { EntityColumnRef, EntityConfig } from './types';

export type RunQueryArgs = {
	filters: FilterClause[];
	sort: SortClause[];
	page: number;
	pageSize: number;
};

function isComputed(
	ref: EntityColumnRef
): ref is Exclude<EntityColumnRef, never> & { kind: 'computed' } {
	return typeof ref === 'object' && 'kind' in ref && ref.kind === 'computed';
}

function clauseToSql(
	clause: FilterClause,
	columnMap: EntityConfig<SQLiteTable>['columnMap']
): SQL | null {
	const ref = columnMap[clause.id];
	if (!ref) return null;
	if (isComputed(ref)) return ref.toSql(clause);
	const col = ref;
	switch (clause.op) {
		case 'eq':
			return eq(col, clause.value as never);
		case 'neq':
			return sql`${col} != ${clause.value}`;
		case 'gt':
			return gt(col, clause.value as never);
		case 'gte':
			return gte(col, clause.value as never);
		case 'lt':
			return lt(col, clause.value as never);
		case 'lte':
			return lte(col, clause.value as never);
		case 'in':
			if (!Array.isArray(clause.value) || clause.value.length === 0) return null;
			return inArray(col, clause.value as never[]);
		case 'contains':
			return like(col as never, `%${clause.value}%`);
		case 'startsWith':
			return like(col as never, `${clause.value}%`);
		case 'between':
			if (!Array.isArray(clause.value) || clause.value.length !== 2) return null;
			return sql`${col} BETWEEN ${clause.value[0]} AND ${clause.value[1]}`;
		default:
			return null;
	}
}

export async function runEntityQuery<T extends SQLiteTable>(
	db: AppDb,
	config: EntityConfig<T>,
	args: RunQueryArgs
): Promise<{ rows: Array<Record<string, unknown>>; total: number }> {
	const where = args.filters
		.map((c) => clauseToSql(c, config.columnMap))
		.filter((s): s is SQL => s !== null);

	const whereExpr = where.length === 0 ? undefined : and(...where);

	const totalRows = await db
		.select({ c: sql<number>`count(*)` })
		.from(config.table as never)
		.where(whereExpr as never);
	const total = totalRows[0]?.c ?? 0;

	const orderBy =
		args.sort.length === 0
			? config.defaultSort
			: args.sort
					.map((s) => {
						const ref = config.columnMap[s.id];
						if (!ref) return null;
						if (isComputed(ref)) return ref.orderBy;
						return s.desc ? desc(ref) : asc(ref);
					})
					.filter((x): x is SQL => x !== null);

	const rows = await db
		.select()
		.from(config.table as never)
		.where(whereExpr as never)
		.orderBy(...orderBy)
		.limit(args.pageSize)
		.offset(args.page * args.pageSize);

	return { rows: rows as Array<Record<string, unknown>>, total };
}
```

### Step 5: Run, see all 6 tests pass

Expected: 43 total tests passing.

### Step 6: Refactor `src/lib/server/boosters/query.ts`

Replace its contents with a thin wrapper that exports both `boosterEntityConfig` and `runBoostersQuery`:

```ts
import { desc, sql } from 'drizzle-orm';
import type { AppDb } from '../db/types';
import { booster } from '../db/schema';
import type { EntityConfig } from '../entity-query/types';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';

export const boosterEntityConfig: EntityConfig<typeof booster> = {
	table: booster,
	columnMap: {
		serial_number: booster.serialNumber,
		status: booster.status,
		flights: booster.flights,
		successful_landings: booster.successfulLandings,
		attempted_landings: booster.attemptedLandings,
		first_launch_date: booster.firstLaunchDate,
		last_launch_date: booster.lastLaunchDate,
		days_since_last_flight: {
			kind: 'computed',
			toSql: (clause) => {
				if (typeof clause.value !== 'number') return null;
				const expr = sql`CAST(julianday('now') - julianday(${booster.lastLaunchDate}) AS INTEGER)`;
				switch (clause.op) {
					case 'eq':
						return sql`${expr} = ${clause.value}`;
					case 'gt':
						return sql`${expr} > ${clause.value}`;
					case 'gte':
						return sql`${expr} >= ${clause.value}`;
					case 'lt':
						return sql`${expr} < ${clause.value}`;
					case 'lte':
						return sql`${expr} <= ${clause.value}`;
					default:
						return null;
				}
			},
			orderBy: sql`CAST(julianday('now') - julianday(${booster.lastLaunchDate}) AS INTEGER) DESC`
		}
	},
	defaultSort: [desc(booster.lastLaunchDate)]
};

export async function runBoostersQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, boosterEntityConfig, args);
}
```

### Step 7: Verify all checks

```bash
npm test
npm run check
npm run lint
```

All exit 0.

### Step 8: Commit

```bash
git add src/lib/server/entity-query/ src/lib/server/boosters/query.ts tests/unit/entity-query.test.ts
git commit -m "Extract generic runEntityQuery for cross-entity table views"
```

---

## Task 2: Launches table — server side (columns, query, aggregates, load, export)

**Files:**

- Create: `src/lib/server/launches/columns.ts`
- Create: `src/lib/server/launches/query.ts`
- Create: `src/lib/server/launches/aggregates.ts`
- Create: `src/lib/server/launches/export.ts`
- Create: `src/routes/launches/+page.server.ts`
- Create: `src/routes/api/launches/export/+server.ts`
- Create: `tests/integration/launches-query.test.ts`
- Modify: `messages/en.json`

### Step 1: Column metadata — `src/lib/server/launches/columns.ts`

```ts
import type { ColumnDef } from '../boosters/columns';

export const LAUNCH_STATUSES = [
	'success',
	'failure',
	'partial_failure',
	'upcoming',
	'in_flight',
	'unknown'
] as const;

export const LAUNCH_COLUMNS: readonly ColumnDef[] = [
	{ id: 'name', label: 'launches_col_name', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'status',
		label: 'launches_col_status',
		filter: { kind: 'enum', options: LAUNCH_STATUSES },
		defaultVisible: true
	},
	{ id: 'net', label: 'launches_col_net', filter: { kind: 'dateRange' }, defaultVisible: true },
	{
		id: 'mission_type',
		label: 'launches_col_mission_type',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{ id: 'orbit', label: 'launches_col_orbit', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'rocket_name',
		label: 'launches_col_rocket',
		filter: { kind: 'text' },
		defaultVisible: false
	},
	{ id: 'launchpad_id', label: 'launches_col_launchpad', defaultVisible: false }
];

export const LAUNCH_DEFAULT_VISIBLE = LAUNCH_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
```

### Step 2: Query — `src/lib/server/launches/query.ts`

```ts
import { desc } from 'drizzle-orm';
import { launch } from '../db/schema';
import type { EntityConfig } from '../entity-query/types';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';
import type { AppDb } from '../db/types';

export const launchEntityConfig: EntityConfig<typeof launch> = {
	table: launch,
	columnMap: {
		name: launch.name,
		status: launch.status,
		net: launch.net,
		mission_type: launch.missionType,
		orbit: launch.orbit,
		rocket_name: launch.rocketName,
		launchpad_id: launch.launchpadId
	},
	defaultSort: [desc(launch.net)]
};

export async function runLaunchesQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, launchEntityConfig, args);
}
```

### Step 3: Aggregates — `src/lib/server/launches/aggregates.ts`

```ts
import type { AppDb } from '../db/types';
import type { FilterClause } from '../../url-state';
import { runLaunchesQuery } from './query';

export type LaunchAggregates = {
	count: number;
	successCount: number;
	failureCount: number;
	upcomingCount: number;
	successRate: number;
};

export async function computeLaunchAggregates(
	db: AppDb,
	filters: FilterClause[]
): Promise<LaunchAggregates> {
	const { rows, total } = await runLaunchesQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0)
		return { count: 0, successCount: 0, failureCount: 0, upcomingCount: 0, successRate: 0 };

	let success = 0;
	let failure = 0;
	let upcoming = 0;
	for (const row of rows) {
		const status = (row as { status: string }).status;
		if (status === 'success') success += 1;
		else if (status === 'failure' || status === 'partial_failure') failure += 1;
		else if (status === 'upcoming') upcoming += 1;
	}
	const decided = success + failure;
	return {
		count: total,
		successCount: success,
		failureCount: failure,
		upcomingCount: upcoming,
		successRate: decided === 0 ? 0 : success / decided
	};
}
```

### Step 4: Export helpers — `src/lib/server/launches/export.ts`

```ts
import type { Launch } from '../db/schema';
import { LAUNCH_COLUMNS } from './columns';

function csvEscape(s: unknown): string {
	if (s == null) return '';
	const str = String(s);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

const FIELD_FOR_COL: Record<string, (l: Launch) => unknown> = {
	name: (l) => l.name,
	status: (l) => l.status,
	net: (l) => l.net,
	mission_type: (l) => l.missionType,
	orbit: (l) => l.orbit,
	rocket_name: (l) => l.rocketName,
	launchpad_id: (l) => l.launchpadId
};

export function launchesToCsv(rows: Launch[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LAUNCH_COLUMNS.map((c) => c.id);
	const header = cols.join(',');
	const body = rows
		.map((r) => cols.map((c) => csvEscape(FIELD_FOR_COL[c]?.(r))).join(','))
		.join('\n');
	return `${header}\n${body}\n`;
}

export function launchesToJson(rows: Launch[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LAUNCH_COLUMNS.map((c) => c.id);
	return JSON.stringify(
		rows.map((r) => Object.fromEntries(cols.map((c) => [c, FIELD_FOR_COL[c]?.(r) ?? null]))),
		null,
		2
	);
}
```

### Step 5: Load function — `src/routes/launches/+page.server.ts`

```ts
import type { PageServerLoad } from './$types';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { LAUNCH_COLUMNS, LAUNCH_DEFAULT_VISIBLE } from '$lib/server/launches/columns';
import { validateFilters } from '$lib/server/boosters/filters';
import { runLaunchesQuery } from '$lib/server/launches/query';
import { computeLaunchAggregates } from '$lib/server/launches/aggregates';
import { getDb } from '$lib/server/db/client';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const v = url.searchParams.get('v');
	const decoded = decodeViewState(v) ?? EMPTY_VIEW_STATE;
	const { valid: filters, rejected } = validateFilters(LAUNCH_COLUMNS, decoded.filters);
	const sort = decoded.sort;
	const page = Math.max(0, decoded.page);
	const visibleCols = decoded.visibleCols.length > 0 ? decoded.visibleCols : LAUNCH_DEFAULT_VISIBLE;

	const db = getDb();
	const [{ rows, total }, aggregates] = await Promise.all([
		runLaunchesQuery(db, { filters, sort, page, pageSize: PAGE_SIZE }),
		computeLaunchAggregates(db, filters)
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
		columns: LAUNCH_COLUMNS,
		rejected
	};
};
```

### Step 6: Export endpoint — `src/routes/api/launches/export/+server.ts`

```ts
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { runLaunchesQuery } from '$lib/server/launches/query';
import { validateFilters } from '$lib/server/boosters/filters';
import { LAUNCH_COLUMNS, LAUNCH_DEFAULT_VISIBLE } from '$lib/server/launches/columns';
import { launchesToCsv, launchesToJson } from '$lib/server/launches/export';
import { getDb } from '$lib/server/db/client';
import type { Launch } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ url }) => {
	const format = url.searchParams.get('format') ?? 'csv';
	if (format !== 'csv' && format !== 'json') throw error(400, 'format must be csv or json');

	const decoded = decodeViewState(url.searchParams.get('v')) ?? EMPTY_VIEW_STATE;
	const { valid: filters } = validateFilters(LAUNCH_COLUMNS, decoded.filters);
	const visibleCols = decoded.visibleCols.length > 0 ? decoded.visibleCols : LAUNCH_DEFAULT_VISIBLE;

	const db = getDb();
	const { rows } = await runLaunchesQuery(db, {
		filters,
		sort: decoded.sort,
		page: 0,
		pageSize: 10_000
	});
	const launches = rows as Launch[];

	const stamp = new Date().toISOString().slice(0, 10);
	const filename = `launches-${stamp}.${format}`;
	const body =
		format === 'csv' ? launchesToCsv(launches, visibleCols) : launchesToJson(launches, visibleCols);

	return new Response(body, {
		headers: {
			'content-type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json',
			'content-disposition': `attachment; filename="${filename}"`
		}
	});
};
```

### Step 7: i18n keys — append to `messages/en.json`

```json
"launches_page_title": "Launches",
"launches_page_subtitle": "Every Falcon and Falcon Heavy launch with mission and outcome.",
"launches_col_name": "Mission",
"launches_col_status": "Status",
"launches_col_net": "Date",
"launches_col_mission_type": "Mission type",
"launches_col_orbit": "Orbit",
"launches_col_rocket": "Rocket",
"launches_col_launchpad": "Launchpad",
"nav_launches": "Launches",
"launch_status_success": "Success",
"launch_status_failure": "Failure",
"launch_status_partial_failure": "Partial failure",
"launch_status_upcoming": "Upcoming",
"launch_status_in_flight": "In flight",
"launch_status_unknown": "Unknown",
"agg_launches_success_rate": "Success rate",
"agg_launches_upcoming": "Upcoming",
"agg_launches_failures": "Failures"
```

### Step 8: Integration test — `tests/integration/launches-query.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { launch, launchpad } from '../../src/lib/server/db/schema';
import { runLaunchesQuery } from '../../src/lib/server/launches/query';

async function seed(db: ReturnType<typeof makeTestDb>['db']) {
	await db.insert(launchpad).values({ id: 80, name: 'SLC-40', slug: 'slc-40' });
	await db.insert(launch).values([
		{
			id: 'a',
			slug: 'starlink-1',
			name: 'Starlink 1',
			status: 'success',
			net: '2025-04-01T00:00:00Z',
			missionType: 'Communications',
			launchpadId: 80
		},
		{
			id: 'b',
			slug: 'starlink-2',
			name: 'Starlink 2',
			status: 'failure',
			net: '2025-05-01T00:00:00Z',
			missionType: 'Communications',
			launchpadId: 80
		},
		{
			id: 'c',
			slug: 'crs-29',
			name: 'CRS-29',
			status: 'success',
			net: '2025-06-01T00:00:00Z',
			missionType: 'Resupply',
			launchpadId: 80
		}
	]);
}

describe('runLaunchesQuery', () => {
	it('returns all launches sorted by net desc by default', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLaunchesQuery(db, { filters: [], sort: [], page: 0, pageSize: 50 });
		expect(r.total).toBe(3);
		expect((r.rows[0] as { id: string }).id).toBe('c');
	});

	it('filters by status', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLaunchesQuery(db, {
			filters: [{ id: 'status', op: 'in', value: ['success'] }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
	});

	it('filters by mission_type contains', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLaunchesQuery(db, {
			filters: [{ id: 'mission_type', op: 'contains', value: 'esup' }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(1);
	});
});
```

### Step 9: Run

```bash
npm test
npm run check
```

Expected: 46 tests pass.

### Step 10: Commit

```bash
git add src/lib/server/launches/ src/routes/launches/+page.server.ts src/routes/api/launches/export/ messages/en.json tests/integration/launches-query.test.ts
git commit -m "Add launches table — server (columns, query, aggregates, load, export)"
```

---

## Task 3: Launches table — page UI

**Goal**: render the launches table via the same components as `/boosters`. The trick is the existing components (`AggregateBar`, `ExportMenu`, `PresetsMenu`) are booster-specific. **Generalize them in this task** so they can be reused.

**Files:**

- Create: `src/lib/components/LaunchStatusBadge.svelte`
- Create: `src/routes/launches/+page.svelte`
- Modify: `src/lib/components/AggregateBar.svelte` (take `tiles` array)
- Modify: `src/lib/components/ExportMenu.svelte` (take `apiBase` prop)
- Modify: `src/lib/components/PresetsMenu.svelte` (take `storageKey` and `basePath` props)
- Modify: `src/routes/boosters/+page.svelte` (pass new props for AggregateBar/PresetsMenu/ExportMenu)
- Modify: `src/routes/+layout.svelte` (add Launches nav link)

### Step 1: Generalize AggregateBar

Replace `src/lib/components/AggregateBar.svelte` with:

```svelte
<script lang="ts">
	let {
		tiles
	}: {
		tiles: Array<{
			label: string;
			value: string | number;
			denom?: number;
			suffix?: string;
		}>;
	} = $props();
</script>

<div class="aggbar">
	{#each tiles as t (t.label)}
		<div class="tile">
			<div class="tile-label">{t.label}</div>
			<div class="tile-value">
				<strong>{t.value}</strong>
				{#if t.denom != null}<span class="denom">/ {t.denom}</span>{/if}
				{#if t.suffix}<span class="suffix">{t.suffix}</span>{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.aggbar {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
	}
	.tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}
	.tile-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}
	.tile-value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-block-start: 0.25rem;
	}
	.denom,
	.suffix {
		color: var(--text-muted);
		font-size: 0.85rem;
		font-weight: 500;
	}
	@media (width <= 640px) {
		.aggbar {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
```

### Step 2: Generalize ExportMenu

Replace `src/lib/components/ExportMenu.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/i18n/runtime';
	let { apiBase = '/api/boosters/export' }: { apiBase?: string } = $props();

	let open = $state(false);
	let v = $derived(page.url.searchParams.get('v') ?? '');
	let csvHref = $derived(`${apiBase}?format=csv${v ? `&v=${encodeURIComponent(v)}` : ''}`);
	let jsonHref = $derived(`${apiBase}?format=json${v ? `&v=${encodeURIComponent(v)}` : ''}`);
</script>

<div class="menu">
	<button onclick={() => (open = !open)}>{m.btn_export()} ▾</button>
	{#if open}
		<ul>
			<li><a href={csvHref} rel="external">{m.btn_export_csv()}</a></li>
			<li><a href={jsonHref} rel="external">{m.btn_export_json()}</a></li>
		</ul>
	{/if}
</div>

<style>
	/* unchanged from Phase 1 */
</style>
```

### Step 3: Generalize PresetsMenu

Replace `src/lib/components/PresetsMenu.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/state';
	import { m } from '$lib/i18n/runtime';

	let {
		storageKey = 'boosters',
		basePath = '/boosters'
	}: {
		storageKey?: string;
		basePath?: string;
	} = $props();

	let STORAGE_KEY = $derived(`boosterTracker.presets.${storageKey}`);

	type Preset = { name: string; v: string };
	let presets: Preset[] = $state([]);
	let open = $state(false);

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
		const v = page.url.searchParams.get('v') ?? '';
		if (!v) return;
		const name = prompt('Name this view');
		if (!name) return;
		presets = [...presets.filter((p) => p.name !== name), { name, v }];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}

	function load(p: Preset) {
		open = false;
		const dest = (resolve(basePath as never) + `?v=${encodeURIComponent(p.v)}`) as ResolvedPathname;
		goto(dest);
	}

	function remove(name: string) {
		presets = presets.filter((p) => p.name !== name);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
	}
</script>

<!-- markup unchanged from Phase 1 -->
```

### Step 4: LaunchStatusBadge

Create `src/lib/components/LaunchStatusBadge.svelte`:

```svelte
<script lang="ts">
	import { m } from '$lib/i18n/runtime';
	let { status }: { status: string } = $props();

	const labels: Record<string, () => string> = {
		success: m.launch_status_success,
		failure: m.launch_status_failure,
		partial_failure: m.launch_status_partial_failure,
		upcoming: m.launch_status_upcoming,
		in_flight: m.launch_status_in_flight,
		unknown: m.launch_status_unknown
	};
	let label = $derived((labels[status] ?? m.launch_status_unknown)());
</script>

<span class="badge badge-{status}">{label}</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding-block: 0.125rem;
		padding-inline: 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid transparent;
	}
	.badge::before {
		content: '';
		inline-size: 6px;
		block-size: 6px;
		border-radius: 999px;
		background: currentColor;
		opacity: 0.7;
	}
	.badge-success {
		background: #dcfce7;
		color: #166534;
		border-color: #bbf7d0;
	}
	.badge-failure {
		background: #fecaca;
		color: #991b1b;
		border-color: #fca5a5;
	}
	.badge-partial_failure {
		background: #fed7aa;
		color: #9a3412;
		border-color: #fdba74;
	}
	.badge-upcoming {
		background: #dbeafe;
		color: #1e40af;
		border-color: #bfdbfe;
	}
	.badge-in_flight {
		background: #fef3c7;
		color: #854d0e;
		border-color: #fde68a;
	}
	.badge-unknown {
		background: #f3f4f6;
		color: #6b7280;
		border-color: #e5e7eb;
	}
</style>
```

### Step 5: Launches page — `src/routes/launches/+page.svelte`

The page mirrors the boosters page structure. Use the existing `FilterChipBar`, `ColumnsMenu`, `AggregateBar` (now generic), `ExportMenu` (with `apiBase="/api/launches/export"`), `PresetsMenu` (with `storageKey="launches"` and `basePath="/launches"`), and the new `LaunchStatusBadge`.

Cell renderer for launches:

```ts
function cellValue(row: any, colId: string): string {
	switch (colId) {
		case 'name':
			return ''; // rendered as a link
		case 'status':
			return ''; // rendered as badge
		case 'net':
			return formatDate(row.net);
		case 'mission_type':
			return row.missionType ?? '';
		case 'orbit':
			return row.orbit ?? '';
		case 'rocket_name':
			return row.rocketName ?? '';
		case 'launchpad_id':
			return row.launchpadId == null ? '—' : String(row.launchpadId);
		default:
			return '';
	}
}
```

For the name column, link to `/launches/<slug>` using `resolve()` + `ResolvedPathname` cast.

Aggregate tiles for launches:

```ts
[
	{ label: m.agg_showing(), value: data.aggregates.count, denom: data.total },
	{
		label: m.agg_launches_success_rate(),
		value: `${(data.aggregates.successRate * 100).toFixed(1)}%`
	},
	{ label: m.agg_launches_upcoming(), value: data.aggregates.upcomingCount },
	{ label: m.agg_launches_failures(), value: data.aggregates.failureCount }
];
```

Copy the rest of the structure (page header, filter chip bar, table with sort headers, pager) from `src/routes/boosters/+page.svelte`. Key differences: link goes to `/launches/<slug>`, status badge is `LaunchStatusBadge`, the `mono` style for the link uses `font-family: var(--font-mono)` which is mostly used for booster serials — for launch names (longer text), drop the mono and just use `color: var(--accent)`.

### Step 6: Update `src/routes/boosters/+page.svelte`

Pass tiles array to the now-generic AggregateBar, and the `storageKey="boosters"` `basePath="/boosters"` to PresetsMenu (the defaults make this optional, but explicit is clearer). The boosters tiles:

```ts
[
	{ label: m.agg_showing(), value: data.aggregates.count, denom: data.total },
	{ label: m.agg_avg_flights(), value: data.aggregates.avgFlights.toFixed(1) },
	{ label: m.agg_total_landings(), value: data.aggregates.totalLandings },
	{
		label: m.agg_landing_success_rate(),
		value: `${(data.aggregates.successRate * 100).toFixed(1)}%`
	}
];
```

### Step 7: Add Launches nav link in `+layout.svelte`

```svelte
<nav class="site-nav">
	<a
		href={resolve('/boosters')}
		class="nav-link"
		class:active={page.url.pathname.startsWith('/boosters')}>{m.nav_boosters()}</a
	>
	<a
		href={resolve('/launches')}
		class="nav-link"
		class:active={page.url.pathname.startsWith('/launches')}>{m.nav_launches()}</a
	>
</nav>
```

(Drop or update any `onBoosters` derived var that was previously the only nav check.)

### Step 8: Smoke test

```bash
docker stop booster-tracker 2>/dev/null
pkill -f 'vite dev' 2>/dev/null; sleep 1
rm -f /tmp/dev.log
npm run dev -- --port 5173 > /tmp/dev.log 2>&1 &
sleep 6
curl -s -o /dev/null -w "/boosters %{http_code}\n" http://localhost:5173/boosters
curl -s -o /dev/null -w "/launches %{http_code}\n" http://localhost:5173/launches
curl -s -o /dev/null -w "/api/launches/export %{http_code}\n" 'http://localhost:5173/api/launches/export?format=csv'
pkill -f 'vite dev' 2>/dev/null
```

All 200. The boosters page must still render correctly after the AggregateBar refactor.

### Step 9: Verify all checks

```bash
npm run check
npm run lint
npm test
```

All exit 0.

### Step 10: Commit

```bash
git add src/lib/components/LaunchStatusBadge.svelte src/lib/components/AggregateBar.svelte src/lib/components/ExportMenu.svelte src/lib/components/PresetsMenu.svelte src/routes/launches/+page.svelte src/routes/boosters/+page.svelte src/routes/+layout.svelte
git commit -m "Add launches table page; generalize AggregateBar/ExportMenu/PresetsMenu"
```

---

## Task 4: Droneships (landing locations) table — server side

Same shape as Task 2. Substitute `landingLocation` table.

**Files** (parallel to Task 2 with `locations` instead of `launches`):

- `src/lib/server/locations/{columns,query,aggregates,export}.ts`
- `src/routes/droneships/+page.server.ts`
- `src/routes/api/droneships/export/+server.ts`
- `tests/integration/locations-query.test.ts`
- `messages/en.json` additions

### Columns config

```ts
import type { ColumnDef } from '../boosters/columns';
export const LOCATION_TYPES = ['ASDS', 'RTLS', 'Ocean', 'Unknown'] as const;
export const LOCATION_COLUMNS: readonly ColumnDef[] = [
	{ id: 'name', label: 'locations_col_name', filter: { kind: 'text' }, defaultVisible: true },
	{ id: 'abbrev', label: 'locations_col_abbrev', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'location_type',
		label: 'locations_col_type',
		filter: { kind: 'enum', options: LOCATION_TYPES },
		defaultVisible: true
	},
	{
		id: 'successful_landings',
		label: 'locations_col_successful_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	},
	{
		id: 'attempted_landings',
		label: 'locations_col_attempted_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	}
];
export const LOCATION_DEFAULT_VISIBLE = LOCATION_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
```

### Query

```ts
import { desc } from 'drizzle-orm';
import { landingLocation } from '../db/schema';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';
import type { EntityConfig } from '../entity-query/types';
import type { AppDb } from '../db/types';

export const locationEntityConfig: EntityConfig<typeof landingLocation> = {
	table: landingLocation,
	columnMap: {
		name: landingLocation.name,
		abbrev: landingLocation.abbrev,
		location_type: landingLocation.locationType,
		successful_landings: landingLocation.successfulLandings,
		attempted_landings: landingLocation.attemptedLandings
	},
	defaultSort: [desc(landingLocation.successfulLandings)]
};

export async function runLocationsQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, locationEntityConfig, args);
}
```

### Aggregates

```ts
export type LocationAggregates = {
	count: number;
	totalSuccessful: number;
	totalAttempted: number;
	successRate: number;
};

export async function computeLocationAggregates(
	db: AppDb,
	filters: FilterClause[]
): Promise<LocationAggregates> {
	const { rows, total } = await runLocationsQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0) return { count: 0, totalSuccessful: 0, totalAttempted: 0, successRate: 0 };
	let success = 0;
	let attempt = 0;
	for (const r of rows) {
		const row = r as { successfulLandings: number | null; attemptedLandings: number | null };
		success += row.successfulLandings ?? 0;
		attempt += row.attemptedLandings ?? 0;
	}
	return {
		count: total,
		totalSuccessful: success,
		totalAttempted: attempt,
		successRate: attempt === 0 ? 0 : success / attempt
	};
}
```

### Export, load, export endpoint, test

All structurally identical to Task 2 with `locations` substituted. Three integration tests parallel to Task 2's.

### i18n keys

```json
"locations_page_title": "Droneships & landing zones",
"locations_page_subtitle": "Where each Falcon booster comes home.",
"locations_col_name": "Name",
"locations_col_abbrev": "Abbrev",
"locations_col_type": "Type",
"locations_col_successful_landings": "Successful",
"locations_col_attempted_landings": "Attempted",
"nav_droneships": "Droneships",
"agg_locations_total_attempts": "Total attempts",
"agg_locations_success_rate": "Success rate"
```

### Verify + commit

`npm test` → 49 tests; commit with message `Add droneships (landing locations) table — server side`.

---

## Task 5: Droneships table — page UI

Page lives at `src/routes/droneships/+page.svelte`. Structurally identical to launches page (Task 3) with these substitutions:

- Title/subtitle: `m.locations_page_title()` / `m.locations_page_subtitle()`
- The "name" column links to `/locations/<slug>` (built in Task 10)
- No status badge — use a small inline pill `<span class="loc-type loc-type-{row.location_type}">{row.location_type}</span>`. Provide three colors (asds = blue, rtls = orange, ocean = gray).
- Aggregate tiles: `[{ label: m.agg_showing(), value: aggs.count, denom: data.total }, { label: m.agg_locations_total_attempts(), value: aggs.totalAttempted }, { label: m.agg_locations_success_rate(), value: \`${(aggs.successRate \* 100).toFixed(1)}%\` }]` (3-up; the 4th tile is empty or omit it gracefully)
- ExportMenu: `apiBase="/api/droneships/export"`. PresetsMenu: `storageKey="droneships"` `basePath="/droneships"`.

Add nav link in `+layout.svelte`:

```svelte
<a
	href={resolve('/droneships')}
	class="nav-link"
	class:active={page.url.pathname.startsWith('/droneships') ||
		page.url.pathname.startsWith('/locations')}>{m.nav_droneships()}</a
>
```

Smoke test `/droneships` returns 200. Commit message: `Add droneships table page UI`.

---

## Task 6: Launchpads table — server side

Same as Task 4 with `launchpad` table. **Files** parallel:

- `src/lib/server/launchpads/{columns,query,aggregates,export}.ts`
- `src/routes/launchpads/+page.server.ts`
- `src/routes/api/launchpads/export/+server.ts`
- `tests/integration/launchpads-query.test.ts`
- `messages/en.json` additions

### Columns

```ts
export const LAUNCHPAD_COLUMNS: readonly ColumnDef[] = [
	{ id: 'name', label: 'launchpads_col_name', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'full_name',
		label: 'launchpads_col_full_name',
		filter: { kind: 'text' },
		defaultVisible: false
	},
	{
		id: 'location',
		label: 'launchpads_col_location',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{
		id: 'country_code',
		label: 'launchpads_col_country',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{
		id: 'total_launches',
		label: 'launchpads_col_total_launches',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	}
];
```

### Aggregates

```ts
export type LaunchpadAggregates = { count: number; totalLaunches: number };
```

(Just count + sum-of-totalLaunches.)

### i18n

```json
"launchpads_page_title": "Launchpads",
"launchpads_page_subtitle": "Every active SpaceX launch site.",
"launchpads_col_name": "Name",
"launchpads_col_full_name": "Full name",
"launchpads_col_location": "Location",
"launchpads_col_country": "Country",
"launchpads_col_total_launches": "Total launches",
"nav_launchpads": "Launchpads",
"agg_launchpads_total_launches": "Total launches"
```

Tests + commit with message `Add launchpads table — server side`.

---

## Task 7: Launchpads table — page UI

Same shape as droneships page (Task 5). Detail-link target: `/launchpads/<slug>` (added in Task 9). Aggregate tiles: showing / total-launches.

Nav link: `<a href={resolve('/launchpads')} ...>{m.nav_launchpads()}</a>`.

Smoke test `/launchpads`. Commit message: `Add launchpads table page UI`.

---

## Task 8: Per-launch detail page

**Files:** `src/routes/launches/[slug]/+page.server.ts` and `+page.svelte`.

### Load

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import {
	launch,
	launchBooster,
	booster,
	launcherConfig,
	launchpad,
	landingLocation
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const slug = params.slug;

	const matches = await db.select().from(launch).where(eq(launch.slug, slug));
	if (matches.length === 0) throw error(404, 'Launch not found');
	const l = matches[0];

	const padRow = l.launchpadId
		? (await db.select().from(launchpad).where(eq(launchpad.id, l.launchpadId)))[0]
		: null;

	const stages = await db
		.select({
			boosterId: launchBooster.boosterId,
			role: launchBooster.role,
			flightNumber: launchBooster.flightNumber,
			landingAttempted: launchBooster.landingAttempted,
			landingSuccess: launchBooster.landingSuccess,
			landingType: launchBooster.landingType,
			boosterSerial: booster.serialNumber,
			boosterStatus: booster.status,
			configName: launcherConfig.name,
			locationName: landingLocation.name,
			locationAbbrev: landingLocation.abbrev
		})
		.from(launchBooster)
		.innerJoin(booster, eq(booster.id, launchBooster.boosterId))
		.leftJoin(launcherConfig, eq(launcherConfig.id, booster.launcherConfigId))
		.leftJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.launchId, l.id));

	return { launch: l, pad: padRow, stages };
};
```

### Page UI

`src/routes/launches/[slug]/+page.svelte`: header (rocket name eyebrow, mission name + status badge, NET, description), 4-up meta grid (mission name, type, orbit, pad), boosters section with 1 or 3 cards linked to `/boosters/<serial>`, optional YouTube embed if `webcastUrl` matches a YouTube URL pattern.

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { m, formatDate } from '$lib/i18n/runtime';
	import LaunchStatusBadge from '$lib/components/LaunchStatusBadge.svelte';

	let { data }: { data: PageData } = $props();
	let l = $derived(data.launch);

	function youtubeEmbedUrl(url: string | null | undefined): string | null {
		if (!url) return null;
		const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
		return m ? `https://www.youtube.com/embed/${m[1]}` : null;
	}
	let embedUrl = $derived(youtubeEmbedUrl(l.webcastUrl));

	function boosterHref(serial: string): ResolvedPathname {
		return (resolve('/boosters') + '/' + serial) as ResolvedPathname;
	}

	function landingCellText(s: (typeof data.stages)[number]): string {
		if (s.landingAttempted == null) return '—';
		if (s.landingAttempted === false) return 'Not attempted';
		if (s.landingSuccess) return s.locationAbbrev ?? s.locationName ?? 'OK';
		return 'Failed';
	}
</script>

<svelte:head><title>{l.name} · {m.site_title()}</title></svelte:head>

<header class="header">
	<span class="eyebrow">{l.rocketName ?? '—'}</span>
	<h1>{l.name} <LaunchStatusBadge status={l.status} /></h1>
	<p class="net">{formatDate(l.net)}</p>
	{#if l.missionDescription}<p class="description">{l.missionDescription}</p>{/if}
</header>

<section class="meta-grid">
	<div class="meta-tile">
		<div class="label">Mission</div>
		<div class="value">{l.missionName ?? '—'}</div>
	</div>
	<div class="meta-tile">
		<div class="label">Type</div>
		<div class="value">{l.missionType ?? '—'}</div>
	</div>
	<div class="meta-tile">
		<div class="label">Orbit</div>
		<div class="value">{l.orbit ?? '—'}</div>
	</div>
	{#if data.pad}<div class="meta-tile">
			<div class="label">Pad</div>
			<div class="value">{data.pad.name}</div>
		</div>{/if}
</section>

<section>
	<h2>Boosters</h2>
	<div class="booster-grid">
		{#each data.stages as s (s.boosterId + (s.role ?? ''))}
			<div class="booster-card">
				<div class="booster-card-head">
					<a class="mono" href={boosterHref(s.boosterSerial)}>{s.boosterSerial}</a>
					{#if s.role}<span class="role-tag">{s.role}</span>{/if}
				</div>
				<div class="booster-card-body">
					<div>Flight #{s.flightNumber ?? '—'}</div>
					<div>Landing: {landingCellText(s)}</div>
				</div>
			</div>
		{/each}
	</div>
</section>

{#if embedUrl}
	<section>
		<h2>Webcast</h2>
		<div class="embed-wrap">
			<iframe src={embedUrl} title="webcast" allow="encrypted-media; fullscreen"></iframe>
		</div>
	</section>
{/if}

<style>
	.header {
		padding-block: var(--space-4);
	}
	.eyebrow {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		font-weight: 700;
	}
	.net {
		color: var(--text-muted);
	}
	.description {
		max-inline-size: 60ch;
	}
	.meta-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
		margin-block: var(--space-4);
	}
	.meta-tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}
	.label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}
	.value {
		font-weight: 600;
	}
	.booster-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-3);
	}
	.booster-card {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}
	.booster-card-head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-block-end: var(--space-2);
	}
	.mono {
		font-family: var(--font-mono);
		color: var(--accent);
		text-decoration: none;
		font-weight: 700;
	}
	.role-tag {
		background: var(--surface);
		color: var(--text-muted);
		padding-block: 2px;
		padding-inline: 6px;
		border-radius: var(--radius-sm);
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	.embed-wrap {
		aspect-ratio: 16 / 9;
		max-inline-size: 800px;
	}
	.embed-wrap iframe {
		inline-size: 100%;
		block-size: 100%;
		border: 0;
		border-radius: var(--radius-md);
	}
	@media (width <= 640px) {
		.meta-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
```

For Phase 2 (English-only), inline strings ("Boosters", "Mission", etc.) are acceptable; Phase 3 will sweep them through Paraglide.

### Verify

```bash
sqlite3 data/data.db 'SELECT slug FROM launch LIMIT 1;'
# Use that slug:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/launches/<slug>
```

Expect 200.

### Commit

```bash
git add 'src/routes/launches/[slug]/'
git commit -m "Add per-launch detail page with booster cards and webcast embed"
```

---

## Task 9: Per-launchpad detail page

**Files:** `src/routes/launchpads/[slug]/+page.server.ts` and `+page.svelte`.

### Load

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { launchpad, launch } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const matches = await db.select().from(launchpad).where(eq(launchpad.slug, params.slug));
	if (matches.length === 0) throw error(404, 'Launchpad not found');
	const pad = matches[0];

	const launches = await db
		.select({
			id: launch.id,
			slug: launch.slug,
			name: launch.name,
			status: launch.status,
			net: launch.net
		})
		.from(launch)
		.where(eq(launch.launchpadId, pad.id))
		.orderBy(desc(launch.net))
		.limit(50);

	const counts = await db
		.select({
			total: sql<number>`count(*)`,
			successes: sql<number>`sum(CASE WHEN ${launch.status} = 'success' THEN 1 ELSE 0 END)`
		})
		.from(launch)
		.where(eq(launch.launchpadId, pad.id));

	return { pad, launches, counts: counts[0] };
};
```

### Page UI

Header: pad name (h1), full_name (subtitle), location, country code as a small flag-ish badge. Two-tile stats row: `Total launches` and `Success rate` (counts.successes / counts.total). Below: a slim table of recent launches with date / mission name (link) / status badge. If list is longer than 50, show "Showing 50 most recent" hint.

### Commit

```bash
git add 'src/routes/launchpads/[slug]/'
git commit -m "Add per-launchpad detail page"
```

---

## Task 10: Per-landing-location detail page

Route: `/locations/[slug]`.

### Load

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { landingLocation, launchBooster, launch, booster } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const matches = await db
		.select()
		.from(landingLocation)
		.where(eq(landingLocation.slug, params.slug));
	if (matches.length === 0) throw error(404);
	const loc = matches[0];

	const attempts = await db
		.select({
			launchId: launch.id,
			launchSlug: launch.slug,
			launchName: launch.name,
			launchDate: launch.net,
			boosterSerial: booster.serialNumber,
			role: launchBooster.role,
			success: launchBooster.landingSuccess
		})
		.from(launchBooster)
		.innerJoin(launch, eq(launch.id, launchBooster.launchId))
		.innerJoin(booster, eq(booster.id, launchBooster.boosterId))
		.where(eq(launchBooster.landingLocationId, loc.id))
		.orderBy(desc(launch.net));

	return { location: loc, attempts };
};
```

### Page UI

Header: location name (h1), abbrev as a chip, location type pill. Stats row: `Successful` / `Attempted` / `Success rate`. Below: table of attempts with date, mission (link to `/launches/<slug>`), booster (link to `/boosters/<serial>`), success/failure pill.

### Commit

```bash
git add 'src/routes/locations/'
git commit -m "Add per-landing-location detail page"
```

---

## Task 11: Stats SQL queries + types

**Files:** `src/lib/server/stats/queries.ts`, `tests/integration/stats-queries.test.ts`.

### `queries.ts`

```ts
import { sql, asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { AppDb } from '../db/types';
import { booster, launch, launchBooster, landingLocation } from '../db/schema';

/* ---------- fleet at a glance ---------- */

export type FleetGlance = {
	totalBoosters: number;
	activeBoosters: number;
	retiredBoosters: number;
	expendedBoosters: number;
	lostBoosters: number;
	totalLaunches: number;
	totalLandingAttempts: number;
	totalLandingSuccesses: number;
	landingSuccessRate: number;
};

export async function fleetAtAGlance(db: AppDb): Promise<FleetGlance> {
	const [boosters] = await db
		.select({
			total: sql<number>`count(*)`,
			active: sql<number>`sum(CASE WHEN ${booster.status} = 'active' THEN 1 ELSE 0 END)`,
			retired: sql<number>`sum(CASE WHEN ${booster.status} = 'retired' THEN 1 ELSE 0 END)`,
			expended: sql<number>`sum(CASE WHEN ${booster.status} = 'expended' THEN 1 ELSE 0 END)`,
			lost: sql<number>`sum(CASE WHEN ${booster.status} = 'lost' THEN 1 ELSE 0 END)`
		})
		.from(booster);

	const [launches] = await db.select({ total: sql<number>`count(*)` }).from(launch);

	const [landings] = await db
		.select({
			attempts: sql<number>`sum(CASE WHEN ${launchBooster.landingAttempted} = 1 THEN 1 ELSE 0 END)`,
			successes: sql<number>`sum(CASE WHEN ${launchBooster.landingSuccess} = 1 THEN 1 ELSE 0 END)`
		})
		.from(launchBooster);

	const attempts = landings?.attempts ?? 0;
	const successes = landings?.successes ?? 0;
	return {
		totalBoosters: boosters?.total ?? 0,
		activeBoosters: boosters?.active ?? 0,
		retiredBoosters: boosters?.retired ?? 0,
		expendedBoosters: boosters?.expended ?? 0,
		lostBoosters: boosters?.lost ?? 0,
		totalLaunches: launches?.total ?? 0,
		totalLandingAttempts: attempts,
		totalLandingSuccesses: successes,
		landingSuccessRate: attempts === 0 ? 0 : successes / attempts
	};
}

/* ---------- records ---------- */

export type FleetRecords = {
	mostFlownBooster: { serial: string; flights: number } | null;
	mostUsedLaunchpad: { name: string; total: number } | null;
	mostUsedDroneship: { name: string; successes: number } | null;
};

export async function fleetRecords(db: AppDb): Promise<FleetRecords> {
	const topFlown = await db
		.select({ serial: booster.serialNumber, flights: booster.flights })
		.from(booster)
		.orderBy(desc(booster.flights))
		.limit(1);

	const topPadResult = await db
		.select({
			name: sql<string>`COALESCE(name, '—')`,
			total: sql<number>`count(*)`
		})
		.from(launch)
		.where(isNotNull(launch.launchpadId))
		.groupBy(launch.launchpadId)
		.orderBy(desc(sql`count(*)`))
		.limit(1);

	const topShipResult = await db
		.select({
			name: landingLocation.name,
			successes: sql<number>`count(*)`
		})
		.from(launchBooster)
		.innerJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.landingSuccess, true))
		.groupBy(landingLocation.id)
		.orderBy(desc(sql`count(*)`))
		.limit(1);

	return {
		mostFlownBooster: topFlown[0]
			? { serial: topFlown[0].serial, flights: topFlown[0].flights ?? 0 }
			: null,
		mostUsedLaunchpad: topPadResult[0]
			? { name: topPadResult[0].name, total: topPadResult[0].total }
			: null,
		mostUsedDroneship: topShipResult[0]
			? { name: topShipResult[0].name, successes: topShipResult[0].successes }
			: null
	};
}

/* ---------- time series ---------- */

export type LaunchesPerYearRow = { year: string; count: number };

export async function launchesPerYear(db: AppDb): Promise<LaunchesPerYearRow[]> {
	return db
		.select({
			year: sql<string>`strftime('%Y', ${launch.net})`,
			count: sql<number>`count(*)`
		})
		.from(launch)
		.groupBy(sql`strftime('%Y', ${launch.net})`)
		.orderBy(asc(sql`strftime('%Y', ${launch.net})`));
}

export type LaunchesPerMonthRow = { month: string; count: number };

export async function launchesPerMonth24(db: AppDb): Promise<LaunchesPerMonthRow[]> {
	return db
		.select({
			month: sql<string>`strftime('%Y-%m', ${launch.net})`,
			count: sql<number>`count(*)`
		})
		.from(launch)
		.where(sql`${launch.net} >= date('now', '-24 months')`)
		.groupBy(sql`strftime('%Y-%m', ${launch.net})`)
		.orderBy(asc(sql`strftime('%Y-%m', ${launch.net})`));
}

export type LandingSuccessRateRow = { monthEnd: string; successRate: number };

export async function rollingLandingSuccessRate(db: AppDb): Promise<LandingSuccessRateRow[]> {
	// 36 monthly samples, each computing the 12-month rolling success rate.
	const rows = await db.all<{ monthEnd: string; rate: number | null }>(sql`
		WITH RECURSIVE month_ends(month_end, n) AS (
			SELECT date('now', 'start of month'), 0
			UNION ALL
			SELECT date(month_end, '-1 month'), n + 1 FROM month_ends WHERE n < 35
		)
		SELECT
			month_end AS "monthEnd",
			(
				SELECT CASE WHEN SUM(CASE WHEN landing_attempted=1 THEN 1 ELSE 0 END) = 0
					THEN 0
					ELSE 1.0 * SUM(CASE WHEN landing_success=1 THEN 1 ELSE 0 END) /
						SUM(CASE WHEN landing_attempted=1 THEN 1 ELSE 0 END)
				END
				FROM launch_booster lb
				JOIN launch l ON l.id = lb.launch_id
				WHERE l.net BETWEEN date(month_end, '-12 months') AND month_end
			) AS rate
		FROM month_ends
		ORDER BY month_end ASC
	`);
	return rows.map((r) => ({ monthEnd: r.monthEnd, successRate: r.rate ?? 0 }));
}

export type FlightCountHistogramRow = { flights: number; boosters: number };

export async function flightCountHistogram(db: AppDb): Promise<FlightCountHistogramRow[]> {
	return db
		.select({
			flights: booster.flights,
			boosters: sql<number>`count(*)`
		})
		.from(booster)
		.groupBy(booster.flights)
		.orderBy(asc(booster.flights));
}
```

If Drizzle's `db.all<T>(sql\`...\`)`typing rejects the explicit row type, fall back to`getRawSqlite().prepare(sqlText).all() as Array<{ monthEnd: string; rate: number | null }>` — same runtime behavior, simpler typing. Either is fine.

### Tests — `tests/integration/stats-queries.test.ts`

Five tests:

1. `fleetAtAGlance` returns expected counts for a small seeded set.
2. `fleetRecords` returns the right top-flown booster.
3. `launchesPerYear` groups correctly across multiple years.
4. `launchesPerMonth24` only returns months in the trailing 24-month window.
5. `flightCountHistogram` returns expected counts per flight bucket.

(`rollingLandingSuccessRate` is harder to test deterministically because it depends on `date('now')` — assert it returns 36 rows and the most recent row's rate matches a hand-computed expectation.)

Use the in-memory test DB helper from Phase 1 (`tests/integration/_db.ts`). Seed minimal launches + boosters + launch_booster rows.

### Verify

`npm test` → 52 tests pass.

### Commit

```bash
git add src/lib/server/stats/ tests/integration/stats-queries.test.ts
git commit -m "Add stats SQL queries (fleet glance, records, time series, histogram)"
```

---

## Task 12: Stats page load function

**File:** `src/routes/stats/+page.server.ts`

```ts
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/client';
import {
	fleetAtAGlance,
	fleetRecords,
	launchesPerYear,
	launchesPerMonth24,
	rollingLandingSuccessRate,
	flightCountHistogram
} from '$lib/server/stats/queries';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });
	const db = getDb();
	const [glance, records, perYear, perMonth, rolling, histogram] = await Promise.all([
		fleetAtAGlance(db),
		fleetRecords(db),
		launchesPerYear(db),
		launchesPerMonth24(db),
		rollingLandingSuccessRate(db),
		flightCountHistogram(db)
	]);
	return { glance, records, perYear, perMonth, rolling, histogram };
};
```

`npm run check` exits 0. Commit:

```bash
git add src/routes/stats/+page.server.ts
git commit -m "Add stats page load function"
```

---

## Task 13: Stats page UI with Chart.js

**Files:**

- Install: `chart.js`
- Create: `src/lib/components/ChartCard.svelte`
- Create: `src/routes/stats/+page.svelte`
- Modify: `src/routes/+layout.svelte` (add Stats nav link)

### Step 1: Install Chart.js

```bash
npm install chart.js
```

### Step 2: ChartCard wrapper

`src/lib/components/ChartCard.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables, type ChartConfiguration } from 'chart.js';
	Chart.register(...registerables);

	let {
		title,
		config
	}: {
		title: string;
		config: ChartConfiguration;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | null = null;

	onMount(() => {
		if (!canvas) return;
		chart = new Chart(canvas, config);
		return () => chart?.destroy();
	});
</script>

<div class="chart-card">
	<h3>{title}</h3>
	<div class="chart-wrap">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>

<style>
	.chart-card {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-4);
	}
	h3 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-block-start: 0;
	}
	.chart-wrap {
		block-size: 200px;
	}
</style>
```

### Step 3: Stats page

`src/routes/stats/+page.svelte`:

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { m, formatNumber } from '$lib/i18n/runtime';
	import ChartCard from '$lib/components/ChartCard.svelte';

	let { data }: { data: PageData } = $props();

	const accent = '#ff6a13';
	const accentLight = 'rgba(255,106,19,0.2)';
	const muted = '#94a3b8';

	const launchesPerYearConfig = {
		type: 'bar' as const,
		data: {
			labels: data.perYear.map((r) => r.year),
			datasets: [
				{ label: 'Launches', data: data.perYear.map((r) => r.count), backgroundColor: accent }
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } }
		}
	};

	const perMonthConfig = {
		type: 'line' as const,
		data: {
			labels: data.perMonth.map((r) => r.month),
			datasets: [
				{
					label: 'Launches',
					data: data.perMonth.map((r) => r.count),
					borderColor: accent,
					backgroundColor: accentLight,
					fill: true,
					tension: 0.4,
					pointRadius: 0
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } }
		}
	};

	const rollingConfig = {
		type: 'line' as const,
		data: {
			labels: data.rolling.map((r) => r.monthEnd),
			datasets: [
				{
					label: 'Success rate',
					data: data.rolling.map((r) => Number((r.successRate * 100).toFixed(1))),
					borderColor: accent,
					tension: 0.3,
					pointRadius: 0
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { y: { min: 0, max: 100, ticks: { callback: (v: number) => `${v}%` } } }
		}
	};

	const histogramConfig = {
		type: 'bar' as const,
		data: {
			labels: data.histogram.map((r) => `${r.flights}`),
			datasets: [
				{ label: 'Boosters', data: data.histogram.map((r) => r.boosters), backgroundColor: muted }
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { x: { title: { display: true, text: 'Flights' } } }
		}
	};

	function boosterHref(serial: string): ResolvedPathname {
		return (resolve('/boosters') + '/' + serial) as ResolvedPathname;
	}
</script>

<svelte:head><title>Stats · {m.site_title()}</title></svelte:head>

<header class="page-header">
	<h1>Stats</h1>
	<p class="subtitle">Fleet-wide aggregates and trends.</p>
</header>

<section class="glance-grid">
	<div class="tile">
		<div class="label">Total boosters</div>
		<div class="value">{formatNumber(data.glance.totalBoosters)}</div>
	</div>
	<div class="tile">
		<div class="label">Active</div>
		<div class="value">{formatNumber(data.glance.activeBoosters)}</div>
	</div>
	<div class="tile">
		<div class="label">Total launches</div>
		<div class="value">{formatNumber(data.glance.totalLaunches)}</div>
	</div>
	<div class="tile">
		<div class="label">Landing success rate</div>
		<div class="value">{(data.glance.landingSuccessRate * 100).toFixed(1)}%</div>
	</div>
</section>

<section class="charts-grid">
	<ChartCard title="Launches per year" config={launchesPerYearConfig} />
	<ChartCard title="Launches per month (last 24)" config={perMonthConfig} />
	<ChartCard title="Rolling 12-month landing success rate" config={rollingConfig} />
	<ChartCard title="Booster flight-count distribution" config={histogramConfig} />
</section>

<section class="records">
	<h2>Records</h2>
	<ul>
		{#if data.records.mostFlownBooster}
			<li>
				Most-flown booster:
				<a class="mono" href={boosterHref(data.records.mostFlownBooster.serial)}
					>{data.records.mostFlownBooster.serial}</a
				>
				— {data.records.mostFlownBooster.flights} flights
			</li>
		{/if}
		{#if data.records.mostUsedLaunchpad}
			<li>
				Most-used launchpad: {data.records.mostUsedLaunchpad.name} — {data.records.mostUsedLaunchpad
					.total} launches
			</li>
		{/if}
		{#if data.records.mostUsedDroneship}
			<li>
				Most-used droneship: {data.records.mostUsedDroneship.name} — {data.records.mostUsedDroneship
					.successes} successful landings
			</li>
		{/if}
	</ul>
</section>

<style>
	.page-header {
		padding-block-end: var(--space-3);
	}
	.subtitle {
		color: var(--text-muted);
		margin-block-start: 0.25rem;
	}
	.glance-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
		margin-block: var(--space-4);
	}
	.charts-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}
	.tile {
		background: var(--surface-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}
	.label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}
	.value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-block-start: 0.25rem;
	}
	.records {
		padding-block-start: var(--space-5);
	}
	.mono {
		font-family: var(--font-mono);
		color: var(--accent);
	}
	@media (width <= 640px) {
		.glance-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
```

### Step 4: Add Stats nav link in `+layout.svelte`

```svelte
<a href={resolve('/stats')} class="nav-link" class:active={page.url.pathname.startsWith('/stats')}
	>Stats</a
>
```

### Step 5: Smoke

```bash
npm run dev -- --port 5173 &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/stats
pkill -f 'vite dev'
```

Expect 200.

### Step 6: Commit

```bash
git add package.json package-lock.json src/lib/components/ChartCard.svelte src/routes/stats/ src/routes/+layout.svelte
git commit -m "Add stats dashboard with Chart.js charts"
```

---

## Task 14: `/healthz` endpoint

**File:** `src/routes/healthz/+server.ts`

```ts
import type { RequestHandler } from './$types';
import { getRawSqlite } from '$lib/server/db/client';

export const GET: RequestHandler = async () => {
	try {
		const sqlite = getRawSqlite();
		const result = sqlite.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
		if (result?.ok === 1) {
			return new Response(JSON.stringify({ status: 'ok' }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		}
		return new Response(JSON.stringify({ status: 'degraded' }), {
			status: 503,
			headers: { 'content-type': 'application/json' }
		});
	} catch (err) {
		return new Response(
			JSON.stringify({ status: 'error', message: err instanceof Error ? err.message : 'unknown' }),
			{ status: 503, headers: { 'content-type': 'application/json' } }
		);
	}
};
```

Smoke:

```bash
curl -i http://localhost:5173/healthz
```

Expect 200 with `{"status":"ok"}`.

Commit:

```bash
git add src/routes/healthz/
git commit -m "Add /healthz endpoint"
```

---

## Task 15: Admin auth + `/admin/status` page

**Files:**

- Create: `src/lib/server/admin/auth.ts`
- Create: `tests/unit/admin-auth.test.ts`
- Create: `src/routes/admin/status/+page.server.ts`
- Create: `src/routes/admin/status/+page.svelte`
- Create: `src/routes/api/admin/sync/+server.ts`

### Step 1: Auth helper — `src/lib/server/admin/auth.ts`

```ts
import { env } from '$env/dynamic/private';

export function constantTimeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function checkAdminToken(provided: string | null | undefined): boolean {
	const expected = env.ADMIN_TOKEN ?? '';
	if (!expected) return false;
	if (!provided) return false;
	return constantTimeEquals(provided, expected);
}
```

### Step 2: Tests — `tests/unit/admin-auth.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ADMIN_TOKEN: 'topsecret' } }));

import { constantTimeEquals, checkAdminToken } from '../../src/lib/server/admin/auth';

describe('constantTimeEquals', () => {
	it('returns true for equal strings', () => expect(constantTimeEquals('abc', 'abc')).toBe(true));
	it('returns false for different lengths', () =>
		expect(constantTimeEquals('abc', 'abcd')).toBe(false));
	it('returns false for different content', () =>
		expect(constantTimeEquals('abc', 'abd')).toBe(false));
});

describe('checkAdminToken', () => {
	it('accepts the configured token', () => expect(checkAdminToken('topsecret')).toBe(true));
	it('rejects null', () => expect(checkAdminToken(null)).toBe(false));
	it('rejects empty', () => expect(checkAdminToken('')).toBe(false));
	it('rejects wrong token', () => expect(checkAdminToken('nope')).toBe(false));
});
```

### Step 3: Admin status load — `src/routes/admin/status/+page.server.ts`

```ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { syncState, booster, launch, launchpad } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { checkAdminToken } from '$lib/server/admin/auth';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!checkAdminToken(token)) throw error(401, 'Invalid or missing token');

	const db = getDb();
	const [states, [boosters], [launches], [pads]] = await Promise.all([
		db.select().from(syncState),
		db.select({ c: sql<number>`count(*)` }).from(booster),
		db.select({ c: sql<number>`count(*)` }).from(launch),
		db.select({ c: sql<number>`count(*)` }).from(launchpad)
	]);

	return {
		token,
		states,
		counts: {
			boosters: boosters?.c ?? 0,
			launches: launches?.c ?? 0,
			launchpads: pads?.c ?? 0
		}
	};
};
```

### Step 4: Admin status page — `src/routes/admin/status/+page.svelte`

Simple table showing per-resource last-full / last-incremental / status / errorMessage. Three count tiles. A button that POSTs to `/api/admin/sync?token=<token>` and shows a transient success message.

### Step 5: Admin sync endpoint — `src/routes/api/admin/sync/+server.ts`

```ts
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { checkAdminToken } from '$lib/server/admin/auth';
import { getDb } from '$lib/server/db/client';
import { Ll2Client } from '$lib/server/ll2/client';
import { TokenBucket } from '$lib/server/ll2/ratelimit';
import { incrementalSync } from '$lib/server/sync/orchestrator';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!checkAdminToken(token)) throw error(401);
	const baseUrl = env.LL2_BASE_URL ?? 'https://lldev.thespacedevs.com/2.2.0';
	const apiToken = env.LL2_API_TOKEN || undefined;
	const bucket = new TokenBucket({ capacity: 15, refillPerHour: apiToken ? 200 : 15 });
	const client = new Ll2Client({ baseUrl, apiToken, bucket });
	const db = getDb();
	void incrementalSync(db, client).catch((err) => console.error('manual sync failed:', err));
	return json({ status: 'started' });
};
```

### Step 6: Verify

```bash
ADMIN_TOKEN=test123 npm run dev -- --port 5173 &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/admin/status                                # 401
curl -s -o /dev/null -w "%{http_code}\n" 'http://localhost:5173/admin/status?token=test123'                # 200
curl -X POST -s -w "%{http_code}\n" -o /dev/null 'http://localhost:5173/api/admin/sync?token=wrong'        # 401
curl -X POST -s -w "%{http_code}\n" -o /dev/null 'http://localhost:5173/api/admin/sync?token=test123'      # 200
pkill -f 'vite dev'
```

### Step 7: Commit

```bash
git add src/lib/server/admin/ src/routes/admin/ src/routes/api/admin/ tests/unit/admin-auth.test.ts
git commit -m "Add /admin/status (token-gated) and manual sync endpoint"
```

---

## Task 16: GitHub Actions — release workflow (build + push to GHCR)

**File:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/booster-tracker
          tags: |
            type=ref,event=branch
            type=ref,event=tag
            type=sha,prefix=git-,format=short
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Verify YAML:

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo OK
```

Commit:

```bash
git add .github/workflows/release.yml
git commit -m "Add release workflow: build + push Docker image to GHCR"
```

---

## Task 17: GitHub Actions — DB-snapshot workflow

**File:** `.github/workflows/db-snapshot.yml`

```yaml
name: DB Snapshot

on:
  schedule:
    - cron: '0 5 * * 0'
  workflow_dispatch:

jobs:
  seed-and-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install
        run: npm ci

      - name: Generate Paraglide messages
        run: npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide

      - name: Seed
        env:
          LL2_BASE_URL: https://lldev.thespacedevs.com/2.2.0
          DATABASE_PATH: ./data.db
        run: npm run seed

      - name: Compute date tag
        id: date
        run: echo "tag=snapshot-$(date -u +%Y-%m-%d)" >> "$GITHUB_OUTPUT"

      - name: Create release with seeded DB attached
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.date.outputs.tag }}
          name: 'Seeded DB ${{ steps.date.outputs.tag }}'
          body: |
            Pre-seeded SQLite database for self-hosters who want to skip the
            multi-hour initial seed. Pulled from LL2 dev mirror on
            ${{ steps.date.outputs.tag }}.

            Usage: download `data.db` and place at `./data/data.db` before
            starting the container.
          files: data.db
```

Verify YAML; commit:

```bash
git add .github/workflows/db-snapshot.yml
git commit -m "Add weekly DB snapshot workflow"
```

---

## Task 18: docker-compose update + README finalize

**Files:**

- Modify: `docker-compose.yml`
- Modify: `README.md`

### docker-compose

Replace contents (drop the `build:` block since self-hosters pull from GHCR):

```yaml
services:
  app:
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

### README — append to existing self-hosting section

Add a "Skip the initial seed" sub-section:

````markdown
### Skip the initial seed (recommended)

A pre-seeded SQLite database is published weekly to GitHub Releases.
Download the latest snapshot before starting the container:

```bash
mkdir -p data
curl -L "https://github.com/ajthom90/booster-tracker/releases/latest/download/data.db" -o data/data.db
docker compose up -d
```
````

````

(Render the inner triple-backticks with proper escaping when writing the file.)

### Commit

```bash
git add docker-compose.yml README.md
git commit -m "Pull docker-compose image from GHCR; document seeded DB snapshots"
````

---

## Phase 2 acceptance checklist

- [ ] `/launches`, `/droneships`, `/launchpads` all render with real data, full filter/sort/columns/aggregates/export round-trip
- [ ] `/launches/<slug>`, `/launchpads/<slug>`, `/locations/<slug>` all render valid detail pages
- [ ] `/stats` shows fleet glance + 4 charts + records section
- [ ] `/healthz` returns 200 with JSON body when DB is healthy
- [ ] `/admin/status?token=...` returns sync state when token correct, 401 otherwise
- [ ] `npm test` shows ~52 passing tests; `npm run check` 0 errors; `npm run lint` clean
- [ ] `npm run test:e2e` 5/5 (no e2e changes for Phase 2 scope)
- [ ] `release.yml` and `db-snapshot.yml` parse as valid YAML
- [ ] Docker image continues to build via `docker build -t booster-tracker:dev -f docker/Dockerfile .`

## Notes for Phase 3

- Add 6 locales (es/fr/de/ar/he/zh-Hans), with machine-translated initial pass + "needs review" banner
- RTL support (logical-property sweep, language-switcher component, `<html dir>` per request)
- Stylelint hardening (ban physical CSS globally)
- Inlang Fink + Crowdin GitHub Action sync
- `i18n-validate.yml` (block PRs with missing translation keys)
- `/translate` page with completion progress
- Sweep the inline English strings on detail pages (Tasks 8-10 + 13) through Paraglide
