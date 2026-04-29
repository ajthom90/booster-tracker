import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';

let booted = false;

function bootOnce() {
  if (booted) return;
  booted = true;
  runMigrations();
}

bootOnce();

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
