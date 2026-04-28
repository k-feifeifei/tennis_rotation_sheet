<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RoundOptions from './RoundOptions.vue'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'
import { useScheduleStore } from '../stores/schedule'
import { generateSchedule, extractPriorState } from '../utils/algorithm'

const emit = defineEmits(['view-stats'])

const { t } = useI18n()
const playersStore = usePlayersStore()
const settings = useSettingsStore()
const scheduleStore = useScheduleStore()

const scoreInputs = ref({})

// Round options modal state
const roundOptionsOpen = ref(false)
const roundOptionsIndex = ref(0)

// Append rounds
const appendCount = ref(5)
const appendError = ref('')

function playerName(id) {
  const p = playersStore.players.find(x => x.id === id)
  if (!p) return `#${id}`
  const idx = playersStore.players.indexOf(p) + 1
  return p.name ? `#${idx} ${p.name}` : `#${idx}`
}

function openRoundOptions(ri) {
  roundOptionsIndex.value = ri
  roundOptionsOpen.value = true
}

function closeRoundOptions() {
  roundOptionsOpen.value = false
}

function regenerateFrom(fromRoundIndex) {
  // Keep rounds 0..fromRoundIndex-1; regenerate the rest
  const keptRounds = scheduleStore.rounds.slice(0, fromRoundIndex)
  const keptScores = scheduleStore.scores.slice(0, fromRoundIndex)
  const remaining = scheduleStore.rounds.length - fromRoundIndex

  const priorState = extractPriorState(keptRounds, playersStore.players)
  const newRounds = generateSchedule(
    playersStore.players,
    settings.courts,
    Math.max(remaining, 1),
    settings.mode,
    playersStore.constraints,
    settings.seed,
    settings.coverage,
    priorState,
  )

  scheduleStore.setRounds([...keptRounds, ...newRounds])
  // Restore scores for kept rounds
  keptScores.forEach((roundScores, ri) => {
    roundScores.forEach((sc, ci) => {
      if (sc.a !== null) scheduleStore.setScore(ri, ci, sc.a, sc.b)
    })
  })
  // Clear score inputs for regenerated rounds
  const newInputs = {}
  Object.keys(scoreInputs.value).forEach(k => {
    const ri = Number(k.split('-')[0])
    if (ri < fromRoundIndex) newInputs[k] = scoreInputs.value[k]
  })
  scoreInputs.value = newInputs
}

function appendRounds() {
  appendError.value = ''
  const n = Math.max(1, Math.min(100, appendCount.value || 5))
  const priorState = extractPriorState(scheduleStore.rounds, playersStore.players)
  const newRounds = generateSchedule(
    playersStore.players,
    settings.courts,
    n,
    settings.mode,
    playersStore.constraints,
    settings.seed,
    settings.coverage,
    priorState,
  )
  scheduleStore.appendRounds(newRounds)
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
        <button v-if="scheduleStore.generated" class="btn-ghost" @click="exportPdf">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          {{ t('schedule.exportPdf') }}
        </button>
      </div>
    </div>

    <div v-for="(round, ri) in scheduleStore.rounds" :key="ri" class="round-block">
      <div class="round-header">
        <span class="round-badge">{{ ri + 1 }}</span>
        <h3 class="round-title">{{ t('schedule.round', { n: ri + 1 }) }}</h3>
        <div class="round-header-actions">
          <button class="btn-round-opt" @click="openRoundOptions(ri)" :title="t('roundOptions.title')">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="2.5" r="1" fill="currentColor"/>
              <circle cx="6.5" cy="6.5" r="1" fill="currentColor"/>
              <circle cx="6.5" cy="10.5" r="1" fill="currentColor"/>
            </svg>
            {{ t('roundOptions.title') }}
          </button>
          <button class="btn-stats" @click="emit('view-stats', ri)" :title="t('schedule.viewStats')">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <rect x="1" y="7" width="2.5" height="5" rx="0.8" fill="currentColor"/>
              <rect x="5" y="4" width="2.5" height="8" rx="0.8" fill="currentColor"/>
              <rect x="9" y="1" width="2.5" height="11" rx="0.8" fill="currentColor"/>
            </svg>
            {{ t('schedule.viewStats') }}
          </button>
        </div>
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

    <!-- Append rounds section -->
    <div v-if="scheduleStore.generated" class="append-section">
      <span class="append-label">{{ t('schedule.appendLabel') }}</span>
      <div class="stepper">
        <button
          class="stepper-btn"
          :disabled="appendCount <= 1"
          @click="appendCount = Math.max(1, appendCount - 1)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <span class="stepper-val">{{ appendCount }}</span>
        <button
          class="stepper-btn"
          :disabled="appendCount >= 100"
          @click="appendCount = Math.min(100, appendCount + 1)"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <button class="btn-secondary" @click="appendRounds">
        {{ t('schedule.appendRounds') }}
      </button>
    </div>
  </div>

  <!-- Round options modal -->
  <Teleport to="body">
    <div v-if="roundOptionsOpen" class="modal-backdrop" @click.self="closeRoundOptions">
      <div class="modal-dialog modal-dialog-sm" role="dialog" aria-modal="true">
        <div class="modal-header">
          <span class="modal-title">{{ t('roundOptions.title') }} — {{ t('schedule.round', { n: roundOptionsIndex + 1 }) }}</span>
          <button class="modal-close btn-ghost-sm" @click="closeRoundOptions">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <RoundOptions
            :round-index="roundOptionsIndex"
            @close="closeRoundOptions"
            @regenerate-from="regenerateFrom"
          />
        </div>
      </div>
    </div>
  </Teleport>
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
  flex-wrap: wrap;
}

.round-header-actions {
  display: flex;
  gap: 0.35rem;
  margin-left: auto;
}

.btn-round-opt, .btn-stats {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-family: var(--sans);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
}
.btn-round-opt:hover {
  background: var(--surface);
  color: var(--text);
  border-color: var(--border);
}
.btn-stats:hover {
  background: var(--accent-bg);
  color: var(--accent);
  border-color: var(--accent-border);
}
.btn-round-opt:active, .btn-stats:active { transform: scale(0.96); }

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

.chip-a { background: rgba(5, 150, 105, 0.09); color: var(--accent); }
.chip-b { background: rgba(37, 99, 235, 0.08); color: #2563eb; }

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

/* Append section */
.append-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--surface);
}
.append-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

.stepper {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s;
}
.stepper-btn:hover:not(:disabled) { background: var(--border); }
.stepper-btn:disabled { color: var(--text-muted); cursor: not-allowed; }
.stepper-val {
  width: 2.2rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--text-h);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  line-height: 2rem;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
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
  max-width: 520px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.18);
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
  font-size: 0.9rem;
  color: var(--text-h);
}

.modal-close { padding: 0.3rem 0.4rem; }

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  max-height: 75dvh;
}

@media (max-width: 640px) {
  .modal-backdrop { padding: 0; align-items: flex-end; }
  .modal-dialog { border-radius: 14px 14px 0 0; max-height: 92dvh; }
}

@media print {
  .schedule-actions { display: none; }
  .round-header-actions { display: none; }
  .score-row .btn-primary-sm { display: none; }
  .append-section { display: none; }
  .round-block { break-inside: avoid; box-shadow: none; border-color: #e4e4e7; }
}
</style>
