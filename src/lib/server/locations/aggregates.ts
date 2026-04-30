import type { AppDb } from '../db/types';
import type { FilterClause } from '../../url-state';
import { runLocationsQuery } from './query';

export type LocationAggregates = {
	count: number;
	totalSuccessful: number;
	totalAttempted: number;
	successRate: number;
};

export async function computeLocationAggregates(
	db: AppDb,
	filters: FilterClause[]
): Promise<LocationAggregates> {
	const { rows, total } = await runLocationsQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0) return { count: 0, totalSuccessful: 0, totalAttempted: 0, successRate: 0 };
	let success = 0;
	let attempt = 0;
	for (const row of rows) {
		success += row.successfulLandings ?? 0;
		attempt += row.attemptedLandings ?? 0;
	}
	return {
		count: total,
		totalSuccessful: success,
		totalAttempted: attempt,
		successRate: attempt === 0 ? 0 : success / attempt
	};
}
