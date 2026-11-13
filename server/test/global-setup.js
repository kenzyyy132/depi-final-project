// Starts a throwaway PostgreSQL (embedded-postgres) and applies the real migrations once per test run.
import { startDatabase } from './harness.js';

export default async function setup({ provide }) {
  const db = await startDatabase();
  provide('databaseUrl', db.url);
  return db.stop;
}
