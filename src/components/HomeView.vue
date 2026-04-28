<script setup>
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '../stores/session'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'
import { useScheduleStore } from '../stores/schedule'

const { t } = useI18n()
const session = useSessionStore()
const players = usePlayersStore()
const settings = useSettingsStore()
const schedule = useScheduleStore()

function startNew() {
  players.$reset()
  settings.$reset()
  schedule.$reset()
  session.newSession()
}

function restore(entry) {
  players.hydrate(entry.players)
  settings.hydrate(entry.settings)
  schedule.hydrate(entry.schedule)
  session.activateSession()
}

function formatDate(ts) {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="home-view">
    <div class="home-hero">
      <svg class="hero-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="2"/>
        <path d="M10 24 Q16 16 24 24 Q32 32 38 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      </svg>
      <h1 class="hero-title">{{ t('appTitle') }}</h1>
      <p class="hero-sub">{{ t('home.subtitle') }}</p>
    </div>

    <button class="btn-new" @click="startNew">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      {{ t('home.newSession') }}
    </button>

    <div v-if="session.history.length > 0" class="history-section">
      <h2 class="history-title">{{ t('home.history') }}</h2>
      <div class="history-list">
        <div
          v-for="entry in session.history"
          :key="entry.id"
          class="history-card"
        >
          <div class="history-card-body" @click="restore(entry)">
            <div class="history-meta">
              <span class="history-date">{{ formatDate(entry.createdAt) }}</span>
            </div>
            <div class="history-stats">
              <span class="history-stat">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="4" r="2.5" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M1 11c0-2.2 2.2-4 5-4s5 1.8 5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
                {{ t('home.playerCount', { n: entry.playerCount }) }}
              </span>
              <span class="history-stat">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M4 6h4M6 4v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
                {{ t('home.roundCount', { n: entry.roundCount }) }}
              </span>
            </div>
          </div>
          <button class="history-remove btn-ghost-sm" @click="session.removeHistory(entry.id)" :title="t('actions.reset')">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 3rem 1rem;
}

.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
}

.hero-icon {
  width: 56px;
  height: 56px;
  color: var(--accent);
  margin-bottom: 0.25rem;
}

.hero-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-h);
  letter-spacing: -0.03em;
  margin: 0;
}

.hero-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.btn-new {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: var(--sans);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px var(--accent-glow);
  transition: opacity 0.15s, transform 0.1s;
}
.btn-new:hover { opacity: 0.9; }
.btn-new:active { transform: scale(0.97); }

.history-section {
  width: 100%;
  max-width: 480px;
}

.history-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 0.6rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.history-card {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.history-card:hover {
  border-color: var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.history-card-body {
  flex: 1;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.history-meta { margin-bottom: 0.25rem; }
.history-date { font-size: 0.78rem; color: var(--text-muted); }

.history-stats {
  display: flex;
  gap: 0.9rem;
}
.history-stat {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text);
}

.history-remove {
  padding: 0.5rem 0.65rem;
  margin-right: 0.4rem;
  flex-shrink: 0;
}
</style>
