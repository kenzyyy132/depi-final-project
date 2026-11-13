import { useState } from 'react';
import { Link2, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, Field } from '../ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const inviteLink = (code) => `${window.location.origin}/join/${code}`;

/** Ways to bring developers into a project: the invitation link, or an email sent by the server. */
export function InvitePanel({ project }) {
  const { inviteByEmail, notify, serverConfig } = useApp();
  const { t, te } = useI18n();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const link = inviteLink(project.joinCode);

  const copyLink = () => {
    if (!navigator.clipboard?.writeText) return notify(t('projects.copyUnavailable'), 'error');
    navigator.clipboard.writeText(link).then(() => notify(t('invite.linkCopied')), () => notify(t('projects.copyFailed'), 'error'));
  };
  const send = async (e) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setErr(t('errors.emailInvalid'));
    setErr('');
    setBusy(true);
    try {
      const res = await inviteByEmail(project.id, email.trim());
      notify(res.delivered ? t('invite.sent', { email: email.trim() }) : t('invite.logged'));
      setEmail('');
    } catch (e2) {
      setErr(te(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-2">{t('invite.link')}</p>
        <div className="flex min-w-0 items-center gap-2">
          <code dir="ltr" className="min-w-0 flex-1 truncate rounded-md border border-line bg-canvas/60 px-3 py-2 font-mono text-xs text-fg-2">{link}</code>
          <Button variant="secondary" size="sm" onClick={copyLink}><Link2 size={14} aria-hidden /> {t('projects.copy')}</Button>
        </div>
      </div>
      {serverConfig.mail !== 'off' ? (
        <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
          <Field className="min-w-0 flex-1" type="email" label={t('invite.byEmail')} value={email} onChange={(e) => setEmail(e.target.value)} error={err} autoComplete="off" dir="ltr"
            hint={serverConfig.mail === 'console' ? t('invite.devHint') : undefined} />
          <Button type="submit" variant="secondary" className="sm:mt-6" loading={busy}><Send size={14} aria-hidden className="rtl:-scale-x-100" /> {t('invite.send')}</Button>
        </form>
      ) : (
        <p className="text-xs text-muted">{t('invite.mailOff')}</p>
      )}
    </div>
  );
}
