import { ChronoRing } from '../components/brand/ChronoRing';
import { useT } from '../i18n/I18nProvider';

/** Shown only while a lazily-loaded page chunk is actually downloading. */
export function RouteLoader() {
  const t = useT();
  return (
    <div role="status" className="grid min-h-[40vh] place-items-center">
      <div className="flex flex-col items-center gap-3 opacity-0 [animation:appear_300ms_200ms_forwards]">
        <ChronoRing size={44} animate />
        <span className="eyebrow">{t('common.loading')}</span>
      </div>
    </div>
  );
}
