import type { Booster } from '../db/schema';
import { BOOSTER_COLUMNS } from './columns';

function csvEscape(s: unknown): string {
	if (s == null) return '';
	const str = String(s);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

const FIELD_FOR_COL: Record<string, (b: Booster) => unknown> = {
	serial_number: (b) => b.serialNumber,
	status: (b) => b.status,
	flights: (b) => b.flights,
	successful_landings: (b) => b.successfulLandings,
	attempted_landings: (b) => b.attemptedLandings,
	first_launch_date: (b) => b.firstLaunchDate,
	last_launch_date: (b) => b.lastLaunchDate,
	days_since_last_flight: (b) =>
		b.lastLaunchDate
			? Math.floor((Date.now() - new Date(b.lastLaunchDate).getTime()) / 86_400_000)
			: null,
	block: () => null // requires launcher_config join — left blank in Phase 1
};

export function boostersToCsv(rows: Booster[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : BOOSTER_COLUMNS.map((c) => c.id);
	const header = cols.join(',');
	const body = rows
		.map((r) => cols.map((c) => csvEscape(FIELD_FOR_COL[c]?.(r))).join(','))
		.join('\n');
	return `${header}\n${body}\n`;
}

export function boostersToJson(rows: Booster[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : BOOSTER_COLUMNS.map((c) => c.id);
	return JSON.stringify(
		rows.map((r) => Object.fromEntries(cols.map((c) => [c, FIELD_FOR_COL[c]?.(r) ?? null]))),
		null,
		2
	);
}
