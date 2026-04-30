import type { TokenBucket } from './ratelimit';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type Ll2ClientOptions = {
	baseUrl: string;
	bucket: TokenBucket;
	fetch?: FetchLike;
	apiToken?: string;
	maxRetries?: number;
	retryDelayMs?: number;
	sleep?: (ms: number) => Promise<void>;
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class Ll2Client {
	private readonly baseUrl: string;
	private readonly bucket: TokenBucket;
	private readonly fetchImpl: FetchLike;
	private readonly apiToken?: string;
	private readonly maxRetries: number;
	private readonly retryDelayMs: number;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(opts: Ll2ClientOptions) {
		this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
		this.bucket = opts.bucket;
		this.fetchImpl = opts.fetch ?? (globalThis.fetch as FetchLike);
		this.apiToken = opts.apiToken;
		this.maxRetries = opts.maxRetries ?? 3;
		this.retryDelayMs = opts.retryDelayMs ?? 2000;
		this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
	}

	/** GET an absolute URL (used to follow `next` pagination cursors). */
	async getJsonAbs<T = unknown>(absoluteUrl: string): Promise<T> {
		const headers: Record<string, string> = { Accept: 'application/json' };
		if (this.apiToken) headers.Authorization = `Token ${this.apiToken}`;

		let attempt = 0;
		while (true) {
			await this.bucket.acquireBlocking();
			const res = await this.fetchImpl(absoluteUrl, { headers });
			if (res.ok) {
				return (await res.json()) as T;
			}
			if (RETRYABLE_STATUSES.has(res.status) && attempt < this.maxRetries) {
				const backoff = this.retryDelayMs * Math.pow(2, attempt);
				attempt += 1;
				await this.sleep(backoff);
				continue;
			}
			throw new Error(`HTTP ${res.status} fetching ${absoluteUrl}`);
		}
	}

	/** GET a path relative to baseUrl. */
	getJson<T = unknown>(path: string): Promise<T> {
		const url = path.startsWith('http')
			? path
			: `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
		return this.getJsonAbs<T>(url);
	}
}
