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
		expect(r.rows[0].id).toBe('c');
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
