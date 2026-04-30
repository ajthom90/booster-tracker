import { desc } from 'drizzle-orm';
import { landingLocation } from '../db/schema';
import { runEntityQuery, type RunQueryArgs } from '../entity-query/query';
import type { EntityConfig } from '../entity-query/types';
import type { AppDb } from '../db/types';

export const locationEntityConfig: EntityConfig<typeof landingLocation> = {
	table: landingLocation,
	columnMap: {
		name: landingLocation.name,
		abbrev: landingLocation.abbrev,
		location_type: landingLocation.locationType,
		successful_landings: landingLocation.successfulLandings,
		attempted_landings: landingLocation.attemptedLandings
	},
	defaultSort: [desc(landingLocation.successfulLandings)]
};

export async function runLocationsQuery(db: AppDb, args: RunQueryArgs) {
	return runEntityQuery(db, locationEntityConfig, args);
}
