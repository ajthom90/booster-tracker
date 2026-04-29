import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestDb } from './_db';
import { upsertMany } from '../../src/lib/server/sync/upsert';
import { launchpad } from '../../src/lib/server/db/schema';

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
