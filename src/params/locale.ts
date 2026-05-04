import type { ParamMatcher } from '@sveltejs/kit';
import { LOCALE_CODES } from '$lib/i18n/locale-meta';

const NON_BASE_LOCALES = new Set(LOCALE_CODES.filter((c) => c !== 'en'));

export const match: ParamMatcher = (param) => NON_BASE_LOCALES.has(param);
