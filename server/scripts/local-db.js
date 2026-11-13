// Local development database: a real PostgreSQL started from the `embedded-postgres` npm package.
// Used only when no DATABASE_URL is configured. Data lives in server/.local-db (git-ignored).
// Never used in production — production always uses DATABASE_URL.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_DB = {
  dir: path.resolve(here, '..', '.local-db'),
  port: Number(process.env.LOCAL_DB_PORT || 5433),
  user: 'nightops',
  password: 'nightops-local-only',
  database: 'nightops',
};
export const localUrl = (db = LOCAL_DB.database) =>
  `postgresql://${LOCAL_DB.user}:${LOCAL_DB.password}@127.0.0.1:${LOCAL_DB.port}/${db}?schema=public`;

export async function startLocalDb({ dir = LOCAL_DB.dir, port = LOCAL_DB.port, database = LOCAL_DB.database, quiet = false } = {}) {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const pg = new EmbeddedPostgres({
    databaseDir: dir, port, user: LOCAL_DB.user, password: LOCAL_DB.password, persistent: true,
    onLog: () => {}, onError: (m) => { if (!quiet) console.error(String(m)); },
  });
  if (!existsSync(path.join(dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase(database); } catch { /* already exists */ }
  return { pg, url: `postgresql://${LOCAL_DB.user}:${LOCAL_DB.password}@127.0.0.1:${port}/${database}?schema=public` };
}

// `npm run db:local` — run the local database in the foreground.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { pg, url } = await startLocalDb();
  console.log(`Local PostgreSQL running.\nDATABASE_URL=${url}\nPress Ctrl+C to stop.`);
  const stop = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
