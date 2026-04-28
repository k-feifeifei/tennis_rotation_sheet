<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayersStore } from '../stores/players'

const { t } = useI18n()
const store = usePlayersStore()

const bulkText = ref('')
const showBulk = ref(false)
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

const STATUS_CYCLE = ['active', 'absent', 'inactive']

function cycleStatus(player) {
  const idx = STATUS_CYCLE.indexOf(player.status)
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
  store.setStatus(player.id, next)
}

function statusLabel(s) {
  return { active: t('player.statusActive'), absent: t('player.statusAbsent'), inactive: t('player.statusInactive') }[s] ?? s
}

const genders = computed(() => [
  { value: 'M', label: t('player.genderMale') },
  { value: 'F', label: t('player.genderFemale') },
])

const teams = computed(() => [
  { value: 'none', label: t('player.teamNone') },
  { value: 'red', label: t('player.teamRed') },
  { value: 'blue', label: t('player.teamBlue') },
])

function playerLabel(id) {
  const p = store.players.find(x => x.id === id)
  return p ? `#${store.players.indexOf(p) + 1} ${p.name || t('player.player')}` : `#${id}`
}
</script>

<template>
  <div class="player-config">
    <div class="section-header">
      <h2>{{ t('nav.players') }}</h2>
      <div class="header-actions">
        <button class="btn-secondary" @click="showBulk = !showBulk">{{ t('player.bulkInput') }}</button>
        <button class="btn-primary" @click="store.addPlayer()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          {{ t('player.addPlayer') }}
        </button>
      </div>
    </div>

    <div v-if="showBulk" class="bulk-panel">
      <textarea v-model="bulkText" :placeholder="t('player.bulkInput')" rows="6" />
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
        :class="{ 'row-absent': player.status === 'absent', 'row-inactive': player.status === 'inactive' }"
      >
        <span class="player-num">{{ idx + 1 }}</span>
        <input
          v-model="player.name"
          :placeholder="`${t('player.player')} ${idx + 1}`"
          class="input-name"
          :disabled="player.status === 'inactive'"
        />
        <select v-model="player.gender" class="input-select" :disabled="player.status === 'inactive'">
          <option v-for="g in genders" :key="g.value" :value="g.value">{{ g.label }}</option>
        </select>
        <select v-model="player.team" class="input-select" :disabled="player.status === 'inactive'">
          <option v-for="tm in teams" :key="tm.value" :value="tm.value">{{ tm.label }}</option>
        </select>

        <button
          class="status-badge"
          :class="`status-${player.status}`"
          :title="t('player.statusHint')"
          @click="cycleStatus(player)"
        >{{ statusLabel(player.status) }}</button>

        <template v-if="player.status === 'absent'">
          <input
            type="number"
            :value="player.absenceRounds"
            min="1"
            max="99"
            class="input-absence"
            :placeholder="t('player.absenceRounds')"
            @change="e => store.setAbsenceRounds(player.id, Number(e.target.value))"
          />
        </template>

        <button class="btn-danger-sm player-remove" @click="store.removePlayer(player.id)" :title="t('actions.remove') || 'Remove'">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

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
.player-config { display: flex; flex-direction: column; gap: 1.25rem; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.header-actions { display: flex; gap: 0.5rem; }

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
  min-height: 120px;
  border-radius: 6px;
}
.bulk-actions { display: flex; gap: 0.5rem; }

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
}
.empty-icon { color: var(--border); }

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

.player-num {
  width: 1.6rem;
  text-align: right;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-family: var(--mono);
  flex-shrink: 0;
}
.input-name { flex: 1; min-width: 7rem; }
.input-select { flex: 0 0 auto; }
.input-absence { width: 5rem; font-size: 0.85rem; text-align: center; }

.status-badge {
  padding: 0.15rem 0.55rem;
  border-radius: 20px;
  border: 1px solid;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
  letter-spacing: 0.01em;
}
.status-active  { background: rgba(22, 163, 74, 0.1); color: #15803d; border-color: rgba(22, 163, 74, 0.3); }
.status-absent  { background: rgba(202, 138, 4, 0.1); color: #a16207; border-color: rgba(202, 138, 4, 0.3); }
.status-inactive { background: var(--surface-2); color: var(--text-muted); border-color: var(--border); }
.status-active:hover  { background: rgba(22, 163, 74, 0.18); }
.status-absent:hover  { background: rgba(202, 138, 4, 0.18); }
.status-inactive:hover { background: var(--border); }

@media (prefers-color-scheme: dark) {
  .player-row.row-absent { background: rgba(202, 138, 4, 0.08); border-color: rgba(202, 138, 4, 0.2); }
  .status-active  { background: rgba(74, 222, 128, 0.1); color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }
  .status-absent  { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border-color: rgba(251, 191, 36, 0.3); }
}

.player-remove { padding: 0.2rem 0.3rem; }

.constraints-section {
  margin-top: 0.25rem;
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
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
</style>
