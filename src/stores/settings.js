import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const courts = ref(2)
  const rounds = ref(0) // 0 = auto
  const mode = ref('normal') // 'normal' | 'mixed' | 'rivals' | 'mixedRivals'

  function $reset() {
    courts.value = 2
    rounds.value = 0
    mode.value = 'normal'
  }

  function hydrate(data) {
    if (!data) return
    courts.value = data.courts ?? 2
    rounds.value = data.rounds ?? 0
    mode.value = data.mode ?? 'normal'
  }

  function serialize() {
    return { courts: courts.value, rounds: rounds.value, mode: mode.value }
  }

  return { courts, rounds, mode, $reset, hydrate, serialize }
})
