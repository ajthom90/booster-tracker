import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { landingLocation } from '../../src/lib/server/db/schema';
import { runLocationsQuery } from '../../src/lib/server/locations/query';

async function seed(db: ReturnType<typeof makeTestDb>['db']) {
	await db.insert(landingLocation).values([
		{
			id: 1,
			name: 'Of Course I Still Love You',
			abbrev: 'OCISLY',
			locationType: 'ASDS',
			successfulLandings: 50,
			attemptedLandings: 52,
			slug: 'ocisly-1'
		},
		{
			id: 2,
			name: 'Landing Zone 1',
			abbrev: 'LZ-1',
			locationType: 'RTLS',
			successfulLandings: 25,
			attemptedLandings: 25,
			slug: 'lz-1-2'
		},
		{
			id: 3,
			name: 'Landing Zone 2',
			abbrev: 'LZ-2',
			locationType: 'RTLS',
			successfulLandings: 12,
			attemptedLandings: 12,
			slug: 'lz-2-3'
		}
	]);
}

describe('runLocationsQuery', () => {
	it('returns all locations sorted by successful_landings desc by default', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLocationsQuery(db, { filters: [], sort: [], page: 0, pageSize: 50 });
		expect(r.total).toBe(3);
		expect(r.rows[0].abbrev).toBe('OCISLY');
	});

	it('filters by location_type RTLS', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLocationsQuery(db, {
			filters: [{ id: 'location_type', op: 'in', value: ['RTLS'] }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
	});

	it('filters by attempted_landings gte 25', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runLocationsQuery(db, {
			filters: [{ id: 'attempted_landings', op: 'gte', value: 25 }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
	});
});
