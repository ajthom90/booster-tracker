export type FilterClause = { id: string; op: string; value: unknown };
export type SortClause = { id: string; desc: boolean };

export type ViewState = {
	filters: FilterClause[];
	sort: SortClause[];
	visibleCols: string[];
	page: number;
};

export const EMPTY_VIEW_STATE: ViewState = { filters: [], sort: [], visibleCols: [], page: 0 };

function isViewState(x: unknown): x is ViewState {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	return (
		Array.isArray(o.filters) &&
		Array.isArray(o.sort) &&
		Array.isArray(o.visibleCols) &&
		typeof o.page === 'number'
	);
}

// Universal base64url codec — works in both Node and the browser.
// We avoid `Buffer` so this module can run unchanged in Svelte components
// that need to encode state when navigating client-side.

function utf8ToBytes(s: string): Uint8Array {
	return new TextEncoder().encode(s);
}
function bytesToUtf8(b: Uint8Array): string {
	return new TextDecoder().decode(b);
}
function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	// btoa is available in browsers and in Node 18+ globally
	return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
}
function base64ToBytes(b64: string): Uint8Array {
	const bin =
		typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}
function toBase64Url(input: string): string {
	return bytesToBase64(utf8ToBytes(input))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}
function fromBase64Url(input: string): string {
	const padded =
		input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
	return bytesToUtf8(base64ToBytes(padded));
}

export function encodeViewState(state: ViewState): string {
	return toBase64Url(JSON.stringify(state));
}

export function decodeViewState(encoded: string | null | undefined): ViewState | null {
	if (!encoded) return null;
	try {
		const json = fromBase64Url(encoded);
		const parsed = JSON.parse(json);
		if (!isViewState(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
