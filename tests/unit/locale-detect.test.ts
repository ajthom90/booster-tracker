import { describe, it, expect } from 'vitest';
import { detectLocale, stripLocalePrefix } from '../../src/lib/i18n/locale-detect';

describe('detectLocale', () => {
	it('returns the URL prefix locale when present', () => {
		expect(detectLocale('/de/boosters', null)).toBe('de');
		expect(detectLocale('/ar/launches', 'en-US,en;q=0.9')).toBe('ar');
		expect(detectLocale('/zh-Hans/stats', null)).toBe('zh-Hans');
	});

	it('falls back to Accept-Language when no URL prefix', () => {
		expect(detectLocale('/boosters', 'fr-FR,fr;q=0.9,en;q=0.7')).toBe('fr');
		expect(detectLocale('/', 'es-ES,es;q=0.9')).toBe('es');
	});

	it('uses base locale en for /', () => {
		expect(detectLocale('/', 'en-US')).toBe('en');
	});

	it('returns en when Accept-Language is unknown', () => {
		expect(detectLocale('/boosters', 'ja-JP,ja')).toBe('en');
	});

	it('returns en for empty/null Accept-Language', () => {
		expect(detectLocale('/boosters', null)).toBe('en');
		expect(detectLocale('/boosters', '')).toBe('en');
	});

	it('rejects unknown URL prefix and falls through to Accept-Language', () => {
		expect(detectLocale('/jp/boosters', 'fr-FR,fr')).toBe('fr');
	});
});

describe('stripLocalePrefix', () => {
	it('strips a known locale prefix', () => {
		expect(stripLocalePrefix('/de/boosters')).toEqual({ locale: 'de', rest: '/boosters' });
		expect(stripLocalePrefix('/zh-Hans/stats/foo')).toEqual({
			locale: 'zh-Hans',
			rest: '/stats/foo'
		});
	});

	it('returns en for paths without a prefix', () => {
		expect(stripLocalePrefix('/boosters')).toEqual({ locale: 'en', rest: '/boosters' });
		expect(stripLocalePrefix('/')).toEqual({ locale: 'en', rest: '/' });
	});

	it('does not strip an unknown prefix', () => {
		expect(stripLocalePrefix('/jp/foo')).toEqual({ locale: 'en', rest: '/jp/foo' });
	});
});
