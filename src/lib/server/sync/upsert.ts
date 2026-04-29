import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getTableColumns, sql, type SQL } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Upsert many rows by a single conflict key. Uses sqlite's
 * ON CONFLICT(<key>) DO UPDATE SET <every-other-col> = excluded.<col>.
 *
 * @param db          drizzle better-sqlite3 database instance
 * @param table       drizzle SQLiteTable to upsert into
 * @param rows        array of row objects (TS field names; drizzle maps to SQL columns)
 * @param conflictKey TS field name of the conflict-target column (e.g. 'id', 'slug')
 */
export async function upsertMany<T extends SQLiteTable>(
	db: BetterSQLite3Database<Record<string, unknown>>,
	table: T,
	rows: Array<Record<string, unknown>>,
	conflictKey: keyof T['_']['columns'] & string
): Promise<void> {
	if (rows.length === 0) return;

	const columns = getTableColumns(table);
	const targetColumn = columns[conflictKey];
	if (!targetColumn) {
		throw new Error(`upsertMany: unknown conflict key "${conflictKey}" on table`);
	}

	const setClause: Record<string, SQL> = {};
	for (const [key, col] of Object.entries(columns)) {
		if (key === conflictKey) continue;
		// `excluded` is a sqlite reserved alias for the row that would have been inserted.
		// Use the SQL column name (snake_case) — drizzle's column object exposes `.name`.
		const sqlName = (col as { name: string }).name;
		setClause[key] = sql.raw(`excluded."${sqlName}"`);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (db.insert(table as any).values(rows as any) as any).onConflictDoUpdate({
		target: targetColumn,
		set: setClause
	});
}
