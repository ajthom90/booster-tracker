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
