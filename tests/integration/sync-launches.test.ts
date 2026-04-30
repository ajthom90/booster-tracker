import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeTestDb } from './_db';
import { syncLaunches } from '../../src/lib/server/sync/launches';
import { syncBoosters } from '../../src/lib/server/sync/boosters';
import { syncLaunchpads } from '../../src/lib/server/sync/launchpads';
import { launch, launchBooster, landingLocation, booster } from '../../src/lib/server/db/schema';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';
import { eq } from 'drizzle-orm';

function fixtureClient(filename: string) {
	const fixture = JSON.parse(readFileSync(`tests/fixtures/ll2/${filename}`, 'utf-8'));
	const fetchMock = async () =>
		new Response(JSON.stringify(fixture), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	return new Ll2Client({
		baseUrl: 'https://example/2.2.0',
		fetch: fetchMock as any,
		bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
	});
}

describe('syncLaunches', () => {
	it('handles Falcon 9 (1 booster) and Falcon Heavy (3 boosters) correctly', async () => {
		const { db } = makeTestDb();

		// Pre-populate launchpads + boosters (FK requirements).
		await syncLaunchpads(db, fixtureClient('pads.page1.json'));
		await syncBoosters(db, fixtureClient('launchers.page1.json'));

		// Manually insert the Heavy boosters that aren't in the launcher fixture.
		await db
			.insert(booster)
			.values([
				{
					id: 200,
					serialNumber: 'B1070',
					status: 'expended',
					flights: 1,
					successfulLandings: 0,
					attemptedLandings: 0
				},
				{
					id: 201,
					serialNumber: 'B1064',
					status: 'active',
					flights: 5,
					successfulLandings: 5,
					attemptedLandings: 5
				},
				{
					id: 202,
					serialNumber: 'B1065',
					status: 'active',
					flights: 5,
					successfulLandings: 5,
					attemptedLandings: 5
				}
			])
			.onConflictDoNothing();

		await syncLaunches(db, fixtureClient('launches.page1.json'));

		const launches = await db.select().from(launch);
		expect(launches).toHaveLength(2);

		// Falcon 9 launch
		const f9 = launches.find((l) => l.id === 'abc-001')!;
		expect(f9.missionType).toBe('Communications');
		expect(f9.orbit).toBe('Low Earth Orbit');
		expect(f9.webcastUrl).toBe('https://youtube.com/watch?v=abc');
		expect(f9.launchpadId).toBe(80);

		const f9Boosters = await db
			.select()
			.from(launchBooster)
			.where(eq(launchBooster.launchId, 'abc-001'));
		expect(f9Boosters).toHaveLength(1);
		expect(f9Boosters[0].boosterId).toBe(101);
		expect(f9Boosters[0].landingSuccess).toBe(true);

		// Falcon Heavy launch — 3 booster rows
		const fhBoosters = await db
			.select()
			.from(launchBooster)
			.where(eq(launchBooster.launchId, 'abc-002'));
		expect(fhBoosters).toHaveLength(3);
		const roles = fhBoosters.map((b) => b.role).sort();
		expect(roles).toEqual(['core', 'side', 'side']);

		// Landing locations were upserted from nested data
		const locs = await db.select().from(landingLocation);
		const locNames = locs.map((l) => l.name).sort();
		expect(locNames).toEqual(['Landing Zone 1', 'Landing Zone 2', 'Of Course I Still Love You']);
	});
});
