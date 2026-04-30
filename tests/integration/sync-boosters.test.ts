import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeTestDb } from './_db';
import { syncBoosters } from '../../src/lib/server/sync/boosters';
import { booster, launcherConfig } from '../../src/lib/server/db/schema';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';
import { eq } from 'drizzle-orm';

describe('syncBoosters', () => {
	it('upserts boosters and their launcher_configs', async () => {
		const { db } = makeTestDb();
		const fixture = JSON.parse(readFileSync('tests/fixtures/ll2/launchers.page1.json', 'utf-8'));

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

		await syncBoosters(db, client);

		const configs = await db.select().from(launcherConfig);
		expect(configs).toHaveLength(1);
		expect(configs[0].name).toBe('Falcon 9 Block 5');

		const rows = await db.select().from(booster);
		expect(rows).toHaveLength(2);
		const b1058 = rows.find((r) => r.serialNumber === 'B1058')!;
		expect(b1058.flights).toBe(14);
		expect(b1058.successfulLandings).toBe(13);
		expect(b1058.launcherConfigId).toBe(1);
	});
});
