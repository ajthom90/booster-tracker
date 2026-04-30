import type { RequestHandler } from './$types';
import { getRawSqlite } from '$lib/server/db/client';

export const GET: RequestHandler = async () => {
	try {
		const sqlite = getRawSqlite();
		const result = sqlite.prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
		if (result?.ok === 1) {
			return new Response(JSON.stringify({ status: 'ok' }), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
		}
		return new Response(JSON.stringify({ status: 'degraded' }), {
			status: 503,
			headers: { 'content-type': 'application/json' }
		});
	} catch (err) {
		return new Response(
			JSON.stringify({ status: 'error', message: err instanceof Error ? err.message : 'unknown' }),
			{ status: 503, headers: { 'content-type': 'application/json' } }
		);
	}
};
