import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from './schema';

/** Application Drizzle DB handle, typed against our full schema. */
export type AppDb = BetterSQLite3Database<typeof schema>;
