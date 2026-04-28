import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import './style.css'
import App from './App.vue'
import zh from './locales/zh.json'
import en from './locales/en.json'
import ja from './locales/ja.json'

const savedLocale = localStorage.getItem('locale') || 'zh'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { zh, en, ja },
})

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(i18n)
app.mount('#app')
