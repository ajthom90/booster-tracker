import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import {
	booster,
	launch,
	launchBooster,
	landingLocation,
	launchpad
} from '../../src/lib/server/db/schema';
import {
	fleetAtAGlance,
	fleetRecords,
	launchesPerYear,
	launchesPerMonth24,
	flightCountHistogram
} from '../../src/lib/server/stats/queries';

async function seed(db: ReturnType<typeof makeTestDb>['db']) {
	await db.insert(launchpad).values([
		{ id: 80, name: 'SLC-40', slug: 'slc-40' },
		{ id: 39, name: 'LC-39A', slug: 'lc-39a' }
	]);
	await db.insert(landingLocation).values([
		{
			id: 1,
			name: 'OCISLY',
			abbrev: 'OCISLY',
			locationType: 'ASDS',
			slug: 'ocisly',
			successfulLandings: 0,
			attemptedLandings: 0
		}
	]);
	await db.insert(booster).values([
		{ id: 100, serialNumber: 'B1058', status: 'lost', flights: 14 },
		{ id: 101, serialNumber: 'B1067', status: 'active', flights: 22 },
		{ id: 102, serialNumber: 'B1077', status: 'active', flights: 5 }
	]);
	await db.insert(launch).values([
		{
			id: 'a',
			slug: 'a',
			name: 'Mission A',
			status: 'success',
			net: '2024-04-15T10:00:00Z',
			launchpadId: 80
		},
		{
			id: 'b',
			slug: 'b',
			name: 'Mission B',
			status: 'success',
			net: '2025-04-15T10:00:00Z',
			launchpadId: 80
		},
		{
			id: 'c',
			slug: 'c',
			name: 'Mission C',
			status: 'failure',
			net: '2025-08-15T10:00:00Z',
			launchpadId: 39
		}
	]);
	await db.insert(launchBooster).values([
		{
			launchId: 'a',
			boosterId: 101,
			role: '',
			landingAttempted: true,
			landingSuccess: true,
			landingLocationId: 1
		},
		{
			launchId: 'b',
			boosterId: 101,
			role: '',
			landingAttempted: true,
			landingSuccess: true,
			landingLocationId: 1
		},
		{
			launchId: 'c',
			boosterId: 100,
			role: '',
			landingAttempted: true,
			landingSuccess: false,
			landingLocationId: 1
		}
	]);
}

describe('stats queries', () => {
	it('fleetAtAGlance returns counts and success rate', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await fleetAtAGlance(db);
		expect(r.totalBoosters).toBe(3);
		expect(r.activeBoosters).toBe(2);
		expect(r.lostBoosters).toBe(1);
		expect(r.totalLaunches).toBe(3);
		expect(r.totalLandingAttempts).toBe(3);
		expect(r.totalLandingSuccesses).toBe(2);
		expect(r.landingSuccessRate).toBeCloseTo(2 / 3);
	});

	it('fleetRecords returns most-flown booster and most-used launchpad', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await fleetRecords(db);
		expect(r.mostFlownBooster?.serial).toBe('B1067');
		expect(r.mostFlownBooster?.flights).toBe(22);
		// SLC-40 has 2 launches, LC-39A has 1
		expect(r.mostUsedLaunchpad?.name).toBe('SLC-40');
		expect(r.mostUsedLaunchpad?.total).toBe(2);
		expect(r.mostUsedDroneship?.name).toBe('OCISLY');
		expect(r.mostUsedDroneship?.successes).toBe(2);
	});

	it('launchesPerYear groups by year', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await launchesPerYear(db);
		expect(r.length).toBe(2);
		const y2024 = r.find((row) => row.year === '2024');
		const y2025 = r.find((row) => row.year === '2025');
		expect(y2024?.count).toBe(1);
		expect(y2025?.count).toBe(2);
	});

	it('launchesPerMonth24 only includes the trailing 24-month window', async () => {
		const { db } = makeTestDb();
		// Insert one launch from 5 years ago — should be excluded
		await db.insert(launchpad).values({ id: 80, name: 'SLC-40', slug: 'slc-40' });
		await db.insert(launch).values([
			{
				id: 'old',
				slug: 'old',
				name: 'Old',
				status: 'success',
				net: '2018-01-01T00:00:00Z',
				launchpadId: 80
			},
			{
				id: 'new',
				slug: 'new',
				name: 'New',
				status: 'success',
				net: new Date().toISOString(),
				launchpadId: 80
			}
		]);
		const r = await launchesPerMonth24(db);
		// 'old' (2018) is outside window; 'new' (today) is inside. Result should be 1 row.
		expect(r.length).toBe(1);
	});

	it('flightCountHistogram groups boosters by flights', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await flightCountHistogram(db);
		// 3 boosters with flights 14, 22, 5 → 3 rows of 1 each
		expect(r.length).toBe(3);
		const total = r.reduce((s, row) => s + row.boosters, 0);
		expect(total).toBe(3);
	});
});
