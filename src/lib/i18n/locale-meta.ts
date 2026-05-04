export type LocaleDir = 'ltr' | 'rtl';

export type LocaleMeta = {
	code: string;
	label: string;
	nativeLabel: string;
	dir: LocaleDir;
};

export const LOCALES: readonly LocaleMeta[] = [
	{ code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
	{ code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
	{ code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
	{ code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
	{ code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
	{ code: 'he', label: 'Hebrew', nativeLabel: 'עברית', dir: 'rtl' },
	{ code: 'zh-Hans', label: 'Mandarin (Simplified)', nativeLabel: '简体中文', dir: 'ltr' }
];

export const LOCALE_CODES: readonly string[] = LOCALES.map((l) => l.code);

export function getLocaleMeta(code: string): LocaleMeta | null {
	return LOCALES.find((l) => l.code === code) ?? null;
}

export function getLocaleDir(code: string): LocaleDir {
	return getLocaleMeta(code)?.dir ?? 'ltr';
}
