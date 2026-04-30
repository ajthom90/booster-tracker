import { desc, sql } from 'drizzle-orm';
import type { AppDb } from '../db/types';
import { booster } from '../db/schema';
import type { EntityConfig } from '../entity-query/types';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';

export const boosterEntityConfig: EntityConfig<typeof booster> = {
	table: booster,
	columnMap: {
		serial_number: booster.serialNumber,
		status: booster.status,
		flights: booster.flights,
		successful_landings: booster.successfulLandings,
		attempted_landings: booster.attemptedLandings,
		first_launch_date: booster.firstLaunchDate,
		last_launch_date: booster.lastLaunchDate,
		days_since_last_flight: {
			kind: 'computed',
			toSql: (clause) => {
				if (typeof clause.value !== 'number') return null;
				const expr = sql`CAST(julianday('now') - julianday(${booster.lastLaunchDate}) AS INTEGER)`;
				switch (clause.op) {
					case 'eq':
						return sql`${expr} = ${clause.value}`;
					case 'gt':
						return sql`${expr} > ${clause.value}`;
					case 'gte':
						return sql`${expr} >= ${clause.value}`;
					case 'lt':
						return sql`${expr} < ${clause.value}`;
					case 'lte':
						return sql`${expr} <= ${clause.value}`;
					default:
						return null;
				}
			},
			orderBy: sql`CAST(julianday('now') - julianday(${booster.lastLaunchDate}) AS INTEGER) DESC`
		}
	},
	defaultSort: [desc(booster.lastLaunchDate)]
};

export async function runBoostersQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, boosterEntityConfig, args);
}

export type { RunQueryArgs };
