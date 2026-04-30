import { desc } from 'drizzle-orm';
import { launch } from '../db/schema';
import type { EntityConfig } from '../entity-query/types';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';
import type { AppDb } from '../db/types';

export const launchEntityConfig: EntityConfig<typeof launch> = {
	table: launch,
	columnMap: {
		name: launch.name,
		status: launch.status,
		net: launch.net,
		mission_type: launch.missionType,
		orbit: launch.orbit,
		rocket_name: launch.rocketName,
		launchpad_id: launch.launchpadId
	},
	defaultSort: [desc(launch.net)]
};

export async function runLaunchesQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, launchEntityConfig, args);
}
