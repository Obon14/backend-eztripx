import { Pool, type PoolConfig } from "pg";

/** Managed Postgres (e.g. DigitalOcean) requires SSL; self-signed CA needs rejectUnauthorized: false. */
export function createPgPool(connectionString: string, extra?: PoolConfig): Pool {
  const isLocal = /(?:@|\/)localhost(?::|\/|$)|127\.0\.0\.1/.test(connectionString);
  const sslDisabled = /sslmode=disable/i.test(connectionString);

  return new Pool({
    connectionString,
    ...extra,
    ...(!isLocal && !sslDisabled
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });
}
