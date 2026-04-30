import { describe, it, expect } from 'vitest';
import { encodeViewState, decodeViewState } from '../../src/lib/url-state';

describe('url-state codec', () => {
	it('round-trips a simple state', () => {
		const state = {
			filters: [{ id: 'status', op: 'in', value: ['active'] }],
			sort: [{ id: 'flights', desc: true }],
			visibleCols: ['serial_number', 'status', 'flights'],
			page: 0
		};
		const encoded = encodeViewState(state);
		expect(typeof encoded).toBe('string');
		expect(encoded).not.toContain('{');
		const decoded = decodeViewState(encoded);
		expect(decoded).toEqual(state);
	});

	it('returns null for malformed input', () => {
		expect(decodeViewState('not-base64-😅')).toBeNull();
		expect(decodeViewState('')).toBeNull();
		expect(decodeViewState(null)).toBeNull();
	});

	it('uses URL-safe characters only', () => {
		const state = { filters: [], sort: [], visibleCols: [], page: 0 };
		const encoded = encodeViewState(state);
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it("rejects schemas that don't look like view state", () => {
		const buf = Buffer.from(JSON.stringify({ unrelated: true })).toString('base64');
		expect(decodeViewState(buf)).toBeNull();
	});
});
