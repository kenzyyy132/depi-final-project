// Shared test state: the cookie jar used by the fetch wrapper and direct database helpers.
import { inject } from 'vitest';
import { dbHelpers } from '../../server/test/harness.js';

export const cookieJar = new Map();
export const db = dbHelpers(inject('databaseUrl'));
