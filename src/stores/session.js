import { defineStore } from 'pinia'
import { ref } from 'vue'

let _nextSessionId = 1

export const useSessionStore = defineStore('session', () => {
  // 'home' | 'setup' | 'active'
  const phase = ref('home')
  const history = ref([]) // [{ id, createdAt, playerCount, roundCount, snapshot }]

  function newSession() {
    phase.value = 'setup'
  }

  function activateSession() {
    phase.value = 'active'
  }

  function endSession(snapshot) {
    if (snapshot && (snapshot.rounds?.length > 0 || snapshot.players?.players?.length > 0)) {
      const existing = history.value.find(h => h.id === snapshot.id)
      if (existing) {
        Object.assign(existing, snapshot)
      } else {
        history.value.unshift({
          id: _nextSessionId++,
          createdAt: Date.now(),
          playerCount: snapshot.players?.players?.length ?? 0,
          roundCount: snapshot.rounds?.length ?? 0,
          ...snapshot,
        })
      }
    }
    phase.value = 'home'
  }

  function removeHistory(id) {
    history.value = history.value.filter(h => h.id !== id)
  }

  function $reset() {
    phase.value = 'home'
    history.value = []
  }

  function hydrate(data) {
    if (!data) return
    phase.value = data.phase ?? 'home'
    history.value = data.history ?? []
    _nextSessionId = history.value.reduce((m, h) => Math.max(m, (h.id ?? 0) + 1), 1)
  }

  function serialize() {
    return { phase: phase.value, history: history.value }
  }

  return { phase, history, newSession, activateSession, endSession, removeHistory, $reset, hydrate, serialize }
})
