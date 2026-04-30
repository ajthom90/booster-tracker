import type { PageServerLoad } from './$types';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { LOCATION_COLUMNS, LOCATION_DEFAULT_VISIBLE } from '$lib/server/locations/columns';
import { validateFilters } from '$lib/server/boosters/filters';
import { runLocationsQuery } from '$lib/server/locations/query';
import { computeLocationAggregates } from '$lib/server/locations/aggregates';
import { getDb } from '$lib/server/db/client';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const v = url.searchParams.get('v');
	const decoded = decodeViewState(v) ?? EMPTY_VIEW_STATE;
	const { valid: filters, rejected } = validateFilters(LOCATION_COLUMNS, decoded.filters);
	const sort = decoded.sort;
	const page = Math.max(0, decoded.page);
	const visibleCols =
		decoded.visibleCols.length > 0 ? decoded.visibleCols : LOCATION_DEFAULT_VISIBLE;

	const db = getDb();
	const [{ rows, total }, aggregates] = await Promise.all([
		runLocationsQuery(db, { filters, sort, page, pageSize: PAGE_SIZE }),
		computeLocationAggregates(db, filters)
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
		columns: LOCATION_COLUMNS,
		rejected
	};
};
