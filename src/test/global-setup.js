// React tests run against the real stack: PostgreSQL (embedded, throwaway) + migrations + the Express API.
import { startApi, startDatabase } from '../../server/test/harness.js';

export default async function setup({ provide }) {
  const db = await startDatabase();
  const api = await startApi(db.url);
  provide('apiUrl', api.url);
  provide('databaseUrl', db.url);
  return async () => {
    await api.stop();
    await db.stop();
  };
}
