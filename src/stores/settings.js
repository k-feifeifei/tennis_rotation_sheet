import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const courts = ref(2)
  const rounds = ref(0) // 0 = auto
  const mode = ref('normal') // 'normal' | 'mixed' | 'rivals' | 'mixedRivals'
  const coverage = ref(false) // full-coverage option (combinable with any mode)
  const seed = ref(42)   // shuffle seed for reproducible round ordering

  function $reset() {
    courts.value = 2
    rounds.value = 0
    mode.value = 'normal'
    coverage.value = false
    seed.value = 42
  }

  function hydrate(data) {
    if (!data) return
    courts.value = data.courts ?? 2
    rounds.value = data.rounds ?? 0
    // migrate legacy 'coverage' mode string
    if (data.mode === 'coverage') {
      mode.value = 'normal'
      coverage.value = true
    } else {
      mode.value = data.mode ?? 'normal'
      coverage.value = data.coverage ?? false
    }
    seed.value = data.seed ?? 42
  }

  function serialize() {
    return { courts: courts.value, rounds: rounds.value, mode: mode.value, coverage: coverage.value, seed: seed.value }
  }

  return { courts, rounds, mode, coverage, seed, $reset, hydrate, serialize }
})
