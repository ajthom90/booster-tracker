import { describe, it, expect } from 'vitest';
import { makeTestDb } from './_db';
import { booster } from '../../src/lib/server/db/schema';
import { runBoostersQuery } from '../../src/lib/server/boosters/query';

async function seed(db: ReturnType<typeof makeTestDb>['db']) {
	await db.insert(booster).values([
		{
			id: 1,
			serialNumber: 'B1058',
			status: 'lost',
			flights: 14,
			successfulLandings: 13,
			attemptedLandings: 14,
			lastLaunchDate: '2022-12-23T12:00:00Z'
		},
		{
			id: 2,
			serialNumber: 'B1067',
			status: 'active',
			flights: 22,
			successfulLandings: 22,
			attemptedLandings: 22,
			lastLaunchDate: '2026-04-15T10:00:00Z'
		},
		{
			id: 3,
			serialNumber: 'B1077',
			status: 'active',
			flights: 5,
			successfulLandings: 5,
			attemptedLandings: 5,
			lastLaunchDate: '2026-03-01T10:00:00Z'
		},
		{
			id: 4,
			serialNumber: 'B1071',
			status: 'retired',
			flights: 10,
			successfulLandings: 9,
			attemptedLandings: 10,
			lastLaunchDate: '2024-06-01T10:00:00Z'
		}
	]);
}

describe('runBoostersQuery', () => {
	it('returns all rows with no filter', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, { filters: [], sort: [], page: 0, pageSize: 50 });
		expect(r.total).toBe(4);
		expect(r.rows).toHaveLength(4);
	});

	it('filters by status enum', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [{ id: 'status', op: 'in', value: ['active'] }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(2);
		expect(r.rows.map((b) => b.serialNumber).sort()).toEqual(['B1067', 'B1077']);
	});

	it('filters by flights >= 10', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [{ id: 'flights', op: 'gte', value: 10 }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.total).toBe(3);
	});

	it('sorts by flights descending', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [],
			sort: [{ id: 'flights', desc: true }],
			page: 0,
			pageSize: 50
		});
		expect(r.rows[0].serialNumber).toBe('B1067');
		expect(r.rows[3].serialNumber).toBe('B1077');
	});

	it('paginates correctly', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [],
			sort: [{ id: 'serial_number', desc: false }],
			page: 1,
			pageSize: 2
		});
		expect(r.total).toBe(4);
		expect(r.rows).toHaveLength(2);
		expect(r.rows[0].serialNumber).toBe('B1071');
	});

	it('supports text contains on serial_number', async () => {
		const { db } = makeTestDb();
		await seed(db);
		const r = await runBoostersQuery(db, {
			filters: [{ id: 'serial_number', op: 'contains', value: '107' }],
			sort: [],
			page: 0,
			pageSize: 50
		});
		expect(r.rows.map((b) => b.serialNumber).sort()).toEqual(['B1071', 'B1077']);
	});
});
