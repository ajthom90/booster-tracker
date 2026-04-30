import type { Launch } from '../db/schema';
import { LAUNCH_COLUMNS } from './columns';

function csvEscape(s: unknown): string {
	if (s == null) return '';
	const str = String(s);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

const FIELD_FOR_COL: Record<string, (l: Launch) => unknown> = {
	name: (l) => l.name,
	status: (l) => l.status,
	net: (l) => l.net,
	mission_type: (l) => l.missionType,
	orbit: (l) => l.orbit,
	rocket_name: (l) => l.rocketName,
	launchpad_id: (l) => l.launchpadId
};

export function launchesToCsv(rows: Launch[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LAUNCH_COLUMNS.map((c) => c.id);
	const header = cols.join(',');
	const body = rows
		.map((r) => cols.map((c) => csvEscape(FIELD_FOR_COL[c]?.(r))).join(','))
		.join('\n');
	return `${header}\n${body}\n`;
}

export function launchesToJson(rows: Launch[], visibleCols: string[]): string {
	const cols = visibleCols.length > 0 ? visibleCols : LAUNCH_COLUMNS.map((c) => c.id);
	return JSON.stringify(
		rows.map((r) => Object.fromEntries(cols.map((c) => [c, FIELD_FOR_COL[c]?.(r) ?? null]))),
		null,
		2
	);
}
