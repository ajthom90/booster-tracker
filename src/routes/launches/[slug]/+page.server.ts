import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import {
	launch,
	launchBooster,
	booster,
	launcherConfig,
	launchpad,
	landingLocation
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const slug = params.slug;

	const matches = await db.select().from(launch).where(eq(launch.slug, slug));
	if (matches.length === 0) throw error(404, 'Launch not found');
	const l = matches[0];

	const padRow = l.launchpadId
		? (await db.select().from(launchpad).where(eq(launchpad.id, l.launchpadId)))[0]
		: null;

	// Boosters on this launch (1 for Falcon 9, 3 for Falcon Heavy).
	const stages = await db
		.select({
			boosterId: launchBooster.boosterId,
			role: launchBooster.role,
			flightNumber: launchBooster.flightNumber,
			landingAttempted: launchBooster.landingAttempted,
			landingSuccess: launchBooster.landingSuccess,
			landingType: launchBooster.landingType,
			boosterSerial: booster.serialNumber,
			boosterStatus: booster.status,
			configName: launcherConfig.name,
			locationName: landingLocation.name,
			locationAbbrev: landingLocation.abbrev
		})
		.from(launchBooster)
		.innerJoin(booster, eq(booster.id, launchBooster.boosterId))
		.leftJoin(launcherConfig, eq(launcherConfig.id, booster.launcherConfigId))
		.leftJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.launchId, l.id));

	return { launch: l, pad: padRow, stages };
};
