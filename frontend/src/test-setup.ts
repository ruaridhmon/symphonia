import '@testing-library/jest-dom';

// Initialise i18next for tests so that components using useTranslation()
// render real English text instead of raw translation keys.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});
