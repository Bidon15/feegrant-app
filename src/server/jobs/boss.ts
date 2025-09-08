import PgBoss from "pg-boss";
import { env } from "~/env";

export const boss = new PgBoss({ 
  connectionString: env.DATABASE_URL,
  max: 2, // Limit connection pool size
  retryLimit: 2,
  retryDelay: 1000
});
