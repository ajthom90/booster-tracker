import { desc } from 'drizzle-orm';
import { launchpad } from '../db/schema';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';
import type { EntityConfig } from '../entity-query/types';
import type { AppDb } from '../db/types';

export const launchpadEntityConfig: EntityConfig<typeof launchpad> = {
	table: launchpad,
	columnMap: {
		name: launchpad.name,
		full_name: launchpad.fullName,
		location: launchpad.location,
		country_code: launchpad.countryCode,
		total_launches: launchpad.totalLaunches
	},
	defaultSort: [desc(launchpad.totalLaunches)]
};

export async function runLaunchpadsQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, launchpadEntityConfig, args);
}
