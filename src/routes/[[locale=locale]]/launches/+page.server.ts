import type { PageServerLoad } from './$types';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { LAUNCH_COLUMNS, LAUNCH_DEFAULT_VISIBLE } from '$lib/server/launches/columns';
import { validateFilters } from '$lib/server/boosters/filters';
import { runLaunchesQuery } from '$lib/server/launches/query';
import { computeLaunchAggregates } from '$lib/server/launches/aggregates';
import { getDb } from '$lib/server/db/client';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const v = url.searchParams.get('v');
	const decoded = decodeViewState(v) ?? EMPTY_VIEW_STATE;
	const { valid: filters, rejected } = validateFilters(LAUNCH_COLUMNS, decoded.filters);
	const sort = decoded.sort;
	const page = Math.max(0, decoded.page);
	const visibleCols = decoded.visibleCols.length > 0 ? decoded.visibleCols : LAUNCH_DEFAULT_VISIBLE;

	const db = getDb();
	const [{ rows, total }, aggregates] = await Promise.all([
		runLaunchesQuery(db, { filters, sort, page, pageSize: PAGE_SIZE }),
		computeLaunchAggregates(db, filters)
	]);

	return {
		rows,
		total,
		page,
		pageSize: PAGE_SIZE,
		aggregates,
		filters,
		sort,
		visibleCols,
		columns: LAUNCH_COLUMNS,
		rejected
	};
};
