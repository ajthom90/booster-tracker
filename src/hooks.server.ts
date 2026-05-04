import type { Handle } from '@sveltejs/kit';
import { runMigrations } from '$lib/server/db/migrate';
import { startScheduler } from '$lib/server/sync/scheduler';
import { setLocale } from '$lib/i18n/runtime';
import { detectLocale } from '$lib/i18n/locale-detect';
import { getLocaleDir } from '$lib/i18n/locale-meta';

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
	const acceptLanguage = event.request.headers.get('accept-language');
	const locale = detectLocale(event.url.pathname, acceptLanguage);

	setLocale(locale as 'en' | 'es' | 'fr' | 'de' | 'ar' | 'he' | 'zh-Hans');
	event.locals.locale = locale;

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const dir = getLocaleDir(locale);
			return html.replace('%sveltekit.html.attributes%', `lang="${locale}" dir="${dir}"`);
		}
	});
};
