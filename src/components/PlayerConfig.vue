<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayersStore } from '../stores/players'
import { useSettingsStore } from '../stores/settings'

const { t } = useI18n()
const store = usePlayersStore()
const settings = useSettingsStore()

const bulkText = ref('')
const showBulk = ref(false)
const showAdvanced = ref(false)
const constraintType = ref('fixed')
const constraintA = ref('')
const constraintB = ref('')
const constraintError = ref('')

function applyBulk() {
  const names = bulkText.value.split('\n').map(s => s.trim()).filter(Boolean)
  if (names.length) store.setNames(names)
  showBulk.value = false
  bulkText.value = ''
}

function addConstraint() {
  constraintError.value = ''
  const a = Number(constraintA.value)
  const b = Number(constraintB.value)
  if (!a || !b || a === b) return
  const result = store.addConstraint(constraintType.value, a, b)
  if (result === 'conflict') {
    constraintError.value = t('player.constraintConflict')
  } else {
    constraintA.value = ''
    constraintB.value = ''
  }
}

function playerLabel(id) {
  const p = store.players.find(x => x.id === id)
  return p ? `#${store.players.indexOf(p) + 1} ${p.name || t('player.player')}` : `#${id}`
}

// Mode groups: each group is mutually exclusive within itself.
// Selecting a mode from one group clears group-incompatible selections.
// Group 'base' (normal/coverage) and group 'gender' (mixed) can coexist with group 'team' (rivals).
// But within each dimension only one value is active.
//
// Implementation: we split into two independent dimensions:
//   genderMode: null | 'mixed'
//   teamMode:   null | 'rivals'
// The effective settings.mode = combination of both.
//
// Effective mode mapping:
//   none + none        → 'normal' or 'coverage' (separate base selector)
//   mixed + none       → 'mixed'
//   none + rivals      → 'rivals'
//   mixed + rivals     → 'mixedRivals'


const genderOverlay = computed({
  get: () => settings.mode === 'mixed' || settings.mode === 'mixedRivals',
  set: (on) => {
    const hasTeam = settings.mode === 'rivals' || settings.mode === 'mixedRivals'
    settings.mode = resolveMode(on, hasTeam)
  }
})

const teamOverlay = computed({
  get: () => settings.mode === 'rivals' || settings.mode === 'mixedRivals',
  set: (on) => {
    const hasGender = settings.mode === 'mixed' || settings.mode === 'mixedRivals'
    settings.mode = resolveMode(hasGender, on)
  }
})

function resolveMode(gender, team) {
  if (gender && team) return 'mixedRivals'
  if (gender) return 'mixed'
  if (team) return 'rivals'
  return 'normal'
}

const modeDesc = computed(() => {
  const m = settings.mode
  const map = {
    normal: 'params.modeNormalDesc',
    mixed: 'params.modeMixedDesc',
    rivals: 'params.modeRivalsDesc',
    mixedRivals: 'params.modeMixedRivalsDesc',
  }
  return map[m] ? t(map[m]) : ''
})

// Whether team column is relevant for the current mode
const teamModeActive = computed(() => settings.mode === 'rivals' || settings.mode === 'mixedRivals')

// Whether any player has a team assignment (for the "please assign teams" warning)
const hasTeamAssignments = computed(() =>
  store.players.some(p => p.team === 'red' || p.team === 'blue')
)

function randomiseSeed() {
  settings.seed = Math.floor(Math.random() * 99999) + 1
}
</script>

<template>
  <div class="player-config">

    <!-- ── Section: Parameters ───────────────────────────────── -->
    <div class="params-section">
      <div class="params-grid">
        <!-- Courts -->
        <div class="param-row">
          <label class="param-label">{{ t('params.courts') }}</label>
          <div class="stepper">
            <button
              class="stepper-btn"
              :disabled="settings.courts <= 1"
              @click="settings.courts = Math.max(1, settings.courts - 1)"
              aria-label="Decrease courts"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
            <span class="stepper-val">{{ settings.courts }}</span>
            <button
              class="stepper-btn"
              :disabled="settings.courts >= 10"
              @click="settings.courts = Math.min(10, settings.courts + 1)"
              aria-label="Increase courts"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Rounds -->
        <div class="param-row">
          <label class="param-label">{{ t('params.rounds') }}</label>
          <div class="rounds-input">
            <label class="checkbox-label">
              <input type="checkbox" :checked="settings.rounds === 0" @change="e => settings.rounds = e.target.checked ? 0 : 10" />
              <span>{{ t('params.autoRounds') }}</span>
            </label>
            <input
              v-if="settings.rounds !== 0"
              type="number"
              v-model.number="settings.rounds"
              min="1"
              max="200"
              class="input-number"
            />
          </div>
        </div>

        <!-- Mode — grouped into independent dimensions -->
        <div class="param-row param-row-mode">
          <label class="param-label">{{ t('params.mode') }}</label>
          <div class="mode-groups">

            <!-- Group 1: Gender overlay (mixed) — toggleable, combines with team -->
            <div class="mode-group">
              <span class="mode-group-label">{{ t('params.modeGroupGender') }}</span>
              <div class="mode-pills">
                <button
                  class="pill pill-toggle"
                  :class="{ active: genderOverlay }"
                  @click="genderOverlay = !genderOverlay"
                >{{ t('params.modeMixed') }}</button>
              </div>
            </div>

            <!-- Group 2: Team overlay (rivals) — toggleable, combines with gender -->
            <div class="mode-group">
              <span class="mode-group-label">{{ t('params.modeGroupTeam') }}</span>
              <div class="mode-pills">
                <button
                  class="pill pill-toggle"
                  :class="{ active: teamOverlay }"
                  @click="teamOverlay = !teamOverlay"
                >{{ t('params.modeRivals') }}</button>
              </div>
            </div>

          </div>
        </div>

        <!-- Coverage option — combinable with any mode -->
        <div class="param-row">
          <label class="param-label">{{ t('params.coverageOption') }}</label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.coverage" />
            <span>{{ t('params.modeCoverage') }}</span>
          </label>
        </div>

        <!-- Mode description -->
        <div v-if="modeDesc || (settings.coverage) || (teamModeActive && !hasTeamAssignments)" class="param-row param-row-desc">
          <span class="mode-desc-icon">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.3"/>
              <path d="M6.5 5.5v4M6.5 4v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="mode-desc">
            <template v-if="modeDesc">{{ modeDesc }}</template>
            <template v-if="modeDesc && settings.coverage"> · </template>
            <template v-if="settings.coverage">{{ t('params.modeCoverageDesc') }}</template>
          </span>
          <span v-if="teamModeActive && !hasTeamAssignments" class="mode-warn">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1l5 10H1L6 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
              <path d="M6 5v3M6 9.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
            {{ t('params.teamRequired') }}
          </span>
        </div>

        <!-- Advanced section (collapsed by default) -->
        <div class="param-row param-row-advanced">
          <button class="btn-ghost advanced-toggle" @click="showAdvanced = !showAdvanced">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
              :style="{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
              <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ t('params.advanced') }}
          </button>
        </div>

        <!-- Seed — hidden inside Advanced -->
        <template v-if="showAdvanced">
          <div class="param-row">
            <label class="param-label">{{ t('params.seed') }}</label>
            <div class="seed-row">
              <input
                type="number"
                v-model.number="settings.seed"
                min="1"
                max="999999"
                class="input-number"
              />
              <button class="btn-ghost seed-random" @click="randomiseSeed" :title="t('params.seedHint')">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 6.5a4.5 4.5 0 019 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M9.5 4l1.5 2.5-2.5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <span class="seed-hint">{{ t('params.seedHint') }}</span>
            </div>
          </div>
        </template>

      </div>
    </div>

    <!-- ── Section: Players ───────────────────────────────────── -->
    <div class="section-header">
      <h2>{{ t('nav.players') }}</h2>
      <div class="header-actions">
        <button class="btn-secondary" @click="showBulk = !showBulk">{{ t('player.bulkInput') }}</button>
        <button class="btn-primary" @click="store.addPlayer()">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          {{ t('player.addPlayer') }}
        </button>
      </div>
    </div>

    <div v-if="showBulk" class="bulk-panel">
      <textarea v-model="bulkText" :placeholder="t('player.bulkInput')" rows="5" />
      <div class="bulk-actions">
        <button class="btn-primary" @click="applyBulk">{{ t('player.applyNames') }}</button>
        <button class="btn-ghost" @click="showBulk = false">{{ t('actions.cancel') }}</button>
      </div>
    </div>

    <div v-if="store.players.length === 0" class="empty-hint">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" class="empty-icon">
        <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
        <path d="M16 10v6M16 20v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <p>{{ t('player.addPlayer') }}...</p>
    </div>

    <div v-else class="player-list">
      <div
        v-for="(player, idx) in store.players"
        :key="player.id"
        class="player-row"
        :class="{
          'row-absent': player.status === 'absent',
          'row-inactive': player.status === 'inactive'
        }"
      >
        <!-- Number -->
        <span class="player-num">{{ idx + 1 }}</span>

        <!-- Name -->
        <input
          v-model="player.name"
          :placeholder="`${t('player.player')} ${idx + 1}`"
          class="input-name"
          :disabled="player.status === 'inactive'"
        />

        <!-- Gender: M / F pill group -->
        <div class="pill-group" :class="{ disabled: player.status === 'inactive' }">
          <button
            class="pg-pill"
            :class="{ active: player.gender === 'M' }"
            :disabled="player.status === 'inactive'"
            @click="player.gender = 'M'"
          >{{ t('player.genderMale') }}</button>
          <button
            class="pg-pill"
            :class="{ active: player.gender === 'F' }"
            :disabled="player.status === 'inactive'"
            @click="player.gender = 'F'"
          >{{ t('player.genderFemale') }}</button>
        </div>

        <!-- Team: None / Red / Blue pill group — highlighted when a team mode is active -->
        <div class="pill-group" :class="{ disabled: player.status === 'inactive', 'team-relevant': teamModeActive }">
          <button
            class="pg-pill"
            :class="{ active: player.team === 'none' }"
            :disabled="player.status === 'inactive'"
            @click="player.team = 'none'"
          >{{ t('player.teamNone') }}</button>
          <button
            class="pg-pill pg-pill-red"
            :class="{ active: player.team === 'red' }"
            :disabled="player.status === 'inactive'"
            @click="player.team = 'red'"
          >{{ t('player.teamRed') }}</button>
          <button
            class="pg-pill pg-pill-blue"
            :class="{ active: player.team === 'blue' }"
            :disabled="player.status === 'inactive'"
            @click="player.team = 'blue'"
          >{{ t('player.teamBlue') }}</button>
        </div>

        <!-- Remove -->
        <button
          class="btn-danger-sm player-remove"
          @click="store.removePlayer(player.id)"
          :title="t('player.removePlayer')"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Constraints ────────────────────────────────────────── -->
    <div v-if="store.players.length >= 2" class="constraints-section">
      <h3>{{ t('player.addConstraint') }}</h3>
      <div class="constraint-form">
        <select v-model="constraintType" class="input-select">
          <option value="fixed">{{ t('player.fixedPartner') }}</option>
          <option value="forbidden">{{ t('player.forbidPartner') }}</option>
        </select>
        <select v-model="constraintA" class="input-select">
          <option value="">—</option>
          <option v-for="p in store.players" :key="p.id" :value="p.id">{{ playerLabel(p.id) }}</option>
        </select>
        <span class="constraint-sep">+</span>
        <select v-model="constraintB" class="input-select">
          <option value="">—</option>
          <option v-for="p in store.players" :key="p.id" :value="p.id">{{ playerLabel(p.id) }}</option>
        </select>
        <button class="btn-secondary" @click="addConstraint">{{ t('player.addConstraint') }}</button>
      </div>
      <p v-if="constraintError" class="error-msg">{{ constraintError }}</p>

      <div v-if="store.constraints.length" class="constraint-list">
        <div v-for="c in store.constraints" :key="`${c.a}-${c.b}`" class="constraint-tag" :class="c.type">
          <span class="constraint-icon">
            <svg v-if="c.type === 'fixed'" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M4 4a2 2 0 114 0M3 8h6a1 1 0 001-1V6H2v1a1 1 0 001 1z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </span>
          <span>{{ playerLabel(c.a) }} / {{ playerLabel(c.b) }}</span>
          <button class="btn-ghost-sm constraint-remove" @click="store.removeConstraint(c.a, c.b)">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.player-config { display: flex; flex-direction: column; gap: 1.5rem; }

/* ── Section header ──────────────────────────────────────────── */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.header-actions { display: flex; gap: 0.5rem; }

/* ── Bulk panel ──────────────────────────────────────────────── */
.bulk-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.bulk-panel textarea {
  width: 100%;
  font-family: var(--mono);
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;
  border-radius: 6px;
}
.bulk-actions { display: flex; gap: 0.5rem; }

/* ── Empty state ─────────────────────────────────────────────── */
.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
}
.empty-icon { color: var(--border); }

/* ── Player list ─────────────────────────────────────────────── */
.player-list { display: flex; flex-direction: column; gap: 0.25rem; }

.player-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  transition: background 0.15s;
  border: 1px solid transparent;
}
.player-row:hover { background: var(--surface); border-color: var(--border-subtle); }
.player-row.row-absent { background: rgba(202, 138, 4, 0.06); border-color: rgba(202, 138, 4, 0.2); }
.player-row.row-inactive { background: var(--surface); opacity: 0.5; }

@media (prefers-color-scheme: dark) {
  .player-row.row-absent { background: rgba(202, 138, 4, 0.08); border-color: rgba(202, 138, 4, 0.2); }
}

.player-num {
  width: 1.6rem;
  text-align: right;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-family: var(--mono);
  flex-shrink: 0;
}

.input-name { flex: 1; min-width: 7rem; }
.input-absence { width: 5rem; font-size: 0.85rem; text-align: center; }
.player-remove { padding: 0.2rem 0.3rem; }

/* ── Pill groups (gender / team) ─────────────────────────────── */
.pill-group {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.pill-group.disabled { opacity: 0.4; pointer-events: none; }

.pg-pill {
  padding: 0.22rem 0.55rem;
  border: none;
  background: transparent;
  font-size: 0.78rem;
  font-family: var(--sans);
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  border-right: 1px solid var(--border);
  user-select: none;
}
.pg-pill:last-child { border-right: none; }
.pg-pill:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.pg-pill:disabled { cursor: not-allowed; }

.pg-pill.active {
  background: var(--surface-2);
  color: var(--text-h);
  font-weight: 600;
}
.pg-pill-red.active  { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
.pg-pill-blue.active { background: rgba(37, 99, 235, 0.1);  color: #2563eb; }

@media (prefers-color-scheme: dark) {
  .pg-pill-red.active  { background: rgba(220, 38, 38, 0.18); color: #f87171; }
  .pg-pill-blue.active { background: rgba(96, 165, 250, 0.18); color: #60a5fa; }
}

/* ── Constraints ─────────────────────────────────────────────── */
.constraints-section {
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-subtle);
}
.constraints-section h3 { margin-bottom: 0.75rem; }

.constraint-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.input-select { flex: 0 0 auto; }
.constraint-sep { font-weight: 700; color: var(--text-muted); }

.constraint-list { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }

.constraint-tag {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 500;
  border: 1px solid;
}
.constraint-tag.fixed {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  border-color: rgba(37, 99, 235, 0.25);
}
.constraint-tag.forbidden {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.25);
}
.constraint-icon { display: flex; align-items: center; }
.constraint-remove { padding: 0.1rem 0.2rem; }

@media (prefers-color-scheme: dark) {
  .constraint-tag.fixed    { background: rgba(37, 99, 235, 0.15); color: #93c5fd; border-color: rgba(37, 99, 235, 0.3); }
  .constraint-tag.forbidden { background: rgba(220, 38, 38, 0.15); color: #fca5a5; border-color: rgba(220, 38, 38, 0.3); }
}

.error-msg {
  color: var(--danger);
  font-size: 0.82rem;
  margin-top: 0.4rem;
}

/* ── Parameters section ─────────────────────────────────────── */
.params-section {
  padding-top: 1.5rem;
  border-top: 2px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.params-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  overflow: hidden;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.15s;
}
.param-row:last-child { border-bottom: none; }
.param-row:hover { background: var(--surface); }

.param-label {
  width: 7rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-h);
  flex-shrink: 0;
}

.stepper {
  display: flex;
  align-items: center;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s, transform 0.1s, color 0.15s;
}
.stepper-btn:hover:not(:disabled) { background: var(--border); }
.stepper-btn:active:not(:disabled) { transform: scale(0.92); }
.stepper-btn:disabled { color: var(--text-muted); cursor: not-allowed; }
.stepper-val {
  width: 2.5rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--text-h);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  line-height: 2.2rem;
}

.rounds-input { display: flex; align-items: center; gap: 0.75rem; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text);
  user-select: none;
}
.input-number { width: 5.5rem; text-align: center; font-family: var(--mono); }

/* ── Team highlight when team mode active ────────────────────── */
.pill-group.team-relevant {
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.08);
}

/* ── Mode groups ─────────────────────────────────────────────── */
.mode-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
}

.mode-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.mode-group-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.mode-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }

/* Toggle pill — stays active until clicked again */
.pill-toggle.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 2px 8px var(--accent-glow);
}

/* Mode description row */
.param-row-desc {
  background: var(--surface);
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.mode-desc-icon { color: var(--text-muted); display: flex; align-items: center; flex-shrink: 0; }
.mode-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  flex: 1;
  min-width: 0;
}
.mode-warn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--warning);
  font-weight: 500;
  flex-shrink: 0;
}

/* Seed row */
.seed-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.seed-random {
  padding: 0.3rem 0.5rem;
  flex-shrink: 0;
}
.seed-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.pill {
  padding: 0.32rem 0.8rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  font-size: 0.82rem;
  font-family: var(--sans);
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}
.pill:hover { border-color: var(--accent-border); color: var(--accent); }
.pill:active { transform: scale(0.96); }
.pill.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 2px 8px var(--accent-glow);
  font-weight: 600;
}

@media (max-width: 640px) {
  .param-row { padding: 0.8rem 0.9rem; }
  .param-label { width: auto; min-width: 5rem; }
  .param-row-mode { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .player-row { gap: 0.3rem; }
}
</style>
