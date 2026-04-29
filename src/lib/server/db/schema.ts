import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ---------- launcher_config ----------
export const launcherConfig = sqliteTable('launcher_config', {
	id: integer('id').primaryKey(),
	name: text('name').notNull(),
	family: text('family'),
	fullName: text('full_name'),
	variant: text('variant'),
	description: text('description')
});

// ---------- booster (LL2 Launcher) ----------
export const booster = sqliteTable(
	'booster',
	{
		id: integer('id').primaryKey(),
		serialNumber: text('serial_number').notNull(),
		status: text('status').notNull(), // active | inactive | expended | lost | retired | unknown
		details: text('details'),
		flightProven: integer('flight_proven', { mode: 'boolean' }),
		flights: integer('flights').notNull().default(0),
		successfulLandings: integer('successful_landings').notNull().default(0),
		attemptedLandings: integer('attempted_landings').notNull().default(0),
		firstLaunchDate: text('first_launch_date'),
		lastLaunchDate: text('last_launch_date'),
		imageUrl: text('image_url'),
		launcherConfigId: integer('launcher_config_id').references(() => launcherConfig.id),
		ll2Url: text('ll2_url'),
		ll2LastSyncedAt: text('ll2_last_synced_at')
	},
	(t) => [
		uniqueIndex('booster_serial_unique').on(t.serialNumber),
		index('booster_status_idx').on(t.status)
	]
);

// ---------- launchpad ----------
export const launchpad = sqliteTable(
	'launchpad',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		fullName: text('full_name'),
		location: text('location'),
		countryCode: text('country_code'),
		totalLaunches: integer('total_launches').default(0),
		imageUrl: text('image_url'),
		slug: text('slug').notNull()
	},
	(t) => [uniqueIndex('launchpad_slug_unique').on(t.slug)]
);

// ---------- landing_location ----------
export const landingLocation = sqliteTable(
	'landing_location',
	{
		id: integer('id').primaryKey(),
		name: text('name').notNull(),
		abbrev: text('abbrev'),
		locationType: text('location_type').notNull(), // ASDS | RTLS | Ocean
		description: text('description'),
		successfulLandings: integer('successful_landings').default(0),
		attemptedLandings: integer('attempted_landings').default(0),
		slug: text('slug').notNull()
	},
	(t) => [uniqueIndex('landing_location_slug_unique').on(t.slug)]
);

// ---------- launch ----------
export const launch = sqliteTable(
	'launch',
	{
		id: text('id').primaryKey(), // LL2 UUID string
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		status: text('status').notNull(), // success | failure | upcoming | in_flight | partial_failure
		net: text('net').notNull(), // ISO 8601 datetime
		windowStart: text('window_start'),
		windowEnd: text('window_end'),
		missionName: text('mission_name'),
		missionDescription: text('mission_description'),
		missionType: text('mission_type'),
		orbit: text('orbit'),
		customer: text('customer'),
		agencyId: integer('agency_id'),
		launchpadId: integer('launchpad_id').references(() => launchpad.id),
		rocketName: text('rocket_name'),
		imageUrl: text('image_url'),
		webcastUrl: text('webcast_url'),
		ll2LastSyncedAt: text('ll2_last_synced_at')
	},
	(t) => [
		uniqueIndex('launch_slug_unique').on(t.slug),
		index('launch_net_idx').on(t.net),
		index('launch_status_idx').on(t.status)
	]
);

// ---------- launch_booster (join) ----------
export const launchBooster = sqliteTable(
	'launch_booster',
	{
		launchId: text('launch_id')
			.notNull()
			.references(() => launch.id, { onDelete: 'cascade' }),
		boosterId: integer('booster_id')
			.notNull()
			.references(() => booster.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default(''), // '', 'core', 'side' (Falcon Heavy)
		flightNumber: integer('flight_number'),
		landingAttempted: integer('landing_attempted', { mode: 'boolean' }),
		landingSuccess: integer('landing_success', { mode: 'boolean' }),
		landingType: text('landing_type'), // ASDS | RTLS | Ocean | Expended
		landingLocationId: integer('landing_location_id').references(() => landingLocation.id)
	},
	(t) => [
		primaryKey({ columns: [t.launchId, t.boosterId, t.role] }),
		index('launch_booster_booster_idx').on(t.boosterId),
		index('launch_booster_launch_idx').on(t.launchId)
	]
);

// ---------- sync_state (per-resource bookkeeping) ----------
export const syncState = sqliteTable('sync_state', {
	resource: text('resource').primaryKey(), // 'launches' | 'launchers' | 'launchpads' | 'launcher_configs'
	lastFullSyncAt: text('last_full_sync_at'),
	lastIncrementalSyncAt: text('last_incremental_sync_at'),
	nextUrl: text('next_url'),
	status: text('status').notNull().default('ok'), // ok | in_progress | error
	errorMessage: text('error_message')
});

// ---------- relations ----------
export const boosterRelations = relations(booster, ({ one, many }) => ({
	launcherConfig: one(launcherConfig, {
		fields: [booster.launcherConfigId],
		references: [launcherConfig.id]
	}),
	flights: many(launchBooster)
}));

export const launchRelations = relations(launch, ({ one, many }) => ({
	launchpad: one(launchpad, {
		fields: [launch.launchpadId],
		references: [launchpad.id]
	}),
	boosters: many(launchBooster)
}));

export const launchBoosterRelations = relations(launchBooster, ({ one }) => ({
	launch: one(launch, { fields: [launchBooster.launchId], references: [launch.id] }),
	booster: one(booster, { fields: [launchBooster.boosterId], references: [booster.id] }),
	landingLocation: one(landingLocation, {
		fields: [launchBooster.landingLocationId],
		references: [landingLocation.id]
	})
}));

// Convenience type aliases
export type Booster = typeof booster.$inferSelect;
export type BoosterInsert = typeof booster.$inferInsert;
export type Launch = typeof launch.$inferSelect;
export type LaunchInsert = typeof launch.$inferInsert;
export type Launchpad = typeof launchpad.$inferSelect;
export type LandingLocation = typeof landingLocation.$inferSelect;
export type LauncherConfig = typeof launcherConfig.$inferSelect;
export type LaunchBooster = typeof launchBooster.$inferSelect;
export type SyncState = typeof syncState.$inferSelect;
