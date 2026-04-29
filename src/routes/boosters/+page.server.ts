import type { PageServerLoad } from './$types';
import { decodeViewState, EMPTY_VIEW_STATE } from '$lib/url-state';
import { BOOSTER_COLUMNS, BOOSTER_DEFAULT_VISIBLE } from '$lib/server/boosters/columns';
import { validateFilters } from '$lib/server/boosters/filters';
import { runBoostersQuery } from '$lib/server/boosters/query';
import { computeBoosterAggregates } from '$lib/server/boosters/aggregates';
import { getDb } from '$lib/server/db/client';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
  const v = url.searchParams.get('v');
  const decoded = decodeViewState(v) ?? EMPTY_VIEW_STATE;

  const { valid: filters, rejected } = validateFilters(BOOSTER_COLUMNS, decoded.filters);
  const sort = decoded.sort;
  const page = Math.max(0, decoded.page);
  const visibleCols = decoded.visibleCols.length > 0 ? decoded.visibleCols : BOOSTER_DEFAULT_VISIBLE;

  const db = getDb();
  const [{ rows, total }, aggregates] = await Promise.all([
    runBoostersQuery(db, { filters, sort, page, pageSize: PAGE_SIZE }),
    computeBoosterAggregates(db, filters)
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
    columns: BOOSTER_COLUMNS,
    rejected
  };
};
