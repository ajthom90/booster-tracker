import { env } from '$env/dynamic/private';

/** Constant-time string comparison. Both inputs treated as opaque. */
export function constantTimeEquals(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * Check the supplied token against ADMIN_TOKEN. Returns false if either is
 * empty/missing — refuses to authenticate when the env var is unset.
 */
export function checkAdminToken(provided: string | null | undefined): boolean {
	const expected = env.ADMIN_TOKEN ?? '';
	if (!expected) return false;
	if (!provided) return false;
	return constantTimeEquals(provided, expected);
}
