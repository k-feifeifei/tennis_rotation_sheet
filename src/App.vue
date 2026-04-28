<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeView from './components/HomeView.vue'
import SetupView from './components/SetupView.vue'
import ScheduleOutput from './components/ScheduleOutput.vue'
import StatsView from './components/StatsView.vue'
import { usePlayersStore } from './stores/players'
import { useSettingsStore } from './stores/settings'
import { useScheduleStore } from './stores/schedule'
import { useSessionStore } from './stores/session'
import { saveState, loadState } from './utils/persist'

const { t, locale } = useI18n()
const players = usePlayersStore()
const settings = useSettingsStore()
const schedule = useScheduleStore()
const session = useSessionStore()

const statsOpen = ref(false)
const statsRound = ref(null)

const headerHidden = ref(false)
let lastScrollY = 0

function onScroll() {
  const y = window.scrollY
  if (y < 60) {
    headerHidden.value = false
  } else {
    headerHidden.value = y > lastScrollY
  }
  lastScrollY = y
}

onMounted(() => {
  loadState(players, settings, schedule, session)
  window.addEventListener('scroll', onScroll, { passive: true })
})

const locales = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
]

function switchLocale(code) {
  locale.value = code
  localStorage.setItem('locale', code)
}

function openStats(roundIndex) {
  statsRound.value = roundIndex ?? null
  statsOpen.value = true
}

function closeStats() {
  statsOpen.value = false
}

function endSession() {
  session.endSession({
    players: players.serialize(),
    settings: settings.serialize(),
    schedule: schedule.serialize(),
    playerCount: players.players.length,
    roundCount: schedule.rounds.length,
  })
}

watch(
  [() => players.serialize(), () => settings.serialize(), () => schedule.serialize(), () => session.serialize()],
  () => saveState(players, settings, schedule, session),
  { deep: true }
)
</script>

<template>
  <div class="app-shell">
    <header class="app-header" :class="{ 'header-hidden': headerHidden }">
      <div class="app-header-left">
        <!-- Back/home button in setup or active phase -->
        <button
          v-if="session.phase !== 'home'"
          class="btn-back btn-ghost-sm"
          @click="endSession"
          :title="t('home.backToHome')"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="app-brand">
          <svg class="brand-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 10 Q7.5 6.5 10 10 Q12.5 13.5 15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
          <span class="app-title">{{ t('appTitle') }}</span>
        </div>
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

    <!-- Phase indicator bar for setup / active -->
    <div
      v-if="session.phase !== 'home'"
      class="phase-nav"
      :class="{ 'nav-raised': headerHidden }"
    >
      <span class="phase-step" :class="{ 'step-active': session.phase === 'setup', 'step-done': session.phase === 'active' }">
        <span class="step-dot"></span>{{ t('nav.setup') }}
      </span>
      <span class="phase-arrow">›</span>
      <span class="phase-step" :class="{ 'step-active': session.phase === 'active' }">
        <span class="step-dot"></span>{{ t('nav.schedule') }}
      </span>
    </div>

    <main class="app-main">
      <HomeView v-if="session.phase === 'home'" />
      <SetupView v-else-if="session.phase === 'setup'" />
      <ScheduleOutput v-else-if="session.phase === 'active'" @view-stats="openStats" />
    </main>

    <!-- Stats modal -->
    <Teleport to="body">
      <div v-if="statsOpen" class="modal-backdrop" @click.self="closeStats">
        <div class="modal-dialog" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="modal-title">{{ t('nav.stats') }}</span>
            <button class="modal-close btn-ghost-sm" @click="closeStats" :aria-label="t('actions.cancel')">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <StatsView :up-to-round="statsRound" @clear-round="statsRound = null" />
          </div>
        </div>
      </div>
    </Teleport>
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
  z-index: 11;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform: translateY(0);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.app-header.header-hidden { transform: translateY(-100%); }

.app-header-left {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-back {
  padding: 0.35rem 0.4rem;
  margin-right: 0.1rem;
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

/* ── Phase indicator ─────────────────────────────────────────── */
.phase-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1.5rem;
  height: 36px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 52px;
  z-index: 10;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: top 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.phase-nav.nav-raised { top: 0; }

.phase-step {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
}
.step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
  transition: background 0.2s;
}
.phase-step.step-active { color: var(--accent); }
.phase-step.step-active .step-dot { background: var(--accent); }
.phase-step.step-done { color: var(--text-muted); }
.phase-step.step-done .step-dot { background: var(--success); }
.phase-arrow { color: var(--border); font-size: 0.85rem; }

.app-main {
  flex: 1;
  padding: 1.75rem 1.5rem;
  max-width: 1000px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .app-header { padding: 0 1rem; }
  .phase-nav { padding: 0 0.75rem; }
  .app-main { padding: 1.25rem 1rem; }
}

/* ── Modal ───────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.modal-dialog {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%;
  max-width: 860px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-h);
}

.modal-close { padding: 0.3rem 0.4rem; }

.modal-body {
  padding: 1.5rem 1.25rem;
  overflow-y: auto;
}

@media (max-width: 640px) {
  .modal-backdrop { padding: 0; align-items: flex-end; }
  .modal-dialog { border-radius: 14px 14px 0 0; max-height: 92dvh; }
  .modal-body { padding: 1.25rem 1rem; }
}
</style>
