// `npm run dev` (server): loads server/.env, starts a local PostgreSQL if DATABASE_URL is not set,
// applies migrations, then runs the API with auto-restart on file changes.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLocalDb } from './local-db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

let pg;
if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL set — starting the local development database (server/.local-db)…');
  const local = await startLocalDb();
  pg = local.pg;
  process.env.DATABASE_URL = local.url;
}

const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
const migrate = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: root, stdio: 'inherit', env: process.env });
if (migrate.status !== 0) {
  await pg?.stop();
  process.exit(migrate.status ?? 1);
}

const child = spawn(process.execPath, ['--watch-path=src', 'src/index.js'], { cwd: root, stdio: 'inherit', env: process.env });
const stop = async (code = 0) => {
  child.kill('SIGTERM');
  await pg?.stop().catch(() => {});
  process.exit(code);
};
child.on('exit', (code) => stop(code ?? 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
