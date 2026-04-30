type Options = {
	capacity: number;
	refillPerHour: number;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
};

export class TokenBucket {
	private tokens: number;
	private lastRefillMs: number;
	private readonly capacity: number;
	private readonly refillPerMs: number; // tokens per ms
	private readonly now: () => number;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(opts: Options) {
		this.capacity = opts.capacity;
		this.tokens = opts.capacity;
		this.refillPerMs = opts.refillPerHour / 3_600_000;
		this.now = opts.now ?? (() => Date.now());
		this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
		this.lastRefillMs = this.now();
	}

	private refill() {
		const t = this.now();
		const elapsed = t - this.lastRefillMs;
		if (elapsed <= 0) return;
		this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
		this.lastRefillMs = t;
	}

	async tryAcquire(): Promise<boolean> {
		this.refill();
		if (this.tokens >= 1 - 1e-9) {
			this.tokens -= 1;
			return true;
		}
		return false;
	}

	async acquireBlocking(): Promise<void> {
		while (true) {
			this.refill();
			if (this.tokens >= 1 - 1e-9) {
				this.tokens -= 1;
				return;
			}
			const tokensNeeded = 1 - this.tokens;
			const waitMs = Math.ceil(tokensNeeded / this.refillPerMs);
			await this.sleep(waitMs);
		}
	}
}
