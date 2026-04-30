import type { ColumnDef } from '../boosters/columns';

export const LOCATION_TYPES = ['ASDS', 'RTLS', 'Ocean', 'Unknown'] as const;

export const LOCATION_COLUMNS: readonly ColumnDef[] = [
	{ id: 'name', label: 'locations_col_name', filter: { kind: 'text' }, defaultVisible: true },
	{ id: 'abbrev', label: 'locations_col_abbrev', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'location_type',
		label: 'locations_col_type',
		filter: { kind: 'enum', options: LOCATION_TYPES },
		defaultVisible: true
	},
	{
		id: 'successful_landings',
		label: 'locations_col_successful_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	},
	{
		id: 'attempted_landings',
		label: 'locations_col_attempted_landings',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	}
];

export const LOCATION_DEFAULT_VISIBLE = LOCATION_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
