import type { PageServerLoad } from './$types';
import { LOCALES } from '$lib/i18n/locale-meta';

// Bundle all locale JSON files at build time via Vite glob — runtime fs reads
// would fail in production because the Dockerfile doesn't copy messages/.
const messageModules = import.meta.glob<Record<string, unknown>>('/messages/*.json', {
	eager: true,
	import: 'default'
});

const baseLocale = 'en';

type Completion = { code: string; total: number; translated: number; percentage: number };

function getMessages(locale: string): Record<string, unknown> | null {
	return messageModules[`/messages/${locale}.json`] ?? null;
}

function getKeys(locale: string): Set<string> {
	const data = getMessages(locale);
	const out = new Set<string>();
	if (!data) return out;
	for (const k of Object.keys(data)) if (!k.startsWith('$')) out.add(k);
	return out;
}

export const load: PageServerLoad = () => {
	const baseKeys = getKeys(baseLocale);
	const baseMessages = getMessages(baseLocale) ?? {};

	const completions: Completion[] = [];
	for (const meta of LOCALES) {
		const code = meta.code;
		if (code === baseLocale) {
			completions.push({
				code,
				total: baseKeys.size,
				translated: baseKeys.size,
				percentage: 100
			});
			continue;
		}
		const messages = getMessages(code);
		if (!messages) {
			completions.push({ code, total: baseKeys.size, translated: 0, percentage: 0 });
			continue;
		}
		let translated = 0;
		for (const k of baseKeys) {
			const v = messages[k];
			if (typeof v === 'string' && v && v !== baseMessages[k]) translated += 1;
		}
		completions.push({
			code,
			total: baseKeys.size,
			translated,
			percentage: Math.round((translated / baseKeys.size) * 100)
		});
	}

	return { completions };
};
