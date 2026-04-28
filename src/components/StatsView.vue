<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayersStore } from '../stores/players'
import { useScheduleStore } from '../stores/schedule'

const props = defineProps({
  upToRound: { type: Number, default: null }, // null = all rounds; number = show up to this round index (inclusive)
})
const emit = defineEmits(['clear-round'])

const { t } = useI18n()
const playersStore = usePlayersStore()
const scheduleStore = useScheduleStore()

const selected = ref(null) // single player id or null

function playerName(id) {
  const p = playersStore.players.find(x => x.id === id)
  if (!p) return `#${id}`
  const idx = playersStore.players.indexOf(p) + 1
  return p.name || `${t('player.player')} ${idx}`
}

function playerInfo(id) {
  return playersStore.players.find(x => x.id === id)
}

function toggleSelect(id) {
  selected.value = selected.value === id ? null : id
}

function winRate(stats) {
  const total = stats.wins + stats.losses
  return total === 0 ? '—' : `${Math.round(stats.wins / total * 100)}%`
}

// Slice of rounds to consider based on upToRound prop
const visibleRounds = computed(() => {
  if (props.upToRound === null) return scheduleStore.rounds
  return scheduleStore.rounds.slice(0, props.upToRound + 1)
})

const visibleScores = computed(() => {
  if (props.upToRound === null) return scheduleStore.scores
  return scheduleStore.scores.slice(0, props.upToRound + 1)
})

const pairKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`

// Recompute playerStats restricted to visibleRounds
const playerStats = computed(() => {
  const stats = {}
  const ensure = id => {
    if (!stats[id]) stats[id] = { played: 0, benched: 0, wins: 0, losses: 0, pf: 0, pa: 0 }
  }
  visibleRounds.value.forEach((round, ri) => {
    const roundScores = visibleScores.value[ri] ?? []
    round.bench.forEach(id => { ensure(id); stats[id].benched++ })
    round.courts.forEach((court, ci) => {
      const sc = roundScores[ci] ?? { a: null, b: null }
      ;[...court.teamA, ...court.teamB].forEach(id => { ensure(id); stats[id].played++ })
      if (sc.a !== null && sc.b !== null) {
        const aWon = sc.a > sc.b
        court.teamA.forEach(id => {
          stats[id].pf += sc.a; stats[id].pa += sc.b
          if (aWon) stats[id].wins++; else stats[id].losses++
        })
        court.teamB.forEach(id => {
          stats[id].pf += sc.b; stats[id].pa += sc.a
          if (!aWon) stats[id].wins++; else stats[id].losses++
        })
      }
    })
  })
  return stats
})

// Recompute pairMatrix restricted to visibleRounds
const pairMatrix = computed(() => {
  const mat = {}
  const ensure = (a, b) => {
    const k = pairKey(a, b)
    if (!mat[k]) mat[k] = { together: 0, togetherWins: 0, versus: 0, versusWinsLo: 0 }
    return mat[k]
  }
  visibleRounds.value.forEach((round, ri) => {
    const roundScores = visibleScores.value[ri] ?? []
    round.courts.forEach((court, ci) => {
      const sc = roundScores[ci] ?? { a: null, b: null }
      const hasScore = sc.a !== null && sc.b !== null
      const aWon = hasScore && sc.a > sc.b
      const bWon = hasScore && sc.b > sc.a
      const [a1, a2] = court.teamA
      const [b1, b2] = court.teamB
      const pa = ensure(a1, a2)
      pa.together++
      if (aWon) pa.togetherWins++
      const pb = ensure(b1, b2)
      pb.together++
      if (bWon) pb.togetherWins++
      ;[a1, a2].forEach(a => [b1, b2].forEach(b => {
        const e = ensure(a, b)
        e.versus++
        if (hasScore) {
          const loOnTeamA = a < b
          if (loOnTeamA ? aWon : bWon) e.versusWinsLo++
        }
      }))
    })
  })
  return mat
})

function getPairInfo(a, b) {
  if (a === b) return null
  return pairMatrix.value[pairKey(a, b)] ?? { together: 0, togetherWins: 0, versus: 0, versusWinsLo: 0 }
}

function versusWinsFor(aId, bId) {
  const info = getPairInfo(aId, bId)
  if (!info) return 0
  return aId < bId ? info.versusWinsLo : info.versus - info.versusWinsLo
}

const matrixPlayers = computed(() => playersStore.players)

function cellClass(id1, id2) {
  if (id1 === id2) return 'cell-self'
  const info = getPairInfo(id1, id2)
  if (info && info.versus === 0 && info.together === 0) return 'cell-zero'
  return ''
}

const isGenerated = computed(() => scheduleStore.generated)

const roundLabel = computed(() => {
  if (props.upToRound === null) return t('stats.allRounds')
  return t('stats.upToRound', { n: props.upToRound + 1 })
})
</script>

<template>
  <div class="stats-view">
    <div v-if="isGenerated" class="stats-header">
      <div class="round-context">
        <span class="round-label">{{ roundLabel }}</span>
        <button v-if="upToRound !== null" class="btn-ghost btn-sm" @click="emit('clear-round')">
          {{ t('stats.allRounds') }}
        </button>
      </div>
    </div>

    <div v-if="!isGenerated" class="empty-hint">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true" class="empty-icon">
        <rect x="3" y="3" width="30" height="30" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
        <path d="M10 18h16M18 10v16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <p>{{ t('schedule.generate') }}...</p>
    </div>

    <template v-else>
      <!-- Summary table -->
      <div class="table-wrap">
        <table class="summary-table">
          <thead>
            <tr>
              <th class="th-name">{{ t('stats.player') }}</th>
              <th>{{ t('stats.played') }}</th>
              <th>{{ t('stats.benched') }}</th>
              <th>{{ t('stats.wins') }}</th>
              <th>{{ t('stats.losses') }}</th>
              <th>{{ t('stats.winRate') }}</th>
              <th>{{ t('stats.pointsFor') }}</th>
              <th>{{ t('stats.pointsAgainst') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in playersStore.players"
              :key="p.id"
              :class="{ selected: selected === p.id }"
              @click="toggleSelect(p.id)"
            >
              <td class="name-cell">{{ playerName(p.id) }}</td>
              <template v-if="playerStats[p.id]">
                <td>{{ playerStats[p.id].played }}</td>
                <td>{{ playerStats[p.id].benched }}</td>
                <td class="td-win">{{ playerStats[p.id].wins }}</td>
                <td class="td-loss">{{ playerStats[p.id].losses }}</td>
                <td class="td-rate">{{ winRate(playerStats[p.id]) }}</td>
                <td class="td-mono">{{ playerStats[p.id].pf }}</td>
                <td class="td-mono">{{ playerStats[p.id].pa }}</td>
              </template>
              <template v-else>
                <td colspan="7" class="td-empty">—</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail panel for selected player -->
      <div v-if="selected !== null" class="detail-panel">
        <div class="detail-card">
          <div class="detail-header">
            <strong class="detail-name">{{ playerName(selected) }}</strong>
            <span v-if="playerInfo(selected)" class="detail-meta">
              {{ playerInfo(selected).gender === 'M' ? t('player.genderMale') : t('player.genderFemale') }}
              <template v-if="playerInfo(selected).team !== 'none'">
                <span class="meta-dot">·</span>
                <span :class="playerInfo(selected).team === 'red' ? 'team-red' : 'team-blue'">
                  {{ playerInfo(selected).team === 'red' ? t('player.teamRed') : t('player.teamBlue') }}
                </span>
              </template>
            </span>
            <button class="detail-close btn-ghost-sm" @click="selected = null">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="pair-list">
            <div
              v-for="p2 in playersStore.players.filter(p => p.id !== selected)"
              :key="p2.id"
              class="pair-row"
            >
              <span class="pair-name">{{ playerName(p2.id) }}</span>
              <span class="pair-stat together">
                {{ t('stats.together') }}: <strong>{{ getPairInfo(selected, p2.id)?.together ?? 0 }}</strong>
                <span v-if="getPairInfo(selected, p2.id)?.togetherWins" class="win-badge">
                  ({{ getPairInfo(selected, p2.id).togetherWins }}W)
                </span>
              </span>
              <span class="pair-stat versus">
                {{ t('stats.versus') }}: <strong>{{ getPairInfo(selected, p2.id)?.versus ?? 0 }}</strong>
                <span v-if="getPairInfo(selected, p2.id)?.versus" class="win-badge">
                  ({{ versusWinsFor(selected, p2.id) }}W)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pairwise matrix -->
      <div v-if="matrixPlayers.length > 0 && matrixPlayers.length <= 24" class="matrix-section">
        <div class="matrix-header">
          <h3>{{ t('stats.matrixTitle') }}</h3>
          <div class="matrix-legend">
            <span class="leg-item"><span class="leg-swatch leg-together"></span> {{ t('stats.together') }}</span>
            <span class="leg-item"><span class="leg-swatch leg-versus"></span> {{ t('stats.versus') }}</span>
            <span class="leg-item"><span class="leg-swatch leg-zero"></span> 0</span>
          </div>
        </div>
        <div class="matrix-scroll">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="corner"></th>
                <th
                  v-for="p in matrixPlayers"
                  :key="p.id"
                  class="matrix-head col-head"
                  :class="{ 'head-selected': selected === p.id }"
                  @click="toggleSelect(p.id)"
                  :title="playerName(p.id)"
                >{{ matrixPlayers.indexOf(p) + 1 }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p1 in matrixPlayers" :key="p1.id">
                <th
                  class="matrix-head row-head"
                  :class="{ 'head-selected': selected === p1.id }"
                  @click="toggleSelect(p1.id)"
                  :title="playerName(p1.id)"
                >{{ matrixPlayers.indexOf(p1) + 1 }}</th>
                <td
                  v-for="p2 in matrixPlayers"
                  :key="p2.id"
                  class="matrix-cell"
                  :class="[
                    cellClass(p1.id, p2.id),
                    { 'cell-highlighted': selected === p1.id || selected === p2.id },
                    { 'cell-selected-cross': selected === p1.id && selected === p2.id && p1.id !== p2.id }
                  ]"
                >
                  <template v-if="p1.id === p2.id">
                    <span class="cell-diagonal">{{ playerStats[p1.id]?.played ?? 0 }}</span>
                  </template>
                  <template v-else>
                    <div class="cell-inner">
                      <span class="cell-together">
                        {{ getPairInfo(p1.id, p2.id)?.together ?? 0 }}
                        <span v-if="getPairInfo(p1.id, p2.id)?.togetherWins" class="cell-wins">
                          ({{ getPairInfo(p1.id, p2.id).togetherWins }}W)
                        </span>
                      </span>
                      <span class="cell-sep">/</span>
                      <span class="cell-versus">
                        {{ getPairInfo(p1.id, p2.id)?.versus ?? 0 }}
                        <span v-if="getPairInfo(p1.id, p2.id)?.versus" class="cell-wins">
                          ({{ versusWinsFor(p1.id, p2.id) }}W)
                        </span>
                      </span>
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-view { display: flex; flex-direction: column; gap: 1.5rem; }

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.round-context {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.round-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
}

.btn-sm {
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
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

/* ── Summary table ───────────────────────────────────────────── */
.table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border-subtle); }

.summary-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.summary-table th,
.summary-table td {
  padding: 0.5rem 0.7rem;
  border-bottom: 1px solid var(--border-subtle);
  text-align: center;
  white-space: nowrap;
}
.summary-table tr:last-child td { border-bottom: none; }
.summary-table thead th {
  background: var(--surface);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  color: var(--text-muted);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
}
.summary-table .th-name { text-align: left; }
.summary-table tr.selected td { background: var(--accent-bg); }
.summary-table tbody tr { cursor: pointer; transition: background 0.15s; }
.summary-table tbody tr:hover:not(.selected) { background: var(--surface); }

.name-cell { text-align: left; font-weight: 600; color: var(--text-h); }
.td-win  { color: var(--success); font-weight: 700; font-family: var(--mono); }
.td-loss { color: var(--danger); font-family: var(--mono); }
.td-rate { font-weight: 600; }
.td-mono { font-family: var(--mono); }
.td-empty { color: var(--text-muted); }

/* ── Detail panel ────────────────────────────────────────────── */
.detail-panel { display: flex; }

.detail-card {
  flex: 1;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 0.9rem 1rem;
  background: var(--surface);
}

.detail-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
}

.detail-name { font-size: 0.95rem; color: var(--text-h); }

.detail-meta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  flex: 1;
}

.meta-dot { color: var(--border); }
.team-red { color: #dc2626; font-weight: 600; }
.team-blue { color: #2563eb; font-weight: 600; }

.detail-close { margin-left: auto; }

.pair-list { display: flex; flex-direction: column; gap: 0; max-height: 280px; overflow-y: auto; }

.pair-row {
  display: flex;
  gap: 0.6rem;
  font-size: 0.8rem;
  padding: 0.3rem 0.35rem;
  border-radius: 5px;
  transition: background 0.12s;
}
.pair-row:hover { background: var(--surface-2); }

.pair-name { flex: 1; font-weight: 500; min-width: 5rem; color: var(--text-h); }
.pair-stat { white-space: nowrap; color: var(--text-muted); }
.pair-stat.together { color: #2563eb; }
.pair-stat.versus   { color: var(--success); }
.win-badge { opacity: 0.7; font-size: 0.75em; margin-left: 0.15em; }

/* ── Matrix ──────────────────────────────────────────────────── */
.matrix-section { display: flex; flex-direction: column; gap: 0.6rem; }

.matrix-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.matrix-header h3 { margin: 0; }

.matrix-legend { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.leg-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.76rem;
  color: var(--text-muted);
}
.leg-swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.leg-together { background: #2563eb; }
.leg-versus   { background: var(--success); }
.leg-zero     { background: var(--danger-bg); border: 1px solid var(--danger-border); }

.matrix-scroll { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-subtle); }
.matrix-table { border-collapse: collapse; font-size: 0.72rem; }
.matrix-table th,
.matrix-table td { border: 1px solid var(--border-subtle); text-align: center; padding: 0.2rem 0.25rem; }

.matrix-head {
  background: var(--surface);
  cursor: pointer;
  min-width: 2rem;
  font-weight: 600;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
}
.matrix-head:hover { background: var(--accent-bg); color: var(--accent); }
.head-selected { background: var(--accent-bg) !important; color: var(--accent) !important; font-weight: 700; }
.corner { background: var(--surface); }

.matrix-cell { min-width: 3.2rem; }
.cell-self { background: var(--surface-2); }
.cell-zero { background: rgba(220, 38, 38, 0.05); }
.cell-highlighted { background: color-mix(in srgb, var(--accent-bg) 50%, transparent); }
.cell-selected-cross { background: var(--accent-bg); outline: 2px solid var(--accent-border); }

@media (prefers-color-scheme: dark) {
  .cell-self { background: var(--surface-2); }
  .cell-zero { background: rgba(220, 38, 38, 0.1); }
}

.cell-inner { display: flex; align-items: center; justify-content: center; gap: 1px; flex-wrap: wrap; }
.cell-diagonal { font-weight: 700; color: var(--text-h); font-family: var(--mono); }
.cell-together { color: #2563eb; }
.cell-sep { color: var(--border); margin: 0 1px; }
.cell-versus { color: var(--success); }
.cell-wins { font-size: 0.68em; opacity: 0.75; }
</style>
