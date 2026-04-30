import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import {
	booster,
	launchBooster,
	launch,
	launchpad,
	landingLocation,
	launcherConfig
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const serial = params.serial;

	const matches = await db.select().from(booster).where(eq(booster.serialNumber, serial));
	if (matches.length === 0) throw error(404, 'Booster not found');
	const b = matches[0];

	const config = b.launcherConfigId
		? (await db.select().from(launcherConfig).where(eq(launcherConfig.id, b.launcherConfigId)))[0]
		: null;

	// Flight history: every launch this booster flew on, ordered by date.
	const history = await db
		.select({
			launchId: launch.id,
			launchSlug: launch.slug,
			launchName: launch.name,
			launchDate: launch.net,
			launchpadName: launchpad.name,
			role: launchBooster.role,
			flightNumber: launchBooster.flightNumber,
			landingAttempted: launchBooster.landingAttempted,
			landingSuccess: launchBooster.landingSuccess,
			landingType: launchBooster.landingType,
			landingLocationName: landingLocation.name,
			landingLocationAbbrev: landingLocation.abbrev
		})
		.from(launchBooster)
		.innerJoin(launch, eq(launch.id, launchBooster.launchId))
		.leftJoin(launchpad, eq(launchpad.id, launch.launchpadId))
		.leftJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.boosterId, b.id))
		.orderBy(launch.net);

	// Compute turnaround between consecutive flights
	const historyWithTurnaround = history.map((h, i) => {
		if (i === 0) return { ...h, turnaroundDays: null as number | null };
		const prevDate = new Date(history[i - 1].launchDate).getTime();
		const thisDate = new Date(h.launchDate).getTime();
		return { ...h, turnaroundDays: Math.floor((thisDate - prevDate) / 86_400_000) };
	});

	// Landing breakdown: count attempts & successes by location
	const landingBreakdown = await db
		.select({
			locationName: landingLocation.name,
			abbrev: landingLocation.abbrev,
			attempts: sql<number>`count(*)`,
			successes: sql<number>`sum(CASE WHEN ${launchBooster.landingSuccess} THEN 1 ELSE 0 END)`
		})
		.from(launchBooster)
		.leftJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.boosterId, b.id))
		.groupBy(landingLocation.id);

	return { booster: b, config, history: historyWithTurnaround, landingBreakdown };
};
