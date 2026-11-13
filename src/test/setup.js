import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';
import { afterAll, afterEach, beforeEach, inject } from 'vitest';
import { cleanup } from '@testing-library/react';
import { cookieJar, db } from './env';

if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
if (!window.matchMedia)
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.scrollTo = () => {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

// The app talks to the real API started in global-setup.js.
globalThis.__NOS_API__ = inject('apiUrl');

// A browser keeps cookies for us; Node's fetch doesn't — this small jar plays the browser's part
// (the session cookie is httpOnly, so app code never touches it either way).
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const headers = new Headers(opts.headers);
  if (cookieJar.size) headers.set('cookie', [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; '));
  const res = await realFetch(url, { ...opts, headers });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const k = pair.slice(0, i), v = pair.slice(i + 1);
    if (!v || /Expires=Thu, 01 Jan 1970/i.test(c)) cookieJar.delete(k);
    else cookieJar.set(k, v);
  }
  return res;
};

beforeEach(async () => {
  localStorage.clear();
  cookieJar.clear();
  await db.reset();
});
afterEach(() => cleanup());
afterAll(() => db.close());
