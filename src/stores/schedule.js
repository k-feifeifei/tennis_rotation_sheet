import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useScheduleStore = defineStore('schedule', () => {
  // rounds: Array<{ courts: Array<{ teamA: [id,id], teamB: [id,id] }>, bench: id[] }>
  const rounds = ref([])
  // scores: Array<Array<{ a: number|null, b: number|null }>>
  const scores = ref([])

  const generated = computed(() => rounds.value.length > 0)

  function setRounds(newRounds) {
    rounds.value = newRounds
    scores.value = newRounds.map(r => r.courts.map(() => ({ a: null, b: null })))
  }

  function appendRounds(newRounds) {
    rounds.value = [...rounds.value, ...newRounds]
    scores.value = [...scores.value, ...newRounds.map(r => r.courts.map(() => ({ a: null, b: null })))]
  }

  function setScore(roundIdx, courtIdx, a, b) {
    scores.value[roundIdx][courtIdx] = { a, b }
  }

  function $reset() {
    rounds.value = []
    scores.value = []
  }

  function hydrate(data) {
    if (!data) return
    rounds.value = data.rounds ?? []
    scores.value = data.scores ?? []
  }

  function serialize() {
    return { rounds: rounds.value, scores: scores.value }
  }

  const playerStats = computed(() => {
    const stats = {}
    const ensure = id => {
      if (!stats[id]) stats[id] = { played: 0, benched: 0, wins: 0, losses: 0, pf: 0, pa: 0 }
    }
    rounds.value.forEach((round, ri) => {
      const roundScores = scores.value[ri] ?? []
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

  // Pairwise matrix: pairKey → { together, togetherWins, versus, versusWinsLo }
  // versusWinsLo = wins for the lower-id player when they are on opposite teams
  const pairMatrix = computed(() => {
    const mat = {}
    const key = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`
    const ensure = (a, b) => {
      const k = key(a, b)
      if (!mat[k]) mat[k] = { together: 0, togetherWins: 0, versus: 0, versusWinsLo: 0 }
      return mat[k]
    }

    rounds.value.forEach((round, ri) => {
      const roundScores = scores.value[ri] ?? []
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
            // versusWinsLo: win for lower-id player
            const loOnTeamA = a < b // a is lo, b is hi, a is on teamA
            if (loOnTeamA ? aWon : bWon) e.versusWinsLo++
          }
        }))
      })
    })
    return mat
  })

  return {
    rounds, scores, generated,
    setRounds, appendRounds, setScore,
    $reset, hydrate, serialize,
    playerStats, pairMatrix,
  }
})
