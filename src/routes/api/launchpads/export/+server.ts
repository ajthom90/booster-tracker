import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { runLaunchpadsQuery } from '$lib/server/launchpads/query';
import { validateFilters } from '$lib/server/boosters/filters';
import { LAUNCHPAD_COLUMNS, LAUNCHPAD_DEFAULT_VISIBLE } from '$lib/server/launchpads/columns';
import { launchpadsToCsv, launchpadsToJson } from '$lib/server/launchpads/export';
import { getDb } from '$lib/server/db/client';

export const GET: RequestHandler = async ({ url }) => {
	const format = url.searchParams.get('format') ?? 'csv';
	if (format !== 'csv' && format !== 'json') throw error(400, 'format must be csv or json');

	const decoded = decodeViewState(url.searchParams.get('v')) ?? EMPTY_VIEW_STATE;
	const { valid: filters } = validateFilters(LAUNCHPAD_COLUMNS, decoded.filters);
	const visibleCols =
		decoded.visibleCols.length > 0 ? decoded.visibleCols : LAUNCHPAD_DEFAULT_VISIBLE;

	const db = getDb();
	const { rows } = await runLaunchpadsQuery(db, {
		filters,
		sort: decoded.sort,
		page: 0,
		pageSize: 10_000
	});

	const stamp = new Date().toISOString().slice(0, 10);
	const filename = `launchpads-${stamp}.${format}`;
	const body =
		format === 'csv' ? launchpadsToCsv(rows, visibleCols) : launchpadsToJson(rows, visibleCols);

	return new Response(body, {
		headers: {
			'content-type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json',
			'content-disposition': `attachment; filename="${filename}"`
		}
	});
};
