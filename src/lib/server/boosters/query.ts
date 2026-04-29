import { and, asc, desc, eq, gt, gte, inArray, like, lt, lte, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { booster } from '../db/schema';
import type { FilterClause, SortClause } from '../../url-state';

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
	const col = (COLUMN_MAP as Record<string, unknown>)[clause.id] as
		| (typeof COLUMN_MAP)[keyof typeof COLUMN_MAP]
		| undefined;
	if (!col) {
		if (clause.id === 'days_since_last_flight') {
			// Computed column: integer days since last_launch_date.
			const expr = sql<number>`CAST(julianday('now') - julianday(${booster.lastLaunchDate}) AS INTEGER)`;
			return numericClause(expr, clause);
		}
		return null;
	}
	switch (clause.op) {
		case 'eq':
			return eq(col as never, clause.value as never);
		case 'neq':
			return sql`${col} != ${clause.value}`;
		case 'gt':
			return gt(col as never, clause.value as never);
		case 'gte':
			return gte(col as never, clause.value as never);
		case 'lt':
			return lt(col as never, clause.value as never);
		case 'lte':
			return lte(col as never, clause.value as never);
		case 'in':
			if (!Array.isArray(clause.value) || clause.value.length === 0) return null;
			return inArray(col as never, clause.value as never[]);
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

export async function runBoostersQuery(
	db: BetterSQLite3Database<Record<string, unknown>>,
	args: RunQueryArgs
) {
	const where = args.filters.map(clauseToSql).filter((s): s is SQL => s !== null);

	const whereExpr = where.length === 0 ? undefined : and(...where);

	// Total count for pagination + aggregate bar
	const totalRows = await db
		.select({ c: sql<number>`count(*)` })
		.from(booster)
		.where(whereExpr);
	const total = totalRows[0]?.c ?? 0;

	// Sort. Default to last_launch_date desc when no sort given.
	const orderBy =
		args.sort.length === 0
			? [desc(booster.lastLaunchDate)]
			: args.sort.map((s) => {
					const col = (COLUMN_MAP as Record<string, unknown>)[s.id] as
						| (typeof COLUMN_MAP)[keyof typeof COLUMN_MAP]
						| undefined;
					if (!col) return desc(booster.lastLaunchDate); // fallback
					return s.desc ? desc(col) : asc(col);
				});

	const rows = await db
		.select()
		.from(booster)
		.where(whereExpr)
		.orderBy(...orderBy)
		.limit(args.pageSize)
		.offset(args.page * args.pageSize);

	return { rows, total };
}
