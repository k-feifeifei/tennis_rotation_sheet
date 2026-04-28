import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

let _nextId = 1

function makePlayer(name = '') {
  return { id: _nextId++, name, gender: 'M', team: 'none', status: 'active', absenceRounds: 0 }
}

export const usePlayersStore = defineStore('players', () => {
  const players = ref([])
  const constraints = ref([]) // { type: 'fixed'|'forbidden', a: id, b: id }

  function addPlayer(name = '') {
    players.value.push(makePlayer(name))
  }

  function removePlayer(id) {
    players.value = players.value.filter(p => p.id !== id)
    constraints.value = constraints.value.filter(c => c.a !== id && c.b !== id)
  }

  function setNames(names) {
    const trimmed = names.map(n => n.trim()).filter(Boolean)
    while (players.value.length < trimmed.length) players.value.push(makePlayer())
    players.value = players.value.slice(0, trimmed.length)
    trimmed.forEach((name, i) => { players.value[i].name = name })
  }

  function setStatus(id, status) {
    const p = players.value.find(x => x.id === id)
    if (p) {
      p.status = status
      if (status !== 'absent') p.absenceRounds = 0
    }
  }

  function setAbsenceRounds(id, n) {
    const p = players.value.find(x => x.id === id)
    if (p) p.absenceRounds = Math.max(0, n)
  }

  function addConstraint(type, a, b) {
    const [lo, hi] = a < b ? [a, b] : [b, a]
    const existing = constraints.value.find(c => c.a === lo && c.b === hi)
    if (existing) return existing.type === type ? null : 'conflict'
    constraints.value.push({ type, a: lo, b: hi })
    return null
  }

  function removeConstraint(a, b) {
    const [lo, hi] = a < b ? [a, b] : [b, a]
    constraints.value = constraints.value.filter(c => !(c.a === lo && c.b === hi))
  }

  const conflictPairs = computed(() => {
    const fixed = new Set()
    const forbidden = new Set()
    constraints.value.forEach(c => {
      const key = `${c.a}-${c.b}`
      if (c.type === 'fixed') fixed.add(key)
      else forbidden.add(key)
    })
    return [...fixed].filter(k => forbidden.has(k))
  })

  const hasConflicts = computed(() => conflictPairs.value.length > 0)

  function $reset() {
    players.value = []
    constraints.value = []
    _nextId = 1
  }

  function hydrate(data) {
    if (!data) return
    players.value = (data.players ?? []).map(p => ({
      status: 'active', absenceRounds: 0, ...p,
    }))
    constraints.value = data.constraints ?? []
    _nextId = (data.players ?? []).reduce((m, p) => Math.max(m, p.id + 1), 1)
  }

  function serialize() {
    return { players: players.value, constraints: constraints.value }
  }

  return {
    players, constraints,
    addPlayer, removePlayer, setNames,
    setStatus, setAbsenceRounds,
    addConstraint, removeConstraint,
    conflictPairs, hasConflicts,
    $reset, hydrate, serialize,
  }
})
