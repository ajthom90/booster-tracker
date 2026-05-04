import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { syncState, booster, launch, launchpad, landingLocation } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { checkAdminToken } from '$lib/server/admin/auth';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!checkAdminToken(token)) throw error(401, 'Invalid or missing token');

	const db = getDb();
	const [states, [boosters], [launches], [pads], [locations]] = await Promise.all([
		db.select().from(syncState),
		db.select({ c: sql<number>`count(*)` }).from(booster),
		db.select({ c: sql<number>`count(*)` }).from(launch),
		db.select({ c: sql<number>`count(*)` }).from(launchpad),
		db.select({ c: sql<number>`count(*)` }).from(landingLocation)
	]);

	return {
		token: token ?? '',
		states,
		counts: {
			boosters: boosters?.c ?? 0,
			launches: launches?.c ?? 0,
			launchpads: pads?.c ?? 0,
			landingLocations: locations?.c ?? 0
		}
	};
};
