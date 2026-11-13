import { inject } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { createMailer } from '../src/lib/mail.js';

export function setupApp(overrides = {}) {
  const url = inject('databaseUrl');
  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: url, APP_URL: 'http://app.test', ...overrides });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const mailer = createMailer(config);
  const app = createApp({ config, prisma, mailer, log: { info() {}, error() {} } });
  const reset = () => prisma.$executeRawUnsafe('TRUNCATE "Task","ProjectMember","Project","PasswordReset","Session","User" CASCADE');
  return { app, prisma, mailer, config, reset };
}

/** A logged-in browser: keeps its cookies and always sends the client header. */
export function agent(app) {
  const a = request.agent(app);
  const wrap = (m) => (url) => a[m](url).set('X-Requested-With', 'NightOps');
  return { get: (u) => a.get(u), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete'), raw: a };
}

export async function registered(app, { name = 'Mona Manager', email, password = 'correct-horse', role = 'manager' }) {
  const a = agent(app);
  const res = await a.post('/api/auth/register').send({ name, email, password, role });
  if (res.status !== 201) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
  return { a, user: res.body.user };
}
