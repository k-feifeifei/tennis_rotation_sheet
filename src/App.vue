<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PlayerConfig from './components/PlayerConfig.vue'
import BasicParams from './components/BasicParams.vue'
import ScheduleOutput from './components/ScheduleOutput.vue'
import StatsView from './components/StatsView.vue'
import { usePlayersStore } from './stores/players'
import { useSettingsStore } from './stores/settings'
import { useScheduleStore } from './stores/schedule'
import { saveState, loadState } from './utils/persist'

const { t, locale } = useI18n()
const players = usePlayersStore()
const settings = useSettingsStore()
const schedule = useScheduleStore()

const tab = ref('players')
const tabs = [
  { key: 'players',  label: () => t('nav.players') },
  { key: 'params',   label: () => t('nav.params') },
  { key: 'schedule', label: () => t('nav.schedule') },
  { key: 'stats',    label: () => t('nav.stats') },
]

const locales = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
]

function switchLocale(code) {
  locale.value = code
  localStorage.setItem('locale', code)
}

watch(
  [() => players.serialize(), () => settings.serialize(), () => schedule.serialize()],
  () => saveState(players, settings, schedule),
  { deep: true }
)

onMounted(() => loadState(players, settings, schedule))
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-brand">
        <svg class="brand-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M5 10 Q7.5 6.5 10 10 Q12.5 13.5 15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
        <span class="app-title">{{ t('appTitle') }}</span>
      </div>
      <div class="locale-switcher">
        <button
          v-for="l in locales"
          :key="l.code"
          class="locale-btn"
          :class="{ active: locale === l.code }"
          @click="switchLocale(l.code)"
        >{{ l.label }}</button>
      </div>
    </header>

    <nav class="tab-nav" role="tablist">
      <button
        v-for="tb in tabs"
        :key="tb.key"
        class="tab-btn"
        :class="{ active: tab === tb.key }"
        role="tab"
        :aria-selected="tab === tb.key"
        @click="tab = tb.key"
      >{{ tb.label() }}</button>
    </nav>

    <main class="app-main">
      <PlayerConfig  v-if="tab === 'players'" />
      <BasicParams   v-if="tab === 'params'" />
      <ScheduleOutput v-if="tab === 'schedule'" />
      <StatsView     v-if="tab === 'stats'" />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 52px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-icon {
  width: 20px;
  height: 20px;
  color: var(--accent);
  flex-shrink: 0;
}

.app-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-h);
  letter-spacing: -0.02em;
}

.locale-switcher {
  display: flex;
  gap: 0.2rem;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 0.2rem;
}

.locale-btn {
  padding: 0.2rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 0.78rem;
  font-family: var(--sans);
  font-weight: 500;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s, transform 0.1s;
}
.locale-btn:hover { color: var(--text); }
.locale-btn.active {
  background: var(--bg);
  color: var(--text-h);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.locale-btn:active { transform: scale(0.95); }

.tab-nav {
  display: flex;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg);
  padding: 0 1.5rem;
  gap: 0.1rem;
}

.tab-btn {
  padding: 0.7rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-family: var(--sans);
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}
.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
.tab-btn:hover:not(.active) { color: var(--text); }

.app-main {
  flex: 1;
  padding: 1.75rem 1.5rem;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .app-header { padding: 0 1rem; }
  .tab-nav { padding: 0 0.5rem; overflow-x: auto; }
  .tab-btn { padding: 0.65rem 0.75rem; font-size: 0.82rem; white-space: nowrap; }
  .app-main { padding: 1.25rem 1rem; }
}
</style>
