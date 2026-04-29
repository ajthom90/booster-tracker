import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Ll2Client } from '../ll2/client';
import { ll2LauncherListSchema } from '../ll2/schemas';
import { booster, launcherConfig } from '../db/schema';
import { upsertMany } from './upsert';

export async function syncBoosters(
	db: BetterSQLite3Database<Record<string, unknown>>,
	client: Ll2Client
) {
	let url: string | null = '/launcher/?launch_service_provider__name=SpaceX&limit=100';
	while (url) {
		const raw = await client.getJson<unknown>(url);
		const parsed = ll2LauncherListSchema.parse(raw);

		// Collect unique launcher_configs first so the FK is satisfied.
		const configsById = new Map<number, Record<string, unknown>>();
		for (const r of parsed.results) {
			const c = r.launcher_config;
			if (c && !configsById.has(c.id)) {
				configsById.set(c.id, {
					id: c.id,
					name: c.name,
					family: c.family ?? null,
					fullName: c.full_name ?? null,
					variant: c.variant ?? null,
					description: c.description ?? null
				});
			}
		}
		if (configsById.size > 0) {
			await upsertMany(db, launcherConfig, [...configsById.values()], 'id');
		}

		const rows = parsed.results.map((r) => ({
			id: r.id,
			serialNumber: r.serial_number,
			status: r.status,
			details: r.details ?? null,
			flightProven: r.flight_proven ?? null,
			flights: r.flights ?? 0,
			successfulLandings: r.successful_landings ?? 0,
			attemptedLandings: r.attempted_landings ?? 0,
			firstLaunchDate: r.first_launch_date ?? null,
			lastLaunchDate: r.last_launch_date ?? null,
			imageUrl: r.image_url ?? null,
			launcherConfigId: r.launcher_config?.id ?? null,
			ll2Url: r.url ?? null,
			ll2LastSyncedAt: new Date().toISOString()
		}));
		await upsertMany(db, booster, rows, 'id');

		url = parsed.next ?? null;
	}
}
