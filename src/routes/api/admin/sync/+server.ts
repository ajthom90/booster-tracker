import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { checkAdminToken } from '$lib/server/admin/auth';
import { getDb } from '$lib/server/db/client';
import { Ll2Client } from '$lib/server/ll2/client';
import { TokenBucket } from '$lib/server/ll2/ratelimit';
import { incrementalSync } from '$lib/server/sync/orchestrator';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!checkAdminToken(token)) throw error(401, 'Invalid or missing token');

	const baseUrl = env.LL2_BASE_URL ?? 'https://lldev.thespacedevs.com/2.2.0';
	const apiToken = env.LL2_API_TOKEN || undefined;
	const bucket = new TokenBucket({ capacity: 15, refillPerHour: apiToken ? 200 : 15 });
	const client = new Ll2Client({ baseUrl, apiToken, bucket });
	const db = getDb();

	// Don't await — run in background; return immediately. The status table
	// will reflect progress as the sync runs.
	void incrementalSync(db, client).catch((err) => console.error('manual sync failed:', err));
	return json({ status: 'started' });
};
