import type { Launchpad } from '../db/schema';
import { LAUNCHPAD_COLUMNS } from './columns';

function csvEscape(s: unknown): string {
	if (s == null) return '';
	const str = String(s);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

const FIELD_FOR_COL: Record<string, (l: Launchpad) => unknown> = {
	name: (l) => l.name,
	full_name: (l) => l.fullName,
	location: (l) => l.location,
	country_code: (l) => l.countryCode,
	total_launches: (l) => l.totalLaunches
};

export function launchpadsToCsv(rows: Launchpad[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LAUNCHPAD_COLUMNS.map((c) => c.id);
	const header = cols.join(',');
	const body = rows
		.map((r) => cols.map((c) => csvEscape(FIELD_FOR_COL[c]?.(r))).join(','))
		.join('\n');
	return `${header}\n${body}\n`;
}

export function launchpadsToJson(rows: Launchpad[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LAUNCHPAD_COLUMNS.map((c) => c.id);
	return JSON.stringify(
		rows.map((r) => Object.fromEntries(cols.map((c) => [c, FIELD_FOR_COL[c]?.(r) ?? null]))),
		null,
		2
	);
}
