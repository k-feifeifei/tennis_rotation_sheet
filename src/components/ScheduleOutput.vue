<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'
import { useScheduleStore } from '../stores/schedule'
import { generateSchedule } from '../utils/algorithm'

const { t } = useI18n()
const playersStore = usePlayersStore()
const settings = useSettingsStore()
const scheduleStore = useScheduleStore()

const error = ref('')
const scoreInputs = ref({})

function playerName(id) {
  const p = playersStore.players.find(x => x.id === id)
  if (!p) return `#${id}`
  const idx = playersStore.players.indexOf(p) + 1
  return p.name || `${t('player.player')} ${idx}`
}

function generate() {
  error.value = ''
  const n = playersStore.players.length
  if (n < 4) { error.value = t('errors.minPlayers'); return }
  if (n > 50) { error.value = t('errors.maxPlayers'); return }
  if (settings.mode === 'mixed' || settings.mode === 'mixedRivals') {
    const males = playersStore.players.filter(p => p.gender === 'M').length
    const females = playersStore.players.filter(p => p.gender === 'F').length
    if (males < 2 || females < 2) { error.value = t('errors.notEnoughForMode'); return }
  }
  const rounds = generateSchedule(
    playersStore.players,
    settings.courts,
    settings.rounds,
    settings.mode,
    playersStore.constraints,
  )
  scheduleStore.setRounds(rounds)
  scoreInputs.value = {}
}

function saveScore(ri, ci) {
  const inp = scoreInputs.value[`${ri}-${ci}`]
  if (!inp) return
  const a = Number(inp.a)
  const b = Number(inp.b)
  if (!isNaN(a) && !isNaN(b)) scheduleStore.setScore(ri, ci, a, b)
}

function getScore(ri, ci) {
  return scheduleStore.scores[ri]?.[ci] ?? { a: null, b: null }
}

function initScoreInput(ri, ci) {
  const key = `${ri}-${ci}`
  if (!scoreInputs.value[key]) {
    const sc = getScore(ri, ci)
    scoreInputs.value[key] = { a: sc.a ?? '', b: sc.b ?? '' }
  }
}

function exportPdf() {
  window.print()
}
</script>

<template>
  <div class="schedule-output">
    <div class="schedule-header">
      <h2>{{ t('nav.schedule') }}</h2>
      <div class="schedule-actions">
        <button class="btn-primary" @click="generate">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7a5 5 0 0110 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M10.5 5l1.5 2-2 1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ scheduleStore.generated ? t('schedule.regenerate') : t('schedule.generate') }}
        </button>
        <button v-if="scheduleStore.generated" class="btn-ghost" @click="exportPdf">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          {{ t('schedule.exportPdf') }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-banner">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/>
        <path d="M7 4v3M7 9.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      {{ error }}
    </div>

    <div v-if="!scheduleStore.generated" class="empty-hint">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" class="empty-icon">
        <rect x="3" y="3" width="30" height="30" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
        <path d="M12 18h12M18 12v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <p>{{ t('schedule.generate') }}...</p>
    </div>

    <div v-for="(round, ri) in scheduleStore.rounds" :key="ri" class="round-block">
      <div class="round-header">
        <span class="round-badge">{{ ri + 1 }}</span>
        <h3 class="round-title">{{ t('schedule.round', { n: ri + 1 }) }}</h3>
      </div>

      <div class="courts-grid">
        <div v-for="(court, ci) in round.courts" :key="ci" class="court-card">
          <div class="court-label">{{ t('schedule.court', { n: ci + 1 }) }}</div>
          <div class="match-row">
            <div class="team team-a">
              <span v-for="id in court.teamA" :key="id" class="player-chip chip-a">{{ playerName(id) }}</span>
            </div>
            <span class="vs-label">{{ t('schedule.vs') }}</span>
            <div class="team team-b">
              <span v-for="id in court.teamB" :key="id" class="player-chip chip-b">{{ playerName(id) }}</span>
            </div>
          </div>

          <div class="score-row" @click="initScoreInput(ri, ci)">
            <template v-if="scoreInputs[`${ri}-${ci}`]">
              <input
                v-model="scoreInputs[`${ri}-${ci}`].a"
                type="number"
                min="0"
                class="score-input"
                :placeholder="t('schedule.scoreA')"
              />
              <span class="score-sep">:</span>
              <input
                v-model="scoreInputs[`${ri}-${ci}`].b"
                type="number"
                min="0"
                class="score-input"
                :placeholder="t('schedule.scoreB')"
              />
              <button class="btn-primary-sm" @click.stop="saveScore(ri, ci)">{{ t('actions.save') }}</button>
            </template>
            <template v-else>
              <span v-if="getScore(ri, ci).a !== null" class="score-display">
                {{ getScore(ri, ci).a }} : {{ getScore(ri, ci).b }}
              </span>
              <span v-else class="score-placeholder">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M5.5 1v4.5L8 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" stroke-width="1.2"/>
                </svg>
                {{ t('schedule.enterScore') }}
              </span>
            </template>
          </div>
        </div>
      </div>

      <div v-if="round.bench.length" class="bench-row">
        <span class="bench-label">{{ t('schedule.bench') }}</span>
        <span v-for="id in round.bench" :key="id" class="player-chip bench-chip">{{ playerName(id) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-output { display: flex; flex-direction: column; gap: 1.25rem; }

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.schedule-actions { display: flex; gap: 0.5rem; }

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  color: var(--danger);
  font-size: 0.875rem;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
}
.empty-icon { color: var(--border); }

.round-block {
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  background: var(--bg);
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.round-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

.round-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 6px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--mono);
  flex-shrink: 0;
}

.round-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.courts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.7rem;
}

.court-card {
  border: 1px solid var(--border-subtle);
  border-radius: 9px;
  padding: 0.85rem;
  background: var(--surface);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.court-card:hover {
  border-color: var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.court-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.match-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.team { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
.team-a { align-items: flex-end; }
.team-b { align-items: flex-start; }

.vs-label {
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.75rem;
  flex-shrink: 0;
  letter-spacing: 0.05em;
}

.player-chip {
  border-radius: 5px;
  padding: 0.15rem 0.45rem;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.chip-a {
  background: rgba(5, 150, 105, 0.09);
  color: var(--accent);
}
.chip-b {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

@media (prefers-color-scheme: dark) {
  .chip-a { background: rgba(16, 185, 129, 0.12); color: #34d399; }
  .chip-b { background: rgba(96, 165, 250, 0.12); color: #60a5fa; }
}

.score-row {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  min-height: 2rem;
}

.score-input {
  width: 3.5rem;
  text-align: center;
  padding: 0.2rem 0.3rem;
  font-size: 0.875rem;
  font-family: var(--mono);
}

.score-sep { font-weight: 700; color: var(--text-muted); }

.score-display {
  font-weight: 700;
  font-size: 1rem;
  font-family: var(--mono);
  color: var(--text-h);
}

.score-placeholder {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.bench-row {
  margin-top: 0.85rem;
  padding-top: 0.65rem;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
}

.bench-label {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.78rem;
}

.bench-chip {
  background: var(--surface-2);
  color: var(--text-muted);
  border-radius: 5px;
  padding: 0.1rem 0.4rem;
  font-size: 0.78rem;
}

@media print {
  .schedule-actions { display: none; }
  .score-row .btn-primary-sm { display: none; }
  .round-block { break-inside: avoid; box-shadow: none; border-color: #e4e4e7; }
}
</style>
