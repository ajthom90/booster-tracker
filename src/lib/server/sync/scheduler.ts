import cron from 'node-cron';
import { getDb } from '../db/client';
import { Ll2Client } from '../ll2/client';
import { TokenBucket } from '../ll2/ratelimit';
import { fullSync, incrementalSync } from './orchestrator';

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  const baseUrl = process.env.LL2_BASE_URL ?? 'https://lldev.thespacedevs.com/2.2.0';
  const apiToken = process.env.LL2_API_TOKEN || undefined;
  const fullCron = process.env.SYNC_FULL_CRON ?? '0 3 * * *';
  const incCron = process.env.SYNC_INCREMENTAL_CRON ?? '*/30 * * * *';

  // 15 req/hour matches LL2 free tier; with a token, raise it.
  const bucket = new TokenBucket({ capacity: 15, refillPerHour: apiToken ? 200 : 15 });
  const client = new Ll2Client({ baseUrl, apiToken, bucket });
  const db = getDb();

  cron.schedule(fullCron, async () => {
    try { await fullSync(db, client); }
    catch (err) { console.error('Full sync failed:', err); }
  });

  cron.schedule(incCron, async () => {
    try { await incrementalSync(db, client); }
    catch (err) { console.error('Incremental sync failed:', err); }
  });

  console.log(`[scheduler] full=${fullCron} incremental=${incCron} baseUrl=${baseUrl}`);
}
