import { describe, it, expect } from 'vitest';
import { LOCALES, LOCALE_CODES, getLocaleMeta, getLocaleDir } from '../../src/lib/i18n/locale-meta';

describe('locale-meta', () => {
	it('exposes 7 locales', () => {
		expect(LOCALES).toHaveLength(7);
	});

	it('LOCALE_CODES matches LOCALES order and shape', () => {
		expect(LOCALE_CODES).toEqual(['en', 'es', 'fr', 'de', 'ar', 'he', 'zh-Hans']);
	});

	it('marks ar and he as rtl, others ltr', () => {
		expect(getLocaleDir('ar')).toBe('rtl');
		expect(getLocaleDir('he')).toBe('rtl');
		expect(getLocaleDir('en')).toBe('ltr');
		expect(getLocaleDir('zh-Hans')).toBe('ltr');
	});

	it('returns null for unknown code', () => {
		expect(getLocaleMeta('xx')).toBeNull();
	});

	it('falls back to ltr for unknown code', () => {
		expect(getLocaleDir('xx')).toBe('ltr');
	});

	it('every locale has all four required fields', () => {
		for (const l of LOCALES) {
			expect(l.code).toBeTruthy();
			expect(l.label).toBeTruthy();
			expect(l.nativeLabel).toBeTruthy();
			expect(['ltr', 'rtl']).toContain(l.dir);
		}
	});
});
