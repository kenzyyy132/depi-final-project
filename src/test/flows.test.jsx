import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';
import { PASSWORD, seed, storedTasks } from './seed';
import { cookieJar, db } from './env';

// Critical user journeys, through the real UI, the real API and a real PostgreSQL database.
const user = () => userEvent.setup();
const projectsInDb = () => db.prisma.project.findMany({ include: { members: true }, orderBy: { createdAt: 'asc' } });

describe('public site', () => {
  it('introduces the product and leads to registration', async () => {
    const u = user();
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /run every deadline like a mission/i })).toBeInTheDocument();
    await u.click(screen.getAllByRole('link', { name: /create your account/i })[0]);
    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeInTheDocument();
  });

  it('shows a project invitation to signed-out visitors', async () => {
    await seed();
    renderApp('/join/apl-234');
    expect(await screen.findByRole('heading', { name: /join “apollo”/i })).toBeInTheDocument();
    expect(screen.getByText(/Mona Manager invited you/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create developer account/i })).toHaveAttribute('href', '/register?invite=APL234');
  });
});

describe('auth', () => {
  it('validates registration and rejects duplicate emails (server message)', async () => {
    await seed();
    const u = user();
    renderApp('/register');
    await u.click(await screen.findByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();

    await u.type(screen.getByLabelText('Full name'), 'New Person');
    await u.type(screen.getByLabelText('Email'), 'MONA@x.io');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.type(screen.getByLabelText('Confirm password'), 'secret124');
    await u.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();

    await u.clear(screen.getByLabelText('Confirm password'));
    await u.type(screen.getByLabelText('Confirm password'), 'secret123');
    await u.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  });

  it('registers a manager, runs onboarding (first project + invite code) and lands in the project', async () => {
    const u = user();
    renderApp('/register?role=manager');
    await u.type(await screen.findByLabelText('Full name'), 'Pat Lead');
    await u.type(screen.getByLabelText('Email'), 'pat@x.io');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.type(screen.getByLabelText('Confirm password'), 'secret123');
    expect(screen.getByRole('radio', { name: /project manager/i })).toBeChecked();
    await u.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('heading', { name: /set up your first operation/i })).toBeInTheDocument();
    const stored = await db.prisma.user.findUnique({ where: { email: 'pat@x.io' } });
    expect(stored).toMatchObject({ name: 'Pat Lead', role: 'manager', onboardedAt: null });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(cookieJar.has('nos_session')).toBe(true);

    await u.click(screen.getByRole('button', { name: /let’s start/i }));
    await u.click(await screen.findByRole('button', { name: /new project/i }));
    const dlg = await screen.findByRole('dialog');
    await u.type(within(dlg).getByLabelText('Project name'), 'Orion');
    await u.click(within(dlg).getByRole('button', { name: /create project/i }));
    expect(await screen.findByText('Orion')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /^next$/i }));

    const [project] = await projectsInDb();
    expect(project).toMatchObject({ name: 'Orion', managerId: stored.id });
    expect(await screen.findByText(`${window.location.origin}/join/${project.joinCode}`)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /open project/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Orion' })).toBeInTheDocument();
    expect((await db.prisma.user.findUnique({ where: { id: stored.id } })).onboardedAt).not.toBeNull();
  });

  it('registers a developer from an invitation and joins the project during onboarding', async () => {
    await seed();
    const u = user();
    renderApp('/register?invite=APL234');
    expect(await screen.findByText(/You were invited to a project \(code APL234\)/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^developer/i })).toBeChecked();
    await u.type(screen.getByLabelText('Full name'), 'Neo Dev');
    await u.type(screen.getByLabelText('Email'), 'neo@x.io');
    await u.type(screen.getByLabelText('Password'), 'secret123');
    await u.type(screen.getByLabelText('Confirm password'), 'secret123');
    await u.click(screen.getByRole('button', { name: /create account/i }));
    await u.click(await screen.findByRole('button', { name: /let’s start/i }));
    expect(await screen.findByLabelText('Join code')).toHaveValue('APL234');
    await u.click(screen.getByRole('button', { name: /^join project$/i }));
    expect(await screen.findByRole('heading', { name: /welcome to apollo/i })).toBeInTheDocument();
    const neo = await db.prisma.user.findUnique({ where: { email: 'neo@x.io' } });
    expect((await projectsInDb())[0].members.map((m) => m.userId)).toContain(neo.id);
  });

  it('rejects a wrong password, accepts the right one, and logs out', async () => {
    await seed();
    const u = user();
    renderApp('/login');
    await u.type(await screen.findByLabelText('Email'), 'dev1@x.io');
    await u.type(screen.getByLabelText('Password'), 'nope1234');
    await u.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    await u.clear(screen.getByLabelText('Password'));
    await u.type(screen.getByLabelText('Password'), PASSWORD);
    await u.click(screen.getByRole('button', { name: /^log in$/i }));
    expect((await screen.findAllByText(/Dev One/)).length).toBeGreaterThan(0);
    expect(await db.prisma.session.count({ where: { userId: 'd1' } })).toBe(1);
    await u.click(screen.getByRole('button', { name: /profile menu for dev one/i }));
    await u.click(await screen.findByRole('menuitem', { name: /log out/i }));
    expect(await screen.findByRole('button', { name: /^log in$/i })).toBeInTheDocument();
    await waitFor(async () => expect(await db.prisma.session.count({ where: { userId: 'd1' } })).toBe(0));
  });

  it('sends a password-reset request and explains development delivery honestly', async () => {
    await seed();
    const u = user();
    renderApp('/login');
    await u.click(await screen.findByRole('link', { name: /forgot password/i }));
    await u.type(await screen.findByLabelText('Email'), 'dev1@x.io');
    await u.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByText(/Development mode: no email is sent/)).toBeInTheDocument();
    expect(await db.prisma.passwordReset.count({ where: { userId: 'd1' } })).toBe(1);
  });

  it('tells the user when their session has expired', async () => {
    await seed({ session: 'm1' });
    const u = user();
    renderApp('/manager/projects');
    expect(await screen.findByRole('heading', { level: 1, name: /projects/i })).toBeInTheDocument();
    await db.prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await u.click(screen.getByRole('button', { name: /delete project apollo/i }));
    await u.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /delete/i }));
    expect(await screen.findByText(/your session has expired/i)).toBeInTheDocument(); // one message, on the login screen
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
    expect(await projectsInDb()).toHaveLength(2); // nothing was deleted
  });
});

describe('route guards', () => {
  it('sends logged-out users to login', async () => {
    await seed();
    renderApp('/manager/tasks');
    expect(await screen.findByRole('button', { name: /^log in$/i })).toBeInTheDocument();
  });
  it('sends a developer away from manager routes', async () => {
    await seed({ session: 'd1' });
    renderApp('/manager/projects');
    expect((await screen.findAllByText(/Dev One/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument();
  });
});

describe('projects', () => {
  it('deletes a project together with its tasks after confirmation', async () => {
    await seed({ session: 'm1' });
    const u = user();
    renderApp('/manager/projects');
    await u.click(await screen.findByRole('button', { name: /delete project apollo/i }));
    const dlg = await screen.findByRole('alertdialog');
    await u.click(within(dlg).getByRole('button', { name: /delete/i }));
    await waitFor(async () => expect((await projectsInDb()).map((p) => p.id)).toEqual(['p2']));
    expect(await storedTasks()).toEqual([]);
    expect(await screen.findByText('Project deleted.')).toBeInTheDocument();
  });
});

describe('join workflow', () => {
  it('handles empty, invalid, valid codes', async () => {
    await seed({ session: 'd3' });
    const u = user();
    renderApp('/developer/join');
    const input = await screen.findByLabelText('Join code');
    const submit = () => u.click(screen.getByRole('button', { name: /^join project$/i }));
    await submit();
    expect(await screen.findByText('Please enter a join code.')).toBeInTheDocument();
    await u.type(input, 'ZZZZZZ');
    await submit();
    expect(await screen.findByText('Invalid join code. Check it and try again.')).toBeInTheDocument();
    await u.clear(input);
    await u.type(input, 'apl-234');
    await submit();
    expect(await screen.findByRole('heading', { name: /welcome to apollo/i })).toBeInTheDocument();
    expect((await projectsInDb())[0].members.map((m) => m.userId)).toContain('d3');
  });
  it('rejects joining twice', async () => {
    await seed({ session: 'd1' });
    const u = user();
    renderApp('/developer/join');
    await u.type(await screen.findByLabelText('Join code'), 'APL234');
    await u.click(screen.getByRole('button', { name: /^join project$/i }));
    expect(await screen.findByText('You have already joined this project.')).toBeInTheDocument();
  });
});

describe('tasks', () => {
  it('detects a conflict and saves only after "Save anyway"', async () => {
    await seed({ session: 'm1' });
    const u = user();
    renderApp('/manager/tasks');
    await u.click(await screen.findByRole('button', { name: /new task/i }));
    const dlg = await screen.findByRole('dialog');
    const q = within(dlg);
    await u.click(q.getByRole('button', { name: /create task/i }));
    expect(await q.findByText('Title is required.')).toBeInTheDocument();
    expect(q.getByText('Assign the task to a project member.')).toBeInTheDocument();

    await u.type(q.getByLabelText('Title'), 'Overlap work');
    await u.selectOptions(q.getByLabelText('Assign to'), 'd1');
    await u.clear(q.getByLabelText('Start date'));
    await u.type(q.getByLabelText('Start date'), '2026-11-15');
    await u.clear(q.getByLabelText('Deadline'));
    await u.type(q.getByLabelText('Deadline'), '2026-11-14');
    await u.click(q.getByRole('button', { name: /create task/i }));
    expect(await q.findByText('Deadline cannot be before the start date.')).toBeInTheDocument();

    await u.clear(q.getByLabelText('Deadline'));
    await u.type(q.getByLabelText('Deadline'), '2026-11-18');
    await u.click(q.getByRole('button', { name: /create task/i }));
    expect((await q.findAllByText(/Design API/)).length).toBeGreaterThan(0);
    expect(await storedTasks()).toHaveLength(2);
    await u.click(q.getByRole('button', { name: /save anyway/i }));
    await waitFor(async () => expect(await storedTasks()).toHaveLength(3));
    expect((await storedTasks())[2]).toMatchObject({ title: 'Overlap work', assigneeId: 'd1', projectId: 'p1', startDate: '2026-11-15', deadline: '2026-11-18', priority: 'Medium', status: 'Opened' });
    expect(await screen.findByText('Task created.')).toBeInTheDocument();
  });

  it('lets a developer change only their own task status, and records completion', async () => {
    await seed({ session: 'd1' });
    const u = user();
    renderApp('/developer/tasks/t1');
    await u.click(await screen.findByRole('radio', { name: /completed/i }));
    await waitFor(async () => expect((await storedTasks()).find((x) => x.id === 't1').status).toBe('Completed'));
    const all = await storedTasks();
    expect(all.find((x) => x.id === 't1').completedAt).not.toBeNull();
    expect(all.find((x) => x.id === 't2').status).toBe('Opened');
    renderApp('/developer/tasks/t2');
    expect(await screen.findByText(/not found or is not assigned to you/i)).toBeInTheDocument();
  });
});
