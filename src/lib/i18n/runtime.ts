import * as m from '$lib/paraglide/messages';
import { setLocale, getLocale, baseLocale, locales } from '$lib/paraglide/runtime';

export { m, setLocale, getLocale, baseLocale, locales };

export function formatDate(iso: string | null, locale: string = baseLocale): string {
	if (!iso) return '';
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatNumber(n: number | null | undefined, locale: string = baseLocale): string {
	if (n == null) return '';
	return new Intl.NumberFormat(locale).format(n);
}

export function formatDaysSince(
	iso: string | null,
	locale: string = baseLocale,
	now: Date = new Date()
): string {
	if (!iso) return '';
	const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
	return new Intl.NumberFormat(locale).format(days);
}

export function resolveLabel(key: string): string {
	const fn = (m as unknown as Record<string, () => string>)[key];
	return typeof fn === 'function' ? fn() : key;
}
