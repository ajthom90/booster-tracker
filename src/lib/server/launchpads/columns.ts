import type { ColumnDef } from '../boosters/columns';

export const LAUNCHPAD_COLUMNS: readonly ColumnDef[] = [
	{ id: 'name', label: 'launchpads_col_name', filter: { kind: 'text' }, defaultVisible: true },
	{
		id: 'full_name',
		label: 'launchpads_col_full_name',
		filter: { kind: 'text' },
		defaultVisible: false
	},
	{
		id: 'location',
		label: 'launchpads_col_location',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{
		id: 'country_code',
		label: 'launchpads_col_country',
		filter: { kind: 'text' },
		defaultVisible: true
	},
	{
		id: 'total_launches',
		label: 'launchpads_col_total_launches',
		filter: { kind: 'numberRange' },
		defaultVisible: true
	}
];

export const LAUNCHPAD_DEFAULT_VISIBLE = LAUNCHPAD_COLUMNS.filter((c) => c.defaultVisible).map(
	(c) => c.id
);
