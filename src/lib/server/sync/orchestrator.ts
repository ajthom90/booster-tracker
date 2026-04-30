import { eq } from 'drizzle-orm';
import type { AppDb } from '../db/types';
import type { Ll2Client } from '../ll2/client';
import { syncLaunchpads, recomputeLaunchpadStats } from './launchpads';
import { syncBoosters } from './boosters';
import {
	syncLaunches,
	recomputeBoosterLandingCounts,
	recomputeLandingLocationCounts
} from './launches';
import { syncState } from '../db/schema';

type ResourceName = 'launchpads' | 'boosters' | 'launches';

async function setStatus(
	db: AppDb,
	resource: ResourceName,
	patch: Partial<typeof syncState.$inferInsert>
) {
	const existing = await db.select().from(syncState).where(eq(syncState.resource, resource));
	if (existing.length === 0) {
		await db.insert(syncState).values({ resource, status: 'ok', ...patch });
	} else {
		await db.update(syncState).set(patch).where(eq(syncState.resource, resource));
	}
}

async function runResource(
	db: AppDb,
	resource: ResourceName,
	fn: () => Promise<void>,
	fullSync: boolean
) {
	await setStatus(db, resource, { status: 'in_progress', errorMessage: null });
	try {
		await fn();
		const ts = new Date().toISOString();
		await setStatus(db, resource, {
			status: 'ok',
			...(fullSync ? { lastFullSyncAt: ts } : { lastIncrementalSyncAt: ts })
		});
	} catch (err) {
		await setStatus(db, resource, {
			status: 'error',
			errorMessage: err instanceof Error ? err.message : String(err)
		});
		throw err;
	}
}

export async function fullSync(db: AppDb, client: Ll2Client) {
	// Order matters: pads/boosters before launches because launches reference both.
	await runResource(db, 'launchpads', () => syncLaunchpads(db, client), true);
	await runResource(db, 'boosters', () => syncBoosters(db, client), true);
	// LL2's /launcher/ endpoint doesn't return landing counts; restore them
	// from existing launch_booster rows immediately so the UI is never blank
	// during the (potentially slow) launches sync that follows.
	recomputeBoosterLandingCounts();
	await runResource(db, 'launches', () => syncLaunches(db, client), true);
	// Recompute again so newly-synced launch_booster rows are reflected.
	recomputeBoosterLandingCounts();
	recomputeLandingLocationCounts();
	recomputeLaunchpadStats();
}

export async function incrementalSync(db: AppDb, client: Ll2Client) {
	// For Phase 1 incremental == refresh upcoming + last 30 days of launches,
	// and re-fetch boosters (their flight counts change after each launch).
	await runResource(db, 'boosters', () => syncBoosters(db, client), false);
	recomputeBoosterLandingCounts();
	await runResource(db, 'launches', () => syncLaunches(db, client), false);
	recomputeBoosterLandingCounts();
	recomputeLandingLocationCounts();
	recomputeLaunchpadStats();
}
