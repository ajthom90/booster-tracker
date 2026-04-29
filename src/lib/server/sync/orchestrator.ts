import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import type { Ll2Client } from '../ll2/client';
import { syncLaunchpads } from './launchpads';
import { syncBoosters } from './boosters';
import { syncLaunches } from './launches';
import { syncState } from '../db/schema';

type ResourceName = 'launchpads' | 'boosters' | 'launches';

async function setStatus(
  db: BetterSQLite3Database<any>,
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
  db: BetterSQLite3Database<any>,
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

export async function fullSync(db: BetterSQLite3Database<any>, client: Ll2Client) {
  // Order matters: pads/boosters before launches because launches reference both.
  await runResource(db, 'launchpads', () => syncLaunchpads(db, client), true);
  await runResource(db, 'boosters', () => syncBoosters(db, client), true);
  await runResource(db, 'launches', () => syncLaunches(db, client), true);
}

export async function incrementalSync(db: BetterSQLite3Database<any>, client: Ll2Client) {
  // For Phase 1 incremental == refresh upcoming + last 30 days of launches,
  // and re-fetch boosters (their flight counts change after each launch).
  await runResource(db, 'boosters', () => syncBoosters(db, client), false);
  await runResource(db, 'launches', () => syncLaunches(db, client), false);
}
