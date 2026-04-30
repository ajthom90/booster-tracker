import type { PageServerLoad } from './$types';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { LAUNCHPAD_COLUMNS, LAUNCHPAD_DEFAULT_VISIBLE } from '$lib/server/launchpads/columns';
import { validateFilters } from '$lib/server/boosters/filters';
import { runLaunchpadsQuery } from '$lib/server/launchpads/query';
import { computeLaunchpadAggregates } from '$lib/server/launchpads/aggregates';
import { getDb } from '$lib/server/db/client';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const v = url.searchParams.get('v');
	const decoded = decodeViewState(v) ?? EMPTY_VIEW_STATE;
	const { valid: filters, rejected } = validateFilters(LAUNCHPAD_COLUMNS, decoded.filters);
	const sort = decoded.sort;
	const page = Math.max(0, decoded.page);
	const visibleCols =
		decoded.visibleCols.length > 0 ? decoded.visibleCols : LAUNCHPAD_DEFAULT_VISIBLE;

	const db = getDb();
	const [{ rows, total }, aggregates] = await Promise.all([
		runLaunchpadsQuery(db, { filters, sort, page, pageSize: PAGE_SIZE }),
		computeLaunchpadAggregates(db, filters)
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
		columns: LAUNCHPAD_COLUMNS,
		rejected
	};
};
