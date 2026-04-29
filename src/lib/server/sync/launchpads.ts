import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Ll2Client } from '../ll2/client';
import { ll2PadListSchema } from '../ll2/schemas';
import { launchpad } from '../db/schema';
import { upsertMany } from './upsert';

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export async function syncLaunchpads(
	db: BetterSQLite3Database<Record<string, unknown>>,
	client: Ll2Client
) {
	// Filter to SpaceX at the API level.
	let url: string | null = '/pad/?launch_service_provider__name=SpaceX&limit=100';
	while (url) {
		const raw = await client.getJson<unknown>(url);
		const parsed = ll2PadListSchema.parse(raw);
		const rows = parsed.results.map((p) => ({
			id: p.id,
			name: p.name,
			fullName: p.name,
			location: p.location?.name ?? null,
			countryCode: p.location?.country_code ?? null,
			totalLaunches: p.total_launch_count ?? 0,
			imageUrl: p.map_image ?? null,
			slug: `${slugify(p.name)}-${p.id}`
		}));
		await upsertMany(db, launchpad, rows, 'id');
		url = parsed.next ?? null;
	}
}
