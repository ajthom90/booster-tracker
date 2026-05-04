import type { PageServerLoad } from './$types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '$lib/i18n/locale-meta';

const messagesDir = 'messages';
const baseLocale = 'en';

type Completion = { code: string; total: number; translated: number; percentage: number };

function readKeys(locale: string): Set<string> {
	const data = JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8')) as Record<
		string,
		unknown
	>;
	const out = new Set<string>();
	for (const k of Object.keys(data)) if (!k.startsWith('$')) out.add(k);
	return out;
}

function readMessages(locale: string): Record<string, string> {
	return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8'));
}

export const load: PageServerLoad = () => {
	const baseKeys = readKeys(baseLocale);
	const baseMessages = readMessages(baseLocale);

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
		try {
			const messages = readMessages(code);
			let translated = 0;
			for (const k of baseKeys) {
				const v = messages[k];
				// Count "translated" only when value is non-empty AND differs from English
				// (a placeholder copy that matches en doesn't count).
				if (v && v !== baseMessages[k]) translated += 1;
			}
			completions.push({
				code,
				total: baseKeys.size,
				translated,
				percentage: Math.round((translated / baseKeys.size) * 100)
			});
		} catch {
			completions.push({ code, total: baseKeys.size, translated: 0, percentage: 0 });
		}
	}

	return { completions };
};
