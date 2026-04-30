import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { booster } from '../../src/lib/server/db/schema';
import { computeBoosterAggregates } from '../../src/lib/server/boosters/aggregates';

describe('computeBoosterAggregates', () => {
	it('returns aggregates over filtered set', async () => {
		const { db } = makeTestDb();
		await db.insert(booster).values([
			{
				id: 1,
				serialNumber: 'B1',
				status: 'active',
				flights: 10,
				successfulLandings: 10,
				attemptedLandings: 10
			},
			{
				id: 2,
				serialNumber: 'B2',
				status: 'active',
				flights: 20,
				successfulLandings: 19,
				attemptedLandings: 20
			},
			{
				id: 3,
				serialNumber: 'B3',
				status: 'lost',
				flights: 5,
				successfulLandings: 4,
				attemptedLandings: 5
			}
		]);
		const agg = await computeBoosterAggregates(db, [{ id: 'status', op: 'in', value: ['active'] }]);
		expect(agg.count).toBe(2);
		expect(agg.totalFlights).toBe(30);
		expect(agg.avgFlights).toBeCloseTo(15);
		expect(agg.totalLandings).toBe(29);
		expect(agg.successRate).toBeCloseTo(29 / 30); // 29 successful of 30 attempted
	});

	it('returns zeros when no rows match', async () => {
		const { db } = makeTestDb();
		const agg = await computeBoosterAggregates(db, []);
		expect(agg.count).toBe(0);
		expect(agg.totalFlights).toBe(0);
		expect(agg.avgFlights).toBe(0);
		expect(agg.successRate).toBe(0);
	});
});
