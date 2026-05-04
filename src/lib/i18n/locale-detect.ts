import { LOCALE_CODES } from './locale-meta';

const NON_BASE_LOCALES = LOCALE_CODES.filter((c) => c !== 'en');

export function stripLocalePrefix(pathname: string): { locale: string; rest: string } {
	for (const code of NON_BASE_LOCALES) {
		const prefix = `/${code}`;
		if (pathname === prefix) return { locale: code, rest: '/' };
		if (pathname.startsWith(prefix + '/')) {
			return { locale: code, rest: pathname.slice(prefix.length) };
		}
	}
	return { locale: 'en', rest: pathname };
}

export function detectLocale(pathname: string, acceptLanguage: string | null | undefined): string {
	const { locale: prefixLocale } = stripLocalePrefix(pathname);
	if (prefixLocale !== 'en') return prefixLocale;

	if (!acceptLanguage) return 'en';

	const candidates = acceptLanguage
		.split(',')
		.map((part) => part.split(';')[0].trim())
		.filter(Boolean);

	for (const cand of candidates) {
		const lower = cand.toLowerCase();
		const exact = LOCALE_CODES.find((c) => c.toLowerCase() === lower);
		if (exact) return exact;
		const language = lower.split('-')[0];
		const langMatch = LOCALE_CODES.find((c) => c.toLowerCase().split('-')[0] === language);
		if (langMatch) return langMatch;
	}

	return 'en';
}
