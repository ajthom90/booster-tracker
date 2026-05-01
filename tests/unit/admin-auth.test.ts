import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ADMIN_TOKEN: 'topsecret' } }));

import { constantTimeEquals, checkAdminToken } from '../../src/lib/server/admin/auth';

describe('constantTimeEquals', () => {
	it('returns true for equal strings', () => expect(constantTimeEquals('abc', 'abc')).toBe(true));
	it('returns false for different lengths', () =>
		expect(constantTimeEquals('abc', 'abcd')).toBe(false));
	it('returns false for different content of same length', () =>
		expect(constantTimeEquals('abc', 'abd')).toBe(false));
});

describe('checkAdminToken', () => {
	it('accepts the configured token', () => expect(checkAdminToken('topsecret')).toBe(true));
	it('rejects null', () => expect(checkAdminToken(null)).toBe(false));
	it('rejects empty', () => expect(checkAdminToken('')).toBe(false));
	it('rejects wrong token', () => expect(checkAdminToken('nope')).toBe(false));
});
