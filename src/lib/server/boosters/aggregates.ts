import type { AppDb } from '../db/types';
import type { FilterClause } from '../../url-state';
import { runBoostersQuery } from './query';

export type BoosterAggregates = {
	count: number;
	totalFlights: number;
	avgFlights: number;
	totalLandings: number;
	attemptedLandings: number;
	successRate: number;
};

export async function computeBoosterAggregates(
	db: AppDb,
	filters: FilterClause[]
): Promise<BoosterAggregates> {
	// Pull the filtered set lightly. For Phase 1 the booster table is small
	// enough (~50-200 rows) to load + reduce in-process; if it grows large
	// we can replace this with a SUM/AVG SQL query that reuses the WHERE.
	const { rows, total } = await runBoostersQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0)
		return {
			count: 0,
			totalFlights: 0,
			avgFlights: 0,
			totalLandings: 0,
			attemptedLandings: 0,
			successRate: 0
		};

	let totalFlights = 0,
		totalLandings = 0,
		attempted = 0;
	for (const b of rows) {
		totalFlights += b.flights ?? 0;
		totalLandings += b.successfulLandings ?? 0;
		attempted += b.attemptedLandings ?? 0;
	}
	return {
		count: total,
		totalFlights,
		avgFlights: totalFlights / total,
		totalLandings,
		attemptedLandings: attempted,
		successRate: attempted === 0 ? 0 : totalLandings / attempted
	};
}
