import 'dotenv/config';
import { getDb } from './server/db/client';
import { runMigrations } from './server/db/migrate';
import { Ll2Client } from './server/ll2/client';
import { TokenBucket } from './server/ll2/ratelimit';
import { fullSync } from './server/sync/orchestrator';

async function main() {
  console.log('[seed] running migrations...');
  runMigrations();
  const db = getDb();

  const baseUrl = process.env.LL2_BASE_URL ?? 'https://lldev.thespacedevs.com/2.2.0';
  const apiToken = process.env.LL2_API_TOKEN || undefined;
  const bucket = new TokenBucket({ capacity: 15, refillPerHour: apiToken ? 200 : 15 });
  const client = new Ll2Client({ baseUrl, apiToken, bucket });

  console.log(`[seed] starting full sync from ${baseUrl}...`);
  const start = Date.now();
  await fullSync(db, client);
  console.log(`[seed] done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
