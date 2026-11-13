import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, Keyboard, Monitor, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar, Button, Dialog, Field, Kbd, Segmented } from '../components/ui';
import { PageHeader } from '../components/domain/Common';
import { downloadJSON, parseBackup } from '../utils/backup';
import { today } from '../utils/scheduling';

function Section({ id, title, text, children, i = 0 }) {
  return (
    <section id={id} className="panel anim-in scroll-mt-24 p-5 sm:p-6" style={{ '--i': i }} aria-labelledby={`${id}-t`}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-8">
        <div>
          <h2 id={`${id}-t`} className="font-display text-[15px] font-semibold">{title}</h2>
          {text && <p className="mt-1 text-sm text-muted">{text}</p>}
        </div>
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ProfileSection() {
  const { user, updateProfile, notify } = useApp();
  const { t, tm, dateLong } = useI18n();
  const [name, setName] = useState(user.name);
  const [err, setErr] = useState('');
  const dirty = name.trim() !== user.name;
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const msg = await updateProfile({ name });
    setBusy(false);
    if (msg) return setErr(msg === 'Full name is required.' ? t('errors.nameRequired') : tm(msg));
    setErr('');
    notify(t('settings.profileSaved'));
  };
  return (
    <Section id="profile" title={t('settings.profile')} text={t('settings.profileText')}>
      <div className="flex items-center gap-4">
        <Avatar id={user.id} name={name || user.name} size={56} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{name || user.name}</p>
          <p className="text-sm text-muted">{t(`roles.${user.role}`)}</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('auth.fullName')} value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} error={err} autoComplete="name" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('auth.email')} value={user.email} readOnly disabled hint={t('settings.emailLocked')} dir="ltr" />
          <Field label={t('auth.role')} value={t(`roles.${user.role}`)} readOnly disabled hint={user.createdAt ? t('settings.memberSince', { date: dateLong(user.createdAt) }) : undefined} />
        </div>
        <div className="flex justify-end gap-2">
          {dirty && <Button variant="quiet" onClick={() => { setName(user.name); setErr(''); }}>{t('common.cancel')}</Button>}
          <Button type="submit" disabled={!dirty} loading={busy}>{t('common.saveChanges')}</Button>
        </div>
      </form>
    </Section>
  );
}

function SecuritySection() {
  const { changePassword, notify, serverConfig } = useApp();
  const { t, te } = useI18n();
  const blank = { current: '', next: '', confirm: '' };
  const [f, setF] = useState(blank);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const min = serverConfig.passwordMin || 8;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.current) er.current = t('errors.currentPasswordRequired');
    if (f.next.length < min) er.next = t('errors.passwordShort', { min });
    if (f.confirm !== f.next) er.confirm = t('errors.passwordMismatch');
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await changePassword(f.current, f.next);
      setF(blank);
      notify(t('settings.passwordChanged'));
    } catch (err) {
      if (err.fields?.currentPassword) setErrs({ current: t('errors.currentPasswordWrong') });
      else notify(te(err), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section id="security" title={t('settings.security')} text={t('settings.securityText')} i={1}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field type="password" label={t('settings.currentPassword')} value={f.current} onChange={set('current')} error={errs.current} autoComplete="current-password" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field type="password" label={t('settings.newPassword')} value={f.next} onChange={set('next')} error={errs.next} autoComplete="new-password" hint={t('auth.passwordHint', { min })} />
          <Field type="password" label={t('auth.confirmPassword')} value={f.confirm} onChange={set('confirm')} error={errs.confirm} autoComplete="new-password" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>{t('settings.changePassword')}</Button>
        </div>
      </form>
    </Section>
  );
}

function DataSection() {
  const { user, myProjects, myTasks, exportBackup, importBackup, notify } = useApp();
  const { t, te, dateTime } = useI18n();
  const file = useRef(null);
  const [preview, setPreview] = useState(null); // { parsed, name }
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const isM = user.role === 'manager';

  const exportNow = async () => {
    setBusy('export');
    try {
      downloadJSON(await exportBackup(), `night-ops-backup-${today()}.json`);
      notify(t('backup.exported'));
    } catch (err) {
      notify(te(err), 'error');
    } finally {
      setBusy('');
    }
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError(t('backup.tooLarge'));
    const parsed = parseBackup(await f.text());
    if (!parsed.ok) return setError(t(`backup.err.${parsed.error}`));
    setError('');
    setPreview({ parsed, name: f.name });
  };
  const apply = async () => {
    setBusy('import');
    try {
      setReport(await importBackup(preview.parsed.data));
    } catch (err) {
      setError(te(err));
    } finally {
      setPreview(null);
      setBusy('');
    }
  };
  const counts = (d) => t('backup.counts', { users: d.users.length, projects: d.projects.length, tasks: d.tasks.length });

  return (
    <Section id="data" title={t('settings.data')} text={t('settings.dataText')} i={4}>
      <Row label={t('backup.export')} hint={t('backup.exportHint', { projects: myProjects.length, tasks: myTasks.length })}>
        <Button variant="secondary" onClick={exportNow} loading={busy === 'export'}><Download size={15} aria-hidden /> {t('backup.exportBtn')}</Button>
      </Row>
      <Row label={t('backup.import')} hint={isM ? t('backup.importHint') : t('backup.importManagerOnly')}>
        {isM && (
          <>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} aria-label={t('backup.chooseFile')} tabIndex={-1} />
            <Button variant="secondary" onClick={() => file.current?.click()}><FileUp size={15} aria-hidden /> {t('backup.chooseFile')}</Button>
          </>
        )}
      </Row>
      {error && <p role="alert" className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-fg">{error}</p>}
      <p className="flex items-start gap-2 text-xs text-muted"><ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {t('backup.privacy')}</p>

      {preview && (
        <Dialog onClose={() => !busy && setPreview(null)} title={t('backup.previewTitle')} eyebrow={preview.name}
          footer={<>
            <Button variant="secondary" onClick={() => setPreview(null)} disabled={!!busy}>{t('common.cancel')}</Button>
            <Button onClick={apply} loading={busy === 'import'}>{t('backup.mergeBtn')}</Button>
          </>}>
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-line bg-canvas/40 p-3">
              <p className="font-medium">{counts(preview.parsed.data)}</p>
              {preview.parsed.exportedAt && <p className="text-xs text-muted">{t('backup.exportedAt', { date: dateTime(preview.parsed.exportedAt) })}</p>}
              {preview.parsed.rejected > 0 && <p className="mt-1 text-xs text-warn">{t('backup.rejected', { count: preview.parsed.rejected })}</p>}
            </div>
            <ul className="list-disc space-y-1.5 ps-5 text-xs leading-5 text-muted">
              <li>{t('backup.ruleMine', { email: user.email })}</li>
              <li>{t('backup.ruleExisting')}</li>
              <li>{t('backup.ruleNoAccounts')}</li>
              <li>{t('backup.ruleJoin')}</li>
            </ul>
          </div>
        </Dialog>
      )}
      {report && (
        <Dialog onClose={() => setReport(null)} title={t('backup.doneTitle')} eyebrow={t('backup.import')}
          footer={<Button onClick={() => setReport(null)}>{t('common.done')}</Button>}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['backup.rProjectsAdded', report.projects.added], ['backup.rProjectsExisting', report.projects.existing],
              ['backup.rTasksAdded', report.tasks.added], ['backup.rTasksExisting', report.tasks.existing],
              ['backup.rTasksWaiting', report.tasks.waiting], ['backup.rSkipped', report.projects.skipped + report.tasks.skipped],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-line bg-canvas/40 p-3">
                <dt className="text-xs text-muted">{t(k)}</dt>
                <dd className="mt-1 font-display text-xl font-semibold tnum">{v}</dd>
              </div>
            ))}
          </dl>
          {report.tasks.waiting > 0 && <p className="mt-4 text-xs leading-5 text-warn">{t('backup.waitingHint')}</p>}
        </Dialog>
      )}
    </Section>
  );
}

export default function Settings() {
  const { user } = useApp();
  const { t, lang, setLang, weekday } = useI18n();
  const { theme, setTheme, ui, setUi } = useTheme();
  useEffect(() => {
    if (window.location.hash) requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth' }));
  }, []);
  const shortcuts = [
    [['Ctrl', 'K'], t('settings.kSearch')], [['/'], t('settings.kSearch')],
    [['G', 'D'], t('nav.dashboard')], [['G', 'P'], t('nav.projects')], [['G', 'T'], t('nav.tasks')], [['G', 'C'], t('nav.calendar')],
    [['G', 'M'], t('nav.team')], [['G', 'R'], t('nav.reports')], [['G', 'S'], t('nav.settings')],
    ...(user.role === 'manager' ? [[['N'], t('tasks.new')], [['Shift', '← →'], t('settings.kMove')]] : []),
    [['Esc'], t('settings.kClose')],
  ];
  return (
    <>
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('nav.settings')} summary={t('settings.summary')} />
      <div className="space-y-4 lg:space-y-5">
        <ProfileSection />
        <SecuritySection />
        <Section id="appearance" title={t('settings.appearance')} text={t('settings.appearanceText')} i={2}>
          <Row label={t('settings.theme')} hint={t('settings.themeHint')}>
            <Segmented label={t('settings.theme')} value={theme} onChange={setTheme} options={[
              { value: 'dark', label: t('settings.dark'), icon: Moon }, { value: 'light', label: t('settings.light'), icon: Sun }, { value: 'system', label: t('settings.system'), icon: Monitor },
            ]} />
          </Row>
          <Row label={t('settings.motion')} hint={t('settings.motionHint')}>
            <Segmented label={t('settings.motion')} value={ui.motion || 'system'} onChange={(v) => setUi({ motion: v })} options={[
              { value: 'system', label: t('settings.system') }, { value: 'reduce', label: t('settings.reduce') }, { value: 'full', label: t('settings.full') },
            ]} />
          </Row>
          <Row label={t('settings.sidebar')} hint={t('settings.sidebarHint')}>
            <Segmented label={t('settings.sidebar')} value={ui.sidebarCollapsed ? 'collapsed' : 'expanded'} onChange={(v) => setUi({ sidebarCollapsed: v === 'collapsed' })} options={[
              { value: 'expanded', label: t('settings.expanded') }, { value: 'collapsed', label: t('settings.collapsed') },
            ]} />
          </Row>
        </Section>
        <Section id="language" title={t('settings.language')} text={t('settings.languageText')} i={3}>
          <Row label={t('settings.language')} hint={t('settings.digitsHint')}>
            <Segmented label={t('settings.language')} value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />
          </Row>
          <Row label={t('settings.weekStart')} hint={t('settings.weekStartHint')}>
            <Segmented label={t('settings.weekStart')} value={typeof ui.weekStart === 'number' ? String(ui.weekStart) : 'auto'}
              onChange={(v) => setUi({ weekStart: v === 'auto' ? undefined : Number(v) })}
              options={[{ value: 'auto', label: t('settings.auto') }, { value: '6', label: weekday(6) }, { value: '0', label: weekday(0) }, { value: '1', label: weekday(1) }]} />
          </Row>
        </Section>
        <DataSection />
        <Section id="shortcuts" title={t('settings.shortcuts')} text={t('settings.shortcutsText')} i={5}>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {shortcuts.map(([keys, label], i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg-2">{label}</span>
                <span className="flex items-center gap-1" dir="ltr">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 text-xs text-muted"><Keyboard size={14} aria-hidden /> {t('settings.shortcutsNote')}</p>
        </Section>
      </div>
    </>
  );
}
