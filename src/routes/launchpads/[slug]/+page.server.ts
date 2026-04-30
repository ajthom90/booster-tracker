import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { launchpad, launch } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const db = getDb();
	const matches = await db.select().from(launchpad).where(eq(launchpad.slug, params.slug));
	if (matches.length === 0) throw error(404, 'Launchpad not found');
	const pad = matches[0];

	// Fetch the most recent launches at this pad (top 50).
	const launches = await db
		.select({
			id: launch.id,
			slug: launch.slug,
			name: launch.name,
			status: launch.status,
			net: launch.net
		})
		.from(launch)
		.where(eq(launch.launchpadId, pad.id))
		.orderBy(desc(launch.net))
		.limit(50);

	// Counts (total + successes only — we'll compute the rate in the page).
	const counts = await db
		.select({
			total: sql<number>`count(*)`,
			successes: sql<number>`sum(CASE WHEN ${launch.status} = 'success' THEN 1 ELSE 0 END)`
		})
		.from(launch)
		.where(eq(launch.launchpadId, pad.id));

	return { pad, launches, counts: counts[0] ?? { total: 0, successes: 0 } };
};
