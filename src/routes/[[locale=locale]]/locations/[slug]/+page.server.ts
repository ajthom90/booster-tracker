import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { landingLocation, launchBooster, launch, booster } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const matches = await db
		.select()
		.from(landingLocation)
		.where(eq(landingLocation.slug, params.slug));
	if (matches.length === 0) throw error(404, 'Location not found');
	const loc = matches[0];

	const attempts = await db
		.select({
			launchId: launch.id,
			launchSlug: launch.slug,
			launchName: launch.name,
			launchStatus: launch.status,
			launchDate: launch.net,
			boosterId: booster.id,
			boosterSerial: booster.serialNumber,
			role: launchBooster.role,
			landingAttempted: launchBooster.landingAttempted,
			landingSuccess: launchBooster.landingSuccess
		})
		.from(launchBooster)
		.innerJoin(launch, eq(launch.id, launchBooster.launchId))
		.innerJoin(booster, eq(booster.id, launchBooster.boosterId))
		.where(eq(launchBooster.landingLocationId, loc.id))
		.orderBy(desc(launch.net));

	return { location: loc, attempts };
};
