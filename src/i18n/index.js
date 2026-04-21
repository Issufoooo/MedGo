import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import pt from './locales/pt/translation.json'
import en from './locales/en/translation.json'
import es from './locales/es/translation.json'

const savedLang = localStorage.getItem('medgo_lang') || 'pt'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    lng: savedLang,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('medgo_lang', lng)
  document.documentElement.lang = lng
})

export default i18n
