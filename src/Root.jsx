import App from './App';
import { AppProvider } from './context/AppContext';
import { I18nProvider } from './i18n/I18nProvider';
import { ThemeProvider } from './theme/ThemeProvider';

// All app-wide providers in one place so the browser entry and the tests render the same tree.
export default function Root() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
