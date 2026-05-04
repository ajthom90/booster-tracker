import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/client';
import {
	fleetAtAGlance,
	fleetRecords,
	launchesPerYear,
	launchesPerMonth24,
	rollingLandingSuccessRate,
	flightCountHistogram
} from '$lib/server/stats/queries';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });
	const db = getDb();
	const [glance, records, perYear, perMonth, rolling, histogram] = await Promise.all([
		fleetAtAGlance(db),
		fleetRecords(db),
		launchesPerYear(db),
		launchesPerMonth24(db),
		rollingLandingSuccessRate(db),
		flightCountHistogram(db)
	]);
	return { glance, records, perYear, perMonth, rolling, histogram };
};
