import { getLocaleFromNavigator, init, locale, register, waitLocale } from 'svelte-i18n';

register('en', () => import('./locales/en.json'));
register('es', () => import('./locales/es.json'));
register('uk', () => import('./locales/uk.json'));

const savedLang = localStorage.getItem('hytale-panel-lang') || getLocaleFromNavigator() || 'en';

function setLangAttribute(lang: string): void {
  document.documentElement.setAttribute('data-lang', lang);
  if (document.body) {
    document.body.setAttribute('data-lang', lang);
  }
  // Also set CSS variable directly
  const fontUi = lang === 'uk' ? "'8bit Operator', monospace" : "'VT323', monospace";
  document.documentElement.style.setProperty('--font-ui', fontUi);
}

export async function initI18n(): Promise<void> {
  // Set data-lang attribute immediately
  setLangAttribute(savedLang);

  init({
    fallbackLocale: 'en',
    initialLocale: savedLang
  });

  // Wait for translations to load before app renders
  await waitLocale();
}

locale.subscribe((value) => {
  if (value) {
    localStorage.setItem('hytale-panel-lang', value);
    setLangAttribute(value);
  }
});

export { locale };
