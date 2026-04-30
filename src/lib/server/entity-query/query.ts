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

type ComputedRef = Extract<EntityColumnRef, { kind: 'computed' }>;

function isComputed(ref: EntityColumnRef): ref is ComputedRef {
	return (
		typeof ref === 'object' &&
		ref !== null &&
		'kind' in ref &&
		(ref as { kind?: unknown }).kind === 'computed'
	);
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
): Promise<{ rows: Array<T['$inferSelect']>; total: number }> {
	const where = args.filters
		.map((c) => clauseToSql(c, config.columnMap))
		.filter((s): s is SQL => s !== null);

	const whereExpr = where.length === 0 ? undefined : and(...where);

	const totalRows = (await db
		.select({ c: sql<number>`count(*)` })
		.from(config.table as never)
		.where(whereExpr as never)) as Array<{ c: number }>;
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

	return { rows: rows as Array<T['$inferSelect']>, total };
}
