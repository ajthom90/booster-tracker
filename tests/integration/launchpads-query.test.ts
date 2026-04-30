import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { launchpad } from '../../src/lib/server/db/schema';
import { runLaunchpadsQuery } from '../../src/lib/server/launchpads/query';

async function seed(db: ReturnType<typeof makeTestDb>['db']) {
	await db.insert(launchpad).values([
		{
			id: 80,
			name: 'SLC-40',
			fullName: 'Space Launch Complex 40',
			location: 'Cape Canaveral, FL, USA',
			countryCode: 'USA',
			totalLaunches: 200,
			slug: 'slc-40-80'
		},
		{
			id: 39,
			name: 'LC-39A',
			fullName: 'Launch Complex 39A',
			location: 'Kennedy Space Center, FL, USA',
			countryCode: 'USA',
			totalLaunches: 50,
			slug: 'lc-39a-39'
		},
		{
			id: 4,
			name: 'SLC-4E',
			fullName: 'Space Launch Complex 4E',
			location: 'Vandenberg, CA, USA',
			countryCode: 'USA',
			totalLaunches: 100,
			slug: 'slc-4e-4'
		}
	]);
}

describe('runLaunchpadsQuery', () => {
	it('returns all launchpads sorted by total_launches desc by default', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLaunchpadsQuery(db, { filters: [], sort: [], page: 0, pageSize: 50 });
		expect(r.total).toBe(3);
		expect(r.rows[0].name).toBe('SLC-40');
	});

	it('filters by location contains', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLaunchpadsQuery(db, {
			filters: [{ id: 'location', op: 'contains', value: 'Vandenberg' }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(1);
	});

	it('filters by total_launches gte 100', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLaunchpadsQuery(db, {
			filters: [{ id: 'total_launches', op: 'gte', value: 100 }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
	});
});
