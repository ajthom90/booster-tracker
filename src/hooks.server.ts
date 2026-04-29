import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';
import { startScheduler } from '$lib/server/sync/scheduler';
import { setLocale, baseLocale } from '$lib/i18n/runtime';

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
  // Phase 1: lock locale to baseLocale (en). Phase 3 extends this with
  // URL-prefix detection, Accept-Language fallback, and language switcher.
  setLocale(baseLocale);
  event.locals.locale = baseLocale;
  return resolve(event);
};
