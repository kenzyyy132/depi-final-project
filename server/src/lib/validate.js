import { z } from 'zod';
import { badRequest } from './errors.js';

// Same email pattern as the registration form, so client and server agree.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const isRealDay = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const email = z.string().trim().toLowerCase().max(254).regex(EMAIL, 'emailInvalid');
export const day = z.string().regex(ISO_DAY, 'dateInvalid').refine(isRealDay, 'dateInvalid');
export const name = z.string().trim().min(1, 'nameRequired').max(100, 'tooLong');
export const password = (min) => z.string().min(min, 'passwordShort').max(200, 'tooLong');
export const role = z.enum(['manager', 'developer']);
export const priority = z.enum(['Low', 'Medium', 'High']);
export const status = z.enum(['Opened', 'In Progress', 'Completed']);
const id = z.string().trim().min(1).max(100);

const datesInOrder = (v) => v.startDate <= v.deadline;
const orderIssue = { message: 'deadlineBeforeStart', path: ['deadline'] };

export const schemas = (cfg) => ({
  register: z.object({ name, email, password: password(cfg.passwordMin), role }),
  login: z.object({ email, password: z.string().min(1, 'required').max(200) }),
  forgot: z.object({ email }),
  reset: z.object({ token: z.string().min(10).max(200), password: password(cfg.passwordMin) }),
  changePassword: z.object({ currentPassword: z.string().min(1).max(200), newPassword: password(cfg.passwordMin) }),
  profile: z.object({ name: name.optional(), onboarded: z.literal(true).optional() }),
  project: z
    .object({
      name: z.string().trim().min(1, 'projectNameRequired').max(120, 'tooLong'),
      description: z.string().max(4000, 'tooLong').optional().default(''),
      startDate: day,
      deadline: day,
    })
    .refine(datesInOrder, orderIssue),
  join: z.object({ code: z.string().max(40).optional().default('') }),
  invite: z.object({ email }),
  task: z
    .object({
      title: z.string().trim().min(1, 'titleRequired').max(200, 'tooLong'),
      description: z.string().max(8000, 'tooLong').optional().default(''),
      projectId: id,
      assigneeId: id,
      startDate: day,
      deadline: day,
      priority,
      status: status.optional().default('Opened'),
    })
    .refine(datesInOrder, orderIssue),
  status: z.object({ status }),
  import: z.object({
    data: z.object({
      users: z.array(z.object({ id, email: z.string().max(254), role: z.string().optional() }).passthrough()).max(5000),
      projects: z.array(z.object({}).passthrough()).max(5000),
      tasks: z.array(z.object({}).passthrough()).max(50000),
    }),
  }),
});

/** Parses `input` with `schema`; throws a 400 with per-field error codes on failure. */
export function parse(schema, input) {
  const r = schema.safeParse(input ?? {});
  if (r.success) return r.data;
  const fields = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message && /^[a-zA-Z]+$/.test(issue.message) ? issue.message : 'invalid';
  }
  throw badRequest('validation', 'Some fields are missing or invalid.', { fields });
}

export const isDay = (s) => typeof s === 'string' && ISO_DAY.test(s) && isRealDay(s);
