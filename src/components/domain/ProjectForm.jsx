import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button, Dialog, Field } from '../ui';
import { today } from '../../utils/scheduling';

export default function ProjectForm({ project, onClose, onSaved }) {
  const { saveProject, notify } = useApp();
  const { t } = useI18n();
  const [f, setF] = useState(project || { name: '', description: '', startDate: today(), deadline: today() });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e?.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = t('errors.projectNameRequired');
    if (!f.startDate) er.startDate = t('errors.startRequired');
    if (!f.deadline) er.deadline = t('errors.deadlineRequired');
    else if (f.startDate > f.deadline) er.deadline = t('errors.deadlineBeforeStart');
    setErrs(er);
    if (Object.keys(er).length || saving) return;
    setSaving(true);
    const saved = await saveProject({ ...f, name: f.name.trim() });
    setSaving(false);
    if (!saved) return; // the error was shown; keep the form open with the input
    notify(project ? t('projects.updated') : t('projects.created'));
    onSaved?.(saved);
    onClose();
  };
  return (
    <Dialog
      onClose={onClose}
      eyebrow={t('nav.projects')}
      title={project ? t('projects.edit') : t('projects.new')}
      description={project ? undefined : t('projects.formHint')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit} loading={saving}>{project ? t('common.saveChanges') : t('projects.create')}</Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('projects.name')} value={f.name} onChange={set('name')} error={errs.name} data-autofocus />
        <Field as="textarea" rows={3} label={t('common.description')} value={f.description} onChange={set('description')} />
        <div className="grid grid-cols-2 gap-3">
          <Field type="date" label={t('common.startDate')} value={f.startDate} onChange={set('startDate')} error={errs.startDate} />
          <Field type="date" label={t('common.deadline')} value={f.deadline} onChange={set('deadline')} error={errs.deadline} />
        </div>
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>{t('common.save')}</button>
      </form>
    </Dialog>
  );
}
