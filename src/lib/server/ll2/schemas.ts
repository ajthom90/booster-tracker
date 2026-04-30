import { z } from 'zod';

const paginatedEnvelope = <T extends z.ZodType>(item: T) =>
	z.object({
		count: z.number(),
		next: z.string().nullable(),
		previous: z.string().nullable(),
		results: z.array(item)
	});

// ---------- Pad ----------
export const ll2PadSchema = z.object({
	id: z.number(),
	name: z.string(),
	location: z
		.object({
			name: z.string().optional(),
			country_code: z.string().optional()
		})
		.nullable()
		.optional(),
	total_launch_count: z.number().nullable().optional(),
	map_image: z.string().nullable().optional(),
	url: z.string().optional()
});
export type Ll2Pad = z.infer<typeof ll2PadSchema>;
export const ll2PadListSchema = paginatedEnvelope(ll2PadSchema);

// ---------- Launcher Config ----------
export const ll2LauncherConfigSchema = z.object({
	id: z.number(),
	name: z.string(),
	family: z.string().nullable().optional(),
	full_name: z.string().nullable().optional(),
	variant: z.string().nullable().optional(),
	description: z.string().nullable().optional()
});
export type Ll2LauncherConfig = z.infer<typeof ll2LauncherConfigSchema>;

// ---------- Launcher (Booster) ----------
export const ll2LauncherSchema = z.object({
	id: z.number(),
	url: z.string().optional(),
	flight_proven: z.boolean().optional(),
	serial_number: z.string(),
	status: z.string(),
	details: z.string().nullable().optional(),
	launcher_config: ll2LauncherConfigSchema.nullable().optional(),
	image_url: z.string().nullable().optional(),
	flights: z.number().nullable().optional(),
	last_launch_date: z.string().nullable().optional(),
	first_launch_date: z.string().nullable().optional(),
	attempted_landings: z.number().nullable().optional(),
	successful_landings: z.number().nullable().optional()
});
export type Ll2Launcher = z.infer<typeof ll2LauncherSchema>;
export const ll2LauncherListSchema = paginatedEnvelope(ll2LauncherSchema);

// ---------- Landing location ----------
export const ll2LandingLocationSchema = z.object({
	id: z.number(),
	name: z.string(),
	abbrev: z.string().optional(),
	description: z.string().nullable().optional(),
	location: z.object({ name: z.string().optional() }).nullable().optional(),
	successful_landings: z.union([z.number(), z.string()]).optional(),
	attempted_landings: z.union([z.number(), z.string()]).optional()
});
export type Ll2LandingLocation = z.infer<typeof ll2LandingLocationSchema>;

// ---------- Landing (nested in launcher_stage) ----------
export const ll2LandingSchema = z.object({
	attempt: z.boolean().optional(),
	success: z.boolean().nullable().optional(),
	description: z.string().optional(),
	location: ll2LandingLocationSchema.nullable().optional(),
	type: z.object({ name: z.string().optional(), abbrev: z.string().optional() }).optional()
});
export type Ll2Landing = z.infer<typeof ll2LandingSchema>;

// ---------- Launcher stage (per-booster on a launch) ----------
export const ll2LauncherStageSchema = z.object({
	id: z.number().optional(),
	type: z.string().optional(), // 'core', 'side', or omitted on Falcon 9
	reused: z.boolean().nullable().optional(),
	launcher_flight_number: z.number().nullable().optional(),
	launcher: ll2LauncherSchema.partial().extend({ id: z.number(), serial_number: z.string() }),
	landing: ll2LandingSchema.nullable().optional()
});
export type Ll2LauncherStage = z.infer<typeof ll2LauncherStageSchema>;

// ---------- Launch ----------
export const ll2LaunchSchema = z.object({
	id: z.string(),
	url: z.string().optional(),
	slug: z.string().optional(),
	name: z.string(),
	status: z.object({ id: z.number(), name: z.string(), abbrev: z.string().optional() }),
	net: z.string(),
	window_start: z.string().nullable().optional(),
	window_end: z.string().nullable().optional(),
	image: z.string().nullable().optional(),
	webcast_live: z.boolean().optional(),
	vidURLs: z.array(z.object({ url: z.string() })).optional(),
	pad: ll2PadSchema.nullable().optional(),
	mission: z
		.object({
			name: z.string().optional(),
			description: z.string().optional(),
			type: z.string().optional(),
			orbit: z.object({ name: z.string().optional() }).nullable().optional()
		})
		.nullable()
		.optional(),
	rocket: z
		.object({
			configuration: z
				.object({
					id: z.number().optional(),
					name: z.string().optional(),
					full_name: z.string().optional()
				})
				.optional(),
			launcher_stage: z.array(ll2LauncherStageSchema).optional()
		})
		.optional(),
	launch_service_provider: z.object({ id: z.number(), name: z.string() }).optional()
});
export type Ll2Launch = z.infer<typeof ll2LaunchSchema>;
export const ll2LaunchListSchema = paginatedEnvelope(ll2LaunchSchema);
