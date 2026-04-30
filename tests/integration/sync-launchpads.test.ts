import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeTestDb } from './_db';
import { syncLaunchpads } from '../../src/lib/server/sync/launchpads';
import { launchpad } from '../../src/lib/server/db/schema';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';

describe('syncLaunchpads', () => {
	it('upserts launchpads from a paginated LL2 response', async () => {
		const { db } = makeTestDb();
		const fixture = JSON.parse(readFileSync('tests/fixtures/ll2/pads.page1.json', 'utf-8'));

		const fetchMock = async () =>
			new Response(JSON.stringify(fixture), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});

		const client = new Ll2Client({
			baseUrl: 'https://example/2.2.0',
			fetch: fetchMock as any,
			bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
		});

		await syncLaunchpads(db, client);

		const rows = await db.select().from(launchpad);
		expect(rows).toHaveLength(2);
		const slc40 = rows.find((r) => r.id === 80)!;
		expect(slc40.name).toBe('Space Launch Complex 40');
		expect(slc40.location).toBe('Cape Canaveral, FL, USA');
		expect(slc40.totalLaunches).toBe(200);
		expect(slc40.slug).toBe('space-launch-complex-40-80');
	});
});
