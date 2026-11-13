import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useApp } from './context/AppContext';
import { useI18n } from './i18n/I18nProvider';
import AppLayout from './layouts/AppLayout';
import { RouteLoader } from './layouts/RouteLoader';
import { Button, ToastRegion } from './components/ui';
import { Ambient } from './components/brand/Ambient';
import { ChronoRing } from './components/brand/ChronoRing';

// Pages are code-split; the route loader appears only while a chunk is really downloading.
const page = (loader, name = 'default') => lazy(() => loader().then((m) => ({ default: m[name] })));
const Landing = page(() => import('./pages/Landing'));
const Login = page(() => import('./pages/Auth'), 'Login');
const Register = page(() => import('./pages/Auth'), 'Register');
const ForgotPassword = page(() => import('./pages/Auth'), 'ForgotPassword');
const ResetPassword = page(() => import('./pages/Auth'), 'ResetPassword');
const Onboarding = page(() => import('./pages/Onboarding'));
const Invite = page(() => import('./pages/Invite'));
const Dashboard = page(() => import('./pages/Dashboard'));
const Projects = page(() => import('./pages/Projects'));
const ProjectDetails = page(() => import('./pages/ProjectDetails'));
const Tasks = page(() => import('./pages/Tasks'));
const TaskDetails = page(() => import('./pages/TaskDetails'));
const TeamCalendar = page(() => import('./pages/CalendarPages'), 'TeamCalendar');
const MyCalendar = page(() => import('./pages/CalendarPages'), 'MyCalendar');
const DeveloperSchedule = page(() => import('./pages/Team'), 'DeveloperSchedule');
const DeveloperTeam = page(() => import('./pages/Team'), 'DeveloperTeam');
const MyProjects = page(() => import('./pages/DeveloperProjects'), 'MyProjects');
const JoinProject = page(() => import('./pages/DeveloperProjects'), 'JoinProject');
const Reports = page(() => import('./pages/Reports'));
const Settings = page(() => import('./pages/Settings'));
const NotFound = page(() => import('./pages/NotFound'));

// Logged out → login (remembering where you were going); wrong role → own dashboard;
// first visit after registering → onboarding.
function Guard({ role }) {
  const { user } = useApp();
  const loc = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  if (!user.onboardedAt) return <Navigate to="/welcome" replace />;
  return <AppLayout />;
}

/** Shown when the API can't be reached at startup (instead of pretending to be signed out). */
function Offline() {
  const { boot, bootError } = useApp();
  const { t, te } = useI18n();
  // "Can't reach" only when the network really failed; otherwise say what the server answered.
  const reachable = bootError && bootError.code !== 'network';
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="notch anim-page w-full max-w-md p-8 text-center">
        <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center">
          <ChronoRing size={64} />
          <WifiOff size={20} className="absolute -bottom-1 end-0 rounded-full bg-surface p-0.5 text-accent-fg" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-semibold">{reachable ? t('offline.errorTitle') : t('offline.title')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{reachable ? te(bootError) : t('offline.text')}</p>
        <Button className="mt-6" onClick={boot}><RefreshCw size={15} aria-hidden /> {t('offline.retry')}</Button>
      </div>
    </main>
  );
}

export default function App() {
  const { phase, toasts, dismissToast } = useApp();
  return (
    <>
      <Ambient />
      {phase === 'boot' ? (
        <RouteLoader />
      ) : phase === 'offline' ? (
        <Offline />
      ) : (
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/join/:code" element={<Invite />} />
            <Route path="/manager" element={<Guard role="manager" />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="calendar" element={<TeamCalendar />} />
              <Route path="schedule" element={<DeveloperSchedule />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/developer" element={<Guard role="developer" />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<MyProjects />} />
              <Route path="join" element={<JoinProject />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="tasks/:id" element={<TaskDetails />} />
              <Route path="calendar" element={<MyCalendar />} />
              <Route path="team" element={<DeveloperTeam />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      )}
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
