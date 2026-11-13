import { useTheme } from '../theme/ThemeProvider';
import { useI18n } from '../i18n/I18nProvider';

/** Week start: user setting, else Saturday for Arabic and Sunday for English (the original calendar's start). */
export function useWeekStart() {
  const { ui } = useTheme();
  const { lang } = useI18n();
  return typeof ui.weekStart === 'number' ? ui.weekStart : lang === 'ar' ? 6 : 0;
}
