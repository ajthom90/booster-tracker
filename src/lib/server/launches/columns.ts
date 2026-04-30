import type { ColumnDef } from '../boosters/columns';

export const LAUNCH_STATUSES = [
	'success',
	'failure',
	'partial_failure',
	'upcoming',
	'in_flight',
	'unknown'
] as const;

export const LAUNCH_COLUMNS: readonly ColumnDef[] = [
	{ id: 'name', label: 'launches_col_name', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'status',
		label: 'launches_col_status',
		filter: { kind: 'enum', options: LAUNCH_STATUSES },
		defaultVisible: true
	},
	{ id: 'net', label: 'launches_col_net', filter: { kind: 'dateRange' }, defaultVisible: true },
	{
		id: 'mission_type',
		label: 'launches_col_mission_type',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{ id: 'orbit', label: 'launches_col_orbit', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'rocket_name',
		label: 'launches_col_rocket',
		filter: { kind: 'text' },
		defaultVisible: false
	},
	{ id: 'launchpad_id', label: 'launches_col_launchpad', defaultVisible: false }
];

export const LAUNCH_DEFAULT_VISIBLE = LAUNCH_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
