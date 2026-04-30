import { sql, asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { AppDb } from '../db/types';
import { booster, launch, launchBooster, landingLocation, launchpad } from '../db/schema';

/* ---------- fleet at a glance ---------- */

export type FleetGlance = {
	totalBoosters: number;
	activeBoosters: number;
	retiredBoosters: number;
	expendedBoosters: number;
	lostBoosters: number;
	totalLaunches: number;
	totalLandingAttempts: number;
	totalLandingSuccesses: number;
	landingSuccessRate: number;
};

export async function fleetAtAGlance(db: AppDb): Promise<FleetGlance> {
	const [boosters] = await db
		.select({
			total: sql<number>`count(*)`,
			active: sql<number>`sum(CASE WHEN ${booster.status} = 'active' THEN 1 ELSE 0 END)`,
			retired: sql<number>`sum(CASE WHEN ${booster.status} = 'retired' THEN 1 ELSE 0 END)`,
			expended: sql<number>`sum(CASE WHEN ${booster.status} = 'expended' THEN 1 ELSE 0 END)`,
			lost: sql<number>`sum(CASE WHEN ${booster.status} = 'lost' THEN 1 ELSE 0 END)`
		})
		.from(booster);

	const [launches] = await db.select({ total: sql<number>`count(*)` }).from(launch);

	const [landings] = await db
		.select({
			attempts: sql<number>`sum(CASE WHEN ${launchBooster.landingAttempted} = 1 THEN 1 ELSE 0 END)`,
			successes: sql<number>`sum(CASE WHEN ${launchBooster.landingSuccess} = 1 THEN 1 ELSE 0 END)`
		})
		.from(launchBooster);

	const attempts = landings?.attempts ?? 0;
	const successes = landings?.successes ?? 0;
	return {
		totalBoosters: boosters?.total ?? 0,
		activeBoosters: boosters?.active ?? 0,
		retiredBoosters: boosters?.retired ?? 0,
		expendedBoosters: boosters?.expended ?? 0,
		lostBoosters: boosters?.lost ?? 0,
		totalLaunches: launches?.total ?? 0,
		totalLandingAttempts: attempts,
		totalLandingSuccesses: successes,
		landingSuccessRate: attempts === 0 ? 0 : successes / attempts
	};
}

/* ---------- records ---------- */

export type FleetRecords = {
	mostFlownBooster: { serial: string; flights: number } | null;
	mostUsedLaunchpad: { name: string; total: number } | null;
	mostUsedDroneship: { name: string; successes: number } | null;
};

export async function fleetRecords(db: AppDb): Promise<FleetRecords> {
	const topFlown = await db
		.select({ serial: booster.serialNumber, flights: booster.flights })
		.from(booster)
		.orderBy(desc(booster.flights))
		.limit(1);

	const topPad = await db
		.select({
			name: launchpad.name,
			total: sql<number>`count(*)`
		})
		.from(launch)
		.innerJoin(launchpad, eq(launchpad.id, launch.launchpadId))
		.groupBy(launch.launchpadId)
		.orderBy(desc(sql`count(*)`))
		.limit(1);

	const topShipResult = await db
		.select({
			name: landingLocation.name,
			successes: sql<number>`count(*)`
		})
		.from(launchBooster)
		.innerJoin(landingLocation, eq(landingLocation.id, launchBooster.landingLocationId))
		.where(eq(launchBooster.landingSuccess, true))
		.groupBy(landingLocation.id)
		.orderBy(desc(sql`count(*)`))
		.limit(1);

	return {
		mostFlownBooster: topFlown[0]
			? { serial: topFlown[0].serial, flights: topFlown[0].flights ?? 0 }
			: null,
		mostUsedLaunchpad: topPad[0] ? { name: topPad[0].name, total: topPad[0].total } : null,
		mostUsedDroneship: topShipResult[0]
			? { name: topShipResult[0].name, successes: topShipResult[0].successes }
			: null
	};
}

/* ---------- time series ---------- */

export type LaunchesPerYearRow = { year: string; count: number };

export async function launchesPerYear(db: AppDb): Promise<LaunchesPerYearRow[]> {
	return db
		.select({
			year: sql<string>`strftime('%Y', ${launch.net})`,
			count: sql<number>`count(*)`
		})
		.from(launch)
		.where(isNotNull(launch.net))
		.groupBy(sql`strftime('%Y', ${launch.net})`)
		.orderBy(asc(sql`strftime('%Y', ${launch.net})`));
}

export type LaunchesPerMonthRow = { month: string; count: number };

export async function launchesPerMonth24(db: AppDb): Promise<LaunchesPerMonthRow[]> {
	return db
		.select({
			month: sql<string>`strftime('%Y-%m', ${launch.net})`,
			count: sql<number>`count(*)`
		})
		.from(launch)
		.where(sql`${launch.net} >= date('now', '-24 months')`)
		.groupBy(sql`strftime('%Y-%m', ${launch.net})`)
		.orderBy(asc(sql`strftime('%Y-%m', ${launch.net})`));
}

export type LandingSuccessRateRow = { monthEnd: string; successRate: number };

export async function rollingLandingSuccessRate(db: AppDb): Promise<LandingSuccessRateRow[]> {
	// 36 monthly samples, each computing the 12-month rolling success rate.
	// Use a recursive CTE to generate the month-end series, then a correlated
	// subquery to compute the rolling rate for each.
	const rows = (await db.all(sql`
		WITH RECURSIVE month_ends(month_end, n) AS (
			SELECT date('now', 'start of month'), 0
			UNION ALL
			SELECT date(month_end, '-1 month'), n + 1 FROM month_ends WHERE n < 35
		)
		SELECT
			month_end AS monthEnd,
			(
				SELECT CASE WHEN SUM(CASE WHEN landing_attempted=1 THEN 1 ELSE 0 END) = 0
					THEN 0
					ELSE 1.0 * SUM(CASE WHEN landing_success=1 THEN 1 ELSE 0 END) /
						SUM(CASE WHEN landing_attempted=1 THEN 1 ELSE 0 END)
				END
				FROM launch_booster lb
				JOIN launch l ON l.id = lb.launch_id
				WHERE l.net BETWEEN date(month_end, '-12 months') AND month_end
			) AS rate
		FROM month_ends
		ORDER BY month_end ASC
	`)) as Array<{ monthEnd: string; rate: number | null }>;
	return rows.map((r) => ({ monthEnd: r.monthEnd, successRate: r.rate ?? 0 }));
}

export type FlightCountHistogramRow = { flights: number; boosters: number };

export async function flightCountHistogram(db: AppDb): Promise<FlightCountHistogramRow[]> {
	return db
		.select({
			flights: booster.flights,
			boosters: sql<number>`count(*)`
		})
		.from(booster)
		.groupBy(booster.flights)
		.orderBy(asc(booster.flights));
}
