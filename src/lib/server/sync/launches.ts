import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { inArray } from 'drizzle-orm';
import type { Ll2Client } from '../ll2/client';
import { ll2LaunchListSchema, type Ll2Launch } from '../ll2/schemas';
import { launch, launchBooster, landingLocation } from '../db/schema';
import { upsertMany } from './upsert';
import { slugify } from './launchpads';
import { getRawSqlite } from '../db/client';

function deriveSlug(l: Ll2Launch): string {
	if (l.slug) return l.slug;
	const base = l.mission?.name ?? l.name;
	return slugify(base) || l.id;
}

function statusToken(name: string): string {
	// Map LL2's display status to our enum tokens.
	const lower = name.toLowerCase();
	if (lower.includes('success')) return 'success';
	if (lower.includes('partial')) return 'partial_failure';
	if (lower.includes('failure')) return 'failure';
	if (lower.includes('go') || lower.includes('tbd')) return 'upcoming';
	if (lower.includes('flight')) return 'in_flight';
	return 'unknown';
}

export async function syncLaunches(
	db: BetterSQLite3Database<Record<string, unknown>>,
	client: Ll2Client
) {
	let url: string | null = '/launch/?lsp__name=SpaceX&limit=50&mode=detailed';
	while (url) {
		const raw = await client.getJson<unknown>(url);
		const parsed = ll2LaunchListSchema.parse(raw);

		// Collect landing locations first so launch_booster FKs are satisfied.
		const locById = new Map<number, Record<string, unknown>>();
		for (const l of parsed.results) {
			for (const stage of l.rocket?.launcher_stage ?? []) {
				const loc = stage.landing?.location;
				if (loc && !locById.has(loc.id)) {
					locById.set(loc.id, {
						id: loc.id,
						name: loc.name,
						abbrev: loc.abbrev ?? null,
						description: loc.description ?? null,
						locationType: stage.landing?.type?.name ?? 'Unknown',
						successfulLandings:
							typeof loc.successful_landings === 'number' ? loc.successful_landings : 0,
						attemptedLandings:
							typeof loc.attempted_landings === 'number' ? loc.attempted_landings : 0,
						slug: `${slugify(loc.abbrev ?? loc.name)}-${loc.id}`
					});
				}
			}
		}
		if (locById.size > 0) {
			await upsertMany(db, landingLocation, [...locById.values()], 'id');
		}

		// Upsert launches.
		const launchRows = parsed.results.map((l) => ({
			id: l.id,
			slug: deriveSlug(l),
			name: l.name,
			status: statusToken(l.status.name),
			net: l.net,
			windowStart: l.window_start ?? null,
			windowEnd: l.window_end ?? null,
			missionName: l.mission?.name ?? null,
			missionDescription: l.mission?.description ?? null,
			missionType: l.mission?.type ?? null,
			orbit: l.mission?.orbit?.name ?? null,
			customer: null,
			agencyId: l.launch_service_provider?.id ?? null,
			launchpadId: l.pad?.id ?? null,
			rocketName: l.rocket?.configuration?.name ?? null,
			imageUrl: l.image ?? null,
			webcastUrl: l.vidURLs?.[0]?.url ?? null,
			ll2LastSyncedAt: new Date().toISOString()
		}));
		await upsertMany(db, launch, launchRows, 'id');

		// Replace launch_booster join rows for the launches we just synced
		// to keep the join clean across resyncs.
		const launchIds = parsed.results.map((l) => l.id);
		if (launchIds.length > 0) {
			await db.delete(launchBooster).where(inArray(launchBooster.launchId, launchIds));
		}

		const joinRows: Array<typeof launchBooster.$inferInsert> = [];
		for (const l of parsed.results) {
			for (const stage of l.rocket?.launcher_stage ?? []) {
				joinRows.push({
					launchId: l.id,
					boosterId: stage.launcher.id,
					role: stage.type ?? '',
					flightNumber: stage.launcher_flight_number ?? null,
					landingAttempted: stage.landing?.attempt ?? null,
					landingSuccess: stage.landing?.success ?? null,
					landingType: stage.landing?.type?.name ?? null,
					landingLocationId: stage.landing?.location?.id ?? null
				});
			}
		}
		if (joinRows.length > 0) {
			await db.insert(launchBooster).values(joinRows).onConflictDoNothing();
		}

		url = parsed.next ?? null;
	}
}

export function recomputeBoosterLandingCounts(_db: BetterSQLite3Database<any>) {
	// Aggregate per-flight landings into the booster row counters.
	// Run after syncLaunches has updated launch_booster.
	const sqlite = getRawSqlite();
	const sql = [
		'UPDATE booster',
		'SET',
		'  attempted_landings = COALESCE((',
		'    SELECT COUNT(*) FROM launch_booster',
		'    WHERE launch_booster.booster_id = booster.id',
		'      AND launch_booster.landing_attempted = 1',
		'  ), 0),',
		'  successful_landings = COALESCE((',
		'    SELECT COUNT(*) FROM launch_booster',
		'    WHERE launch_booster.booster_id = booster.id',
		'      AND launch_booster.landing_success = 1',
		'  ), 0)'
	].join('\n');
	sqlite.prepare(sql).run();
}

export const __statusTokenForTest = statusToken;
