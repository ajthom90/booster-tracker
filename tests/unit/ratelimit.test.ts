import { describe, it, expect, vi } from 'vitest';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';

describe('TokenBucket', () => {
	it('starts with a full bucket', async () => {
		const bucket = new TokenBucket({ capacity: 3, refillPerHour: 3, now: () => 0 });
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
	});

	it('refills tokens linearly over time', async () => {
		let now = 0;
		const bucket = new TokenBucket({ capacity: 2, refillPerHour: 2, now: () => now });
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);

		// Half an hour later: 1 token refills
		now = 1800_000;
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
	});

	it('caps tokens at capacity even after long idle', async () => {
		let now = 0;
		const bucket = new TokenBucket({ capacity: 2, refillPerHour: 2, now: () => now });
		now = 24 * 3600_000; // a day later
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(true);
		expect(await bucket.tryAcquire()).toBe(false);
	});

	it('acquireBlocking waits until a token is available', async () => {
		let now = 0;
		const sleeps: number[] = [];
		const bucket = new TokenBucket({
			capacity: 1,
			refillPerHour: 60,
			now: () => now,
			sleep: async (ms) => {
				sleeps.push(ms);
				now += ms;
			}
		});
		expect(await bucket.tryAcquire()).toBe(true);
		await bucket.acquireBlocking();
		expect(sleeps.length).toBeGreaterThan(0);
		expect(sleeps[0]).toBeGreaterThanOrEqual(60_000); // 1 minute per refill at 60/hr
	});
});
