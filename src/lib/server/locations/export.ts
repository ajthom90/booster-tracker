import type { LandingLocation } from '../db/schema';
import { LOCATION_COLUMNS } from './columns';

function csvEscape(s: unknown): string {
	if (s == null) return '';
	const str = String(s);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

const FIELD_FOR_COL: Record<string, (l: LandingLocation) => unknown> = {
	name: (l) => l.name,
	abbrev: (l) => l.abbrev,
	location_type: (l) => l.locationType,
	successful_landings: (l) => l.successfulLandings,
	attempted_landings: (l) => l.attemptedLandings
};

export function locationsToCsv(rows: LandingLocation[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LOCATION_COLUMNS.map((c) => c.id);
	const header = cols.join(',');
	const body = rows
		.map((r) => cols.map((c) => csvEscape(FIELD_FOR_COL[c]?.(r))).join(','))
		.join('\n');
	return `${header}\n${body}\n`;
}

export function locationsToJson(rows: LandingLocation[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LOCATION_COLUMNS.map((c) => c.id);
	return JSON.stringify(
		rows.map((r) => Object.fromEntries(cols.map((c) => [c, FIELD_FOR_COL[c]?.(r) ?? null]))),
		null,
		2
	);
}
