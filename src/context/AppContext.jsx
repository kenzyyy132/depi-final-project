import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API, onAuthLost } from '../api/client';
import { uid } from '../utils/storage';
import { useI18n } from '../i18n/I18nProvider';

// App state now comes from the Night Ops Scheduler API (PostgreSQL). The value exposed here keeps the
// original names and record shapes (user, users, projects, tasks, myProjects, myTasks, actions…), so
// pages keep working; actions are async and resolve only after the server has accepted the change.

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const EMPTY = { users: [], projects: [], tasks: [], busy: [] };
const POLL_MS = 30000;

export function AppProvider({ children }) {
  const { t, te } = useI18n();
  const [phase, setPhase] = useState('boot'); // boot | ready | offline
  const [bootError, setBootError] = useState(null);
  const [user, setUser] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [toasts, setToasts] = useState([]);
  const [sessionNotice, setSessionNotice] = useState(null); // 'expired' | null
  const [serverConfig, setServerConfig] = useState({ mail: 'console', passwordMin: 8 });
  const userRef = useRef(null);
  userRef.current = user;
  const lastSync = useRef(0);

  // Toast queue: each toast has its own id and timer, so an old timer can never dismiss a newer toast.
  const dismissToast = useCallback((id) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);
  const notify = useCallback((text, type = 'success') => {
    const id = uid();
    setToasts((ts) => [...ts.slice(-2), { id, text, type }]);
    setTimeout(() => dismissToast(id), type === 'error' ? 5000 : 3500);
  }, [dismissToast]);
  // A 401 is explained on the login screen ("session expired"), so it doesn't also get a toast.
  const fail = useCallback((err) => { if (err?.status !== 401) notify(te(err), 'error'); return false; }, [notify, te]);

  const applyState = useCallback((s) => {
    setUser(s.user);
    setData({ users: s.users, projects: s.projects, tasks: s.tasks, busy: s.busy || [] });
    lastSync.current = Date.now();
  }, []);

  const refresh = useCallback(async () => {
    if (!userRef.current) return;
    try {
      applyState(await API.state());
    } catch {
      /* 401 is handled by onAuthLost; other errors keep the last good data */
    }
  }, [applyState]);

  const signedOut = useCallback(() => {
    setUser(null);
    setData(EMPTY);
  }, []);

  // ---------- Boot: restore the session from the httpOnly cookie ----------
  const boot = useCallback(async () => {
    setPhase('boot');
    API.config().then(setServerConfig).catch(() => {});
    window.__boot?.step(1); // "Restoring your session"
    try {
      const { user: me, expired } = await API.me();
      if (!me) {
        signedOut();
        if (expired) setSessionNotice('expired');
      } else {
        window.__boot?.step(2); // "Preparing your schedule"
        setUser(me);
        applyState(await API.state());
      }
      setPhase('ready');
    } catch (e) {
      if (e.status === 401) {
        signedOut();
        setPhase('ready');
      } else {
        setBootError(e);
        setPhase('offline');
      }
    }
    window.__nosAppReady?.();
  }, [applyState, signedOut]);
  useEffect(() => { boot(); }, [boot]);

  // ---------- Expired / revoked sessions ----------
  useEffect(() => onAuthLost(() => {
    if (!userRef.current) return;
    signedOut();
    setSessionNotice('expired');
  }), [signedOut]);

  // ---------- Keep shared project data fresh for every collaborator ----------
  useEffect(() => {
    if (!user) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') refresh(); };
    const onFocus = () => { if (Date.now() - lastSync.current > 5000) refresh(); };
    const id = setInterval(tick, POLL_MS);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Derived data (same rules as before) ----------
  const { users, projects, tasks, busy } = data;
  const isManager = user?.role === 'manager';
  const myProjects = useMemo(
    () => (!user ? [] : projects.filter((p) => (isManager ? p.managerId === user.id : p.memberIds.includes(user.id)))),
    [user, projects, isManager]
  );
  const myTasks = useMemo(() => {
    if (!user) return [];
    const ids = new Set(myProjects.map((p) => p.id));
    return tasks.filter((x) => ids.has(x.projectId) && (isManager || x.assigneeId === user.id));
  }, [user, tasks, myProjects, isManager]);
  const userName = useCallback((id) => users.find((u) => u.id === id)?.name ?? 'Unknown', [users]);
  const projectName = useCallback((id) => projects.find((p) => p.id === id)?.name ?? 'Unknown', [projects]);

  const putTask = (task) => setData((d) => ({ ...d, tasks: d.tasks.some((x) => x.id === task.id) ? d.tasks.map((x) => (x.id === task.id ? task : x)) : [...d.tasks, task] }));
  const putProject = (project) => setData((d) => ({ ...d, projects: d.projects.some((x) => x.id === project.id) ? d.projects.map((x) => (x.id === project.id ? project : x)) : [...d.projects, project] }));

  // ---------- Auth (return an error message string, or null on success) ----------
  const afterAuth = async (me) => {
    setSessionNotice(null);
    setUser(me);
    try { applyState(await API.state()); } catch { /* shown on next refresh */ }
  };
  const register = async ({ name, email, password, role }) => {
    try {
      const { user: me } = await API.register({ name, email, password, role });
      await afterAuth(me);
      return null;
    } catch (e) {
      return te(e);
    }
  };
  const login = async (email, password) => {
    try {
      const { user: me } = await API.login({ email, password });
      await afterAuth(me);
      return null;
    } catch (e) {
      return te(e);
    }
  };
  const logout = async () => {
    try { await API.logout(); } catch { /* the local sign-out still happens */ }
    signedOut();
  };
  const forgotPassword = (email) => API.forgot(email);
  const resetPassword = async (token, password) => {
    const { user: me } = await API.reset(token, password);
    await afterAuth(me);
    return me;
  };
  const changePassword = async (current, next) => {
    await API.changePassword(current, next);
    return true;
  };

  // ---------- Projects ----------
  const saveProject = async (form) => {
    if (!isManager) return null;
    const body = { name: form.name, description: form.description || '', startDate: form.startDate, deadline: form.deadline };
    try {
      const { project } = form.id ? await API.updateProject(form.id, body) : await API.createProject(body);
      putProject(project);
      return project;
    } catch (e) {
      fail(e);
      return null;
    }
  };
  const deleteProject = async (id) => {
    try {
      await API.deleteProject(id);
      setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id), tasks: d.tasks.filter((x) => x.projectId !== id) }));
      return true;
    } catch (e) {
      return fail(e);
    }
  };
  const joinProject = async (code) => {
    try {
      const { project } = await API.join(code);
      putProject(project);
      refresh();
      return { project };
    } catch (e) {
      return { error: te(e) };
    }
  };
  const inviteByEmail = (projectId, email) => API.invite(projectId, email);
  const lookupInvite = (code) => API.lookupInvite(code);

  // ---------- Tasks ----------
  const taskBody = (x) => ({
    title: x.title, description: x.description || '', projectId: x.projectId, assigneeId: x.assigneeId,
    startDate: x.startDate, deadline: x.deadline, priority: x.priority, status: x.status || 'Opened',
  });
  const saveTask = async (form) => {
    const p = myProjects.find((x) => x.id === form.projectId);
    if (!isManager || !p || !p.memberIds.includes(form.assigneeId)) return false;
    const prev = form.id ? tasks.find((x) => x.id === form.id) : null;
    if (prev) putTask({ ...prev, ...form }); // optimistic for edits/drags; reverted on failure
    try {
      const { task } = form.id ? await API.updateTask(form.id, taskBody({ ...prev, ...form })) : await API.createTask(taskBody(form));
      putTask(task);
      return true;
    } catch (e) {
      if (prev) putTask(prev);
      return fail(e);
    }
  };
  const deleteTask = async (id) => {
    try {
      await API.deleteTask(id);
      setData((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));
      return true;
    } catch (e) {
      return fail(e);
    }
  };
  // Only the assigned developer can change a task's status (enforced by the server too).
  const setStatus = async (id, status) => {
    const prev = tasks.find((x) => x.id === id);
    if (!prev || prev.assigneeId !== user?.id) return false;
    putTask({ ...prev, status });
    try {
      const { task } = await API.setStatus(id, status);
      putTask(task);
      return true;
    } catch (e) {
      putTask(prev);
      return fail(e);
    }
  };

  // ---------- Profile & onboarding ----------
  const updateProfile = async ({ name }) => {
    if (!user) return t('api.unauthenticated');
    if (!(name || '').trim()) return 'Full name is required.';
    try {
      const { user: me } = await API.updateMe({ name: name.trim() });
      setUser(me);
      setData((d) => ({ ...d, users: d.users.map((u) => (u.id === me.id ? me : u)) }));
      return null;
    } catch (e) {
      return te(e);
    }
  };
  const completeOnboarding = async () => {
    try {
      const { user: me } = await API.updateMe({ onboarded: true });
      setUser(me);
    } catch (e) {
      fail(e);
    }
  };

  // ---------- Export / import ----------
  const exportBackup = () => API.exportData();
  const importBackup = async (fileData) => {
    const { report } = await API.importData(fileData);
    await refresh();
    return report;
  };

  const value = {
    phase, bootError, boot, refresh, serverConfig, sessionNotice, clearSessionNotice: () => setSessionNotice(null),
    user, users, projects, tasks, busy, myProjects, myTasks, toasts, notify, dismissToast, userName, projectName,
    register, login, logout, forgotPassword, resetPassword, changePassword,
    saveProject, deleteProject, joinProject, inviteByEmail, lookupInvite,
    saveTask, deleteTask, setStatus, updateProfile, completeOnboarding, exportBackup, importBackup,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
