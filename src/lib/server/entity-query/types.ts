import type { SQL, AnyColumn } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { FilterClause } from '../../url-state';

export type EntityColumnRef =
	| AnyColumn
	| {
			kind: 'computed';
			toSql: (clause: FilterClause) => SQL | null;
			orderBy: SQL;
	  };

export type EntityConfig<TTable extends SQLiteTable> = {
	table: TTable;
	columnMap: Record<string, EntityColumnRef>;
	defaultSort: SQL[];
};
