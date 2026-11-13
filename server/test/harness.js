// Test harness shared by the server tests and the React (jsdom) tests:
// a throwaway PostgreSQL + the real migrations + the real Express app on a random port.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { startLocalDb } from '../scripts/local-db.js';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { createMailer } from '../src/lib/mail.js';
import { hashPassword, randomToken, sha256 } from '../src/lib/security.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function startDatabase() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'nos-test-db-'));
  const port = 5500 + Math.floor(Math.random() * 400);
  const { pg, url } = await startLocalDb({ dir, port, database: 'nightops_test', quiet: true });
  const r = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`migrate deploy failed:\n${r.stdout}\n${r.stderr}`);
  return { url, stop: async () => { await pg.stop(); rmSync(dir, { recursive: true, force: true }); } };
}

/** Starts the API on a random local port against `dbUrl`. */
export async function startApi(dbUrl, env = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: dbUrl, APP_URL: 'http://localhost:3000', ...env });
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const mailer = createMailer(config);
  const app = createApp({ config, prisma, mailer, log: { info() {}, error: (...a) => console.error(...a) } });
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, mailer, stop: async () => { await new Promise((r) => server.close(r)); await prisma.$disconnect(); } };
}

/** Direct database helpers for tests (reset between tests, seed fixtures, mint a session). */
export function dbHelpers(dbUrl) {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const reset = () => prisma.$executeRawUnsafe('TRUNCATE "Task","ProjectMember","Project","PasswordReset","Session","User" CASCADE');
  const STATUS = { Opened: 'Opened', 'In Progress': 'InProgress', Completed: 'Completed' };

  /** Inserts users (password for all: `password`), projects (with memberIds) and tasks, using the app's record shapes. */
  async function seed({ users = [], projects = [], tasks = [], password = 'secret12', onboarded = true }) {
    const passwordHash = await hashPassword(password);
    for (const u of users) {
      await prisma.user.create({ data: { id: u.id, name: u.name, email: u.email, role: u.role, passwordHash, createdAt: u.createdAt ? new Date(u.createdAt) : undefined, onboardedAt: onboarded ? new Date() : null } });
    }
    for (const p of projects) {
      await prisma.project.create({
        data: {
          id: p.id, name: p.name, description: p.description || '', startDate: p.startDate, deadline: p.deadline, managerId: p.managerId, joinCode: p.joinCode,
          createdAt: p.createdAt ? new Date(p.createdAt) : undefined, members: { create: (p.memberIds || []).map((userId) => ({ userId })) },
        },
      });
    }
    for (const x of tasks) {
      await prisma.task.create({
        data: {
          id: x.id, title: x.title, description: x.description || '', projectId: x.projectId, assigneeId: x.assigneeId, startDate: x.startDate, deadline: x.deadline,
          priority: x.priority, status: STATUS[x.status], createdAt: x.createdAt ? new Date(x.createdAt) : undefined, completedAt: x.completedAt ? new Date(x.completedAt) : null,
        },
      });
    }
  }

  /** Creates a session for `userId` and returns the cookie token (what the browser would hold). */
  async function sessionFor(userId) {
    const token = randomToken();
    await prisma.session.create({ data: { id: `s-${token.slice(0, 12)}`, tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + 864e5) } });
    return token;
  }

  const STATUS_OUT = { Opened: 'Opened', InProgress: 'In Progress', Completed: 'Completed' };
  const tasksOf = async () => (await prisma.task.findMany({ orderBy: { createdAt: 'asc' } })).map((x) => ({ ...x, status: STATUS_OUT[x.status] }));
  return { prisma, reset, seed, sessionFor, tasksOf, close: () => prisma.$disconnect() };
}
