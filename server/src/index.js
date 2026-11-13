import { PrismaClient } from '@prisma/client';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { createMailer } from './lib/mail.js';

let config;
try {
  config = loadConfig();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
const mailer = createMailer(config);
const app = createApp({ config, prisma, mailer });

const server = app.listen(config.port, () => {
  console.log(`Night Ops Scheduler API listening on port ${config.port} (${config.env})`);
  console.log(`  mail: ${mailer.mode}${mailer.mode === 'console' ? ' (emails are printed here)' : ''}`);
  console.log(`  client: ${app.locals.hasClient ? 'served from this server' : 'not served (API only)'}`);
});

// Remove expired sessions once at start and then every 6 hours.
const purge = () => app.locals.sessions.purgeExpired().catch((e) => console.error('Session purge failed', e));
purge();
const timer = setInterval(purge, 6 * 60 * 60 * 1000);
timer.unref();

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
