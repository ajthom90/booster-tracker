import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';
import { startScheduler } from '$lib/server/sync/scheduler';

let booted = false;
function bootOnce() {
  if (booted) return;
  booted = true;
  runMigrations();
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }
}

bootOnce();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
