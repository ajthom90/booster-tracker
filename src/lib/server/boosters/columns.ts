export type FilterType =
	| { kind: 'enum'; options: readonly string[] }
	| { kind: 'numberRange' }
	| { kind: 'dateRange' }
	| { kind: 'text' }
	| { kind: 'boolean' };

export type ColumnDef = {
	id: string; // matches schema column name (snake_case)
	label: string; // i18n key
	filter?: FilterType;
	defaultVisible: boolean;
};

export const BOOSTER_STATUSES = [
	'active',
	'inactive',
	'expended',
	'lost',
	'retired',
	'unknown'
] as const;

export const BOOSTER_COLUMNS: readonly ColumnDef[] = [
	{
		id: 'serial_number',
		label: 'col_serial_number',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{
		id: 'status',
		label: 'col_status',
		filter: { kind: 'enum', options: BOOSTER_STATUSES },
		defaultVisible: true
	},
	{ id: 'flights', label: 'col_flights', filter: { kind: 'numberRange' }, defaultVisible: true },
	{
		id: 'first_launch_date',
		label: 'col_first_launch_date',
		filter: { kind: 'dateRange' },
		defaultVisible: true
	},
	{
		id: 'last_launch_date',
		label: 'col_last_launch_date',
		filter: { kind: 'dateRange' },
		defaultVisible: true
	},
	{
		id: 'days_since_last_flight',
		label: 'col_days_since_last_flight',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	},
	{
		id: 'successful_landings',
		label: 'col_successful_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: false
	},
	{
		id: 'attempted_landings',
		label: 'col_attempted_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: false
	},
	{ id: 'block', label: 'col_block', filter: { kind: 'text' }, defaultVisible: false }
];

export const BOOSTER_DEFAULT_VISIBLE = BOOSTER_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
