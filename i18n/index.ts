import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from '../locales/en.json';
import am from '../locales/am.json';
import ti from '../locales/ti.json';

const resources = {
  en: {
    translation: en,
  },
  am: {
    translation: am,
  },
  ti: {
    translation: ti,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;
