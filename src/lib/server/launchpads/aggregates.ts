import type { AppDb } from '../db/types';
import type { FilterClause } from '../../url-state';
import { runLaunchpadsQuery } from './query';

export type LaunchpadAggregates = {
	count: number;
	totalLaunches: number;
};

export async function computeLaunchpadAggregates(
	db: AppDb,
	filters: FilterClause[]
): Promise<LaunchpadAggregates> {
	const { rows, total } = await runLaunchpadsQuery(db, {
		filters,
		sort: [],
		page: 0,
		pageSize: 10_000
	});
	if (total === 0) return { count: 0, totalLaunches: 0 };
	let totalLaunches = 0;
	for (const row of rows) totalLaunches += row.totalLaunches ?? 0;
	return { count: total, totalLaunches };
}
