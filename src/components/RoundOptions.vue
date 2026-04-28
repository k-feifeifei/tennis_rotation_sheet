<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayersStore } from '../stores/players'

const props = defineProps({
  roundIndex: { type: Number, required: true },
})
const emit = defineEmits(['close', 'regenerate-from'])

const { t } = useI18n()
const store = usePlayersStore()

const constraintType = ref('fixed')
const constraintA = ref('')
const constraintB = ref('')
const constraintError = ref('')

function playerLabel(id) {
  const p = store.players.find(x => x.id === id)
  return p ? `#${store.players.indexOf(p) + 1} ${p.name || t('player.player')}` : `#${id}`
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

function regenerate() {
  emit('regenerate-from', props.roundIndex)
  emit('close')
}

const hasPlayers = computed(() => store.players.length > 0)
</script>

<template>
  <div class="round-options">
    <!-- Players attendance -->
    <section v-if="hasPlayers" class="ro-section">
      <h4 class="ro-section-title">{{ t('player.attendanceTitle') }}</h4>
      <div class="ro-player-list">
        <div
          v-for="(player, idx) in store.players"
          :key="player.id"
          class="ro-player-row"
          :class="{
            'rrow-absent': player.status === 'absent',
            'rrow-inactive': player.status === 'inactive'
          }"
        >
          <span class="rrow-num">{{ idx + 1 }}</span>
          <span class="rrow-name">{{ player.name || `${t('player.player')} ${idx + 1}` }}</span>

          <!-- Add player button for new entrant -->
          <div class="pill-group rrow-status">
            <button
              class="pg-pill"
              :class="{ active: player.status === 'active' }"
              @click="store.setStatus(player.id, 'active')"
            >{{ t('player.statusActive') }}</button>
            <button
              class="pg-pill pg-pill-warn"
              :class="{ active: player.status === 'absent' }"
              @click="store.setStatus(player.id, 'absent')"
            >{{ t('player.statusAbsent') }}</button>
            <button
              class="pg-pill pg-pill-muted"
              :class="{ active: player.status === 'inactive' }"
              @click="store.setStatus(player.id, 'inactive')"
            >{{ t('player.statusInactive') }}</button>
          </div>

          <input
            v-if="player.status === 'absent'"
            type="number"
            :value="player.absenceRounds"
            min="1"
            max="99"
            class="input-absence"
            :placeholder="t('player.absenceRounds')"
            @change="e => store.setAbsenceRounds(player.id, Number(e.target.value))"
          />
        </div>
      </div>

      <!-- Add new player mid-game -->
      <button class="btn-add-player btn-secondary" @click="store.addPlayer()">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {{ t('player.addPlayer') }}
      </button>
    </section>

    <!-- Constraints -->
    <section v-if="store.players.length >= 2" class="ro-section">
      <h4 class="ro-section-title">{{ t('player.addConstraint') }}</h4>
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
          <span>{{ playerLabel(c.a) }} / {{ playerLabel(c.b) }}</span>
          <span class="constraint-type-label">{{ c.type === 'fixed' ? t('player.fixedPartner') : t('player.forbidPartner') }}</span>
          <button class="btn-ghost-sm constraint-remove" @click="store.removeConstraint(c.a, c.b)">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Regenerate action -->
    <div class="ro-footer">
      <p class="ro-regen-hint">{{ t('roundOptions.regenHint', { n: roundIndex + 1 }) }}</p>
      <div class="ro-actions">
        <button class="btn-primary" @click="regenerate">{{ t('roundOptions.regenerateFrom') }}</button>
        <button class="btn-ghost" @click="emit('close')">{{ t('actions.cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.round-options { display: flex; flex-direction: column; gap: 1.25rem; }

.ro-section { display: flex; flex-direction: column; gap: 0.6rem; }

.ro-section-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0;
}

.ro-player-list { display: flex; flex-direction: column; gap: 0.2rem; }

.ro-player-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.3rem 0.4rem;
  border-radius: 7px;
  border: 1px solid transparent;
  transition: background 0.12s;
}
.ro-player-row:hover { background: var(--surface); border-color: var(--border-subtle); }
.rrow-absent  { background: rgba(202, 138, 4, 0.05); border-color: rgba(202, 138, 4, 0.18) !important; }
.rrow-inactive { opacity: 0.5; }

@media (prefers-color-scheme: dark) {
  .rrow-absent { background: rgba(202, 138, 4, 0.08); }
}

.rrow-num {
  width: 1.4rem;
  text-align: right;
  font-size: 0.75rem;
  font-family: var(--mono);
  color: var(--text-muted);
  flex-shrink: 0;
}
.rrow-name {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-h);
  min-width: 4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rrow-status { flex-shrink: 0; }

.input-absence { width: 4.5rem; font-size: 0.82rem; text-align: center; }

.btn-add-player {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  margin-top: 0.2rem;
}

/* Pill group (reuse global styles via inheritance; define locally for pg-pill-warn/muted) */
.pill-group {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.pg-pill {
  padding: 0.2rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-family: var(--sans);
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  border-right: 1px solid var(--border);
  user-select: none;
}
.pg-pill:last-child { border-right: none; }
.pg-pill:hover { background: var(--surface-2); color: var(--text); }
.pg-pill.active { background: var(--surface-2); color: var(--text-h); font-weight: 600; }
.pg-pill-warn.active  { background: rgba(202, 138, 4, 0.1); color: #a16207; }
.pg-pill-muted.active { background: var(--surface-2); color: var(--text-muted); font-weight: 600; }

@media (prefers-color-scheme: dark) {
  .pg-pill-warn.active { background: rgba(251,191,36,0.12); color: #fbbf24; }
}

/* Constraints */
.constraint-form {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.input-select { flex: 0 0 auto; }
.constraint-sep { font-weight: 700; color: var(--text-muted); }
.constraint-list { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.constraint-tag {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
.constraint-type-label { font-size: 0.7rem; color: var(--text-muted); }
.constraint-remove { padding: 0.1rem 0.2rem; }
.error-msg { color: var(--danger); font-size: 0.8rem; margin: 0; }

/* Footer */
.ro-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.ro-regen-hint { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
.ro-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>
