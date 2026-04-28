<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PlayerConfig from './PlayerConfig.vue'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'
import { useScheduleStore } from '../stores/schedule'
import { useSessionStore } from '../stores/session'
import { generateSchedule } from '../utils/algorithm'

const { t } = useI18n()
const playersStore = usePlayersStore()
const settings = useSettingsStore()
const scheduleStore = useScheduleStore()
const session = useSessionStore()

const error = computed(() => {
  const n = playersStore.players.length
  if (n < 4) return t('errors.minPlayers')
  if (n > 50) return t('errors.maxPlayers')
  if (settings.mode === 'mixed' || settings.mode === 'mixedRivals') {
    const males = playersStore.players.filter(p => p.gender === 'M').length
    const females = playersStore.players.filter(p => p.gender === 'F').length
    if (males < 2 || females < 2) return t('errors.notEnoughForMode')
  }
  return ''
})

function generate() {
  if (error.value) return
  const rounds = generateSchedule(
    playersStore.players,
    settings.courts,
    settings.rounds,
    settings.mode,
    playersStore.constraints,
    settings.seed,
    settings.coverage,
  )
  scheduleStore.setRounds(rounds)
  session.activateSession()
}
</script>

<template>
  <div class="setup-view">
    <PlayerConfig />

    <div class="setup-cta">
      <p v-if="error" class="cta-error">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M6.5 4v3.5M6.5 9v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        {{ error }}
      </p>
      <button class="btn-generate" :disabled="!!error" @click="generate">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M2 7.5a5.5 5.5 0 0111 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M11.5 5l1.5 2.5-2.5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('schedule.generate') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setup-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 0;
  border-top: 2px solid var(--border-subtle);
}

.cta-error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--danger);
  margin: 0;
}

.btn-generate {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 2.5rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-family: var(--sans);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px var(--accent-glow);
  transition: opacity 0.15s, transform 0.1s;
}
.btn-generate:hover:not(:disabled) { opacity: 0.9; }
.btn-generate:active:not(:disabled) { transform: scale(0.97); }
.btn-generate:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
</style>
