import type { AppDb } from '../db/types';
import type { FilterClause } from '../../url-state';
import { runLaunchesQuery } from './query';

export type LaunchAggregates = {
	count: number;
	successCount: number;
	failureCount: number;
	upcomingCount: number;
	successRate: number;
};

export async function computeLaunchAggregates(
	db: AppDb,
	filters: FilterClause[]
): Promise<LaunchAggregates> {
	const { rows, total } = await runLaunchesQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0)
		return { count: 0, successCount: 0, failureCount: 0, upcomingCount: 0, successRate: 0 };

	let success = 0;
	let failure = 0;
	let upcoming = 0;
	for (const row of rows) {
		const status = row.status;
		if (status === 'success') success += 1;
		else if (status === 'failure' || status === 'partial_failure') failure += 1;
		else if (status === 'upcoming') upcoming += 1;
	}
	const decided = success + failure;
	return {
		count: total,
		successCount: success,
		failureCount: failure,
		upcomingCount: upcoming,
		successRate: decided === 0 ? 0 : success / decided
	};
}
