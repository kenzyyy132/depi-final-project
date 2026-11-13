// `npm run dev` — runs the whole stack for local development:
//   API  (server/, port 4000, local PostgreSQL started automatically if DATABASE_URL is unset)
//   Web  (Vite, port 5173, proxies /api to the API)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(path.join(root, 'server', 'node_modules'))) {
  console.error('Server dependencies are missing. Run:  npm --prefix server install');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const procs = [];
const run = (name, color, cmd, args, cwd) => {
  const child = spawn(cmd, args, { cwd, shell: isWin, env: process.env });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      lines.forEach((l) => out.write(tag + l + '\n'));
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${tag}exited with code ${code}`);
    shutdown(code ?? 0);
  });
  procs.push(child);
};

let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  for (const p of procs) {
    if (p.exitCode !== null) continue;
    if (isWin) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
    else p.kill('SIGINT');
  }
  setTimeout(() => process.exit(code), 1500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('api', '31', 'npm', ['run', 'dev'], path.join(root, 'server'));
run('web', '90', 'npx', ['vite', ...process.argv.slice(2)], root);
