import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n/I18nProvider';
import { ButtonLink } from '../components/ui';
import { ChronoRing } from '../components/brand/ChronoRing';

export default function NotFound() {
  const { user } = useApp();
  const { t } = useI18n();
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="anim-page">
        <div className="relative mx-auto mb-8 grid h-48 w-48 place-items-center">
          <span aria-hidden className="absolute inset-0 rounded-full border border-dashed border-line-strong [animation:drift_40s_linear_infinite]" />
          <ChronoRing size={120} animate day={-1} />
          <span aria-hidden className="glow-line absolute inset-y-6 start-1/2 w-px" />
        </div>
        <p className="eyebrow mb-3 !text-accent-fg">{t('notFound.code')}</p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t('notFound.title')}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">{t('notFound.text')}</p>
        <ButtonLink to="/" className="mt-8">{user ? t('notFound.back') : t('notFound.home')}</ButtonLink>
      </div>
    </main>
  );
}
