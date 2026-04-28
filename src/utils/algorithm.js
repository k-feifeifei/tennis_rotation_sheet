const pairKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`

/**
 * Generate rotation schedule rounds.
 *
 * Players may have status 'active' | 'absent' | 'inactive' and absenceRounds.
 * - inactive: excluded from all rounds
 * - absent:   skipped for absenceRounds rounds, then treated as active
 * - active:   always eligible
 *
 * @returns {Array} rounds — [{ courts:[{teamA:[id,id],teamB:[id,id]}], bench:[id] }]
 */
/**
 * @param {object} [priorState] - { playCount, partnerCount, opponentCount, absenceLeft, roundOffset }
 *   Pass when appending rounds so fairness continues from existing totals.
 */
export function generateSchedule(players, numCourts, numRounds, mode, constraints, seed = 42, coverage = false, priorState = null) {
  // Exclude permanently inactive players
  const pool = players.filter(p => p.status !== 'inactive')

  const autoRounds = numRounds === 0
    ? Math.max(10, Math.ceil(pool.length * (pool.length - 1) / 2 / numCourts))
    : numRounds

  const fixed = new Set()
  const forbidden = new Set()
  constraints.forEach(c => {
    if (c.type === 'fixed') fixed.add(pairKey(c.a, c.b))
    else forbidden.add(pairKey(c.a, c.b))
  })

  const byId = Object.fromEntries(pool.map(p => [p.id, p]))

  const partnerCount = priorState ? { ...priorState.partnerCount } : {}
  const opponentCount = priorState ? { ...priorState.opponentCount } : {}
  const playCount = {}
  pool.forEach(p => { playCount[p.id] = priorState?.playCount?.[p.id] ?? 0 })

  const getP = k => partnerCount[k] || 0
  const getO = k => opponentCount[k] || 0

  function incPartner(a, b) { const k = pairKey(a, b); partnerCount[k] = (partnerCount[k] || 0) + 1 }
  function incOpponent(a, b) { const k = pairKey(a, b); opponentCount[k] = (opponentCount[k] || 0) + 1 }

  // Absence countdown per player
  const absenceLeft = priorState ? { ...priorState.absenceLeft }
    : Object.fromEntries(pool.map(p => [p.id, p.status === 'absent' ? Math.max(0, p.absenceRounds || 0) : 0]))

  const roundOffset = priorState?.roundOffset ?? 0
  const rounds = []

  for (let ri = 0; ri < autoRounds; ri++) {
    // Eligible this round: not currently absent
    const eligible = pool.filter(p => absenceLeft[p.id] === 0)

    const perRound = numCourts * 4
    const sorted = [...eligible].sort((a, b) => playCount[a.id] - playCount[b.id] || a.id - b.id)
    const active = sorted.slice(0, Math.min(perRound, sorted.length))
    const bench = sorted.slice(active.length) // eligible but benched due to court limit

    const courts = buildCourts(active.map(p => p.id), numCourts, mode, byId, fixed, forbidden, getP, getO, roundOffset + ri, seed, coverage)

    bench.forEach(p => { /* bench count tracked in schedule store */ })
    courts.forEach(c => {
      ;[...c.teamA, ...c.teamB].forEach(id => playCount[id]++)
      incPartner(c.teamA[0], c.teamA[1])
      incPartner(c.teamB[0], c.teamB[1])
      ;[c.teamA[0], c.teamA[1]].forEach(a => [c.teamB[0], c.teamB[1]].forEach(b => incOpponent(a, b)))
    })

    rounds.push({ courts, bench: bench.map(p => p.id) })

    // Tick down absence counters
    pool.forEach(p => { if (absenceLeft[p.id] > 0) absenceLeft[p.id]-- })
  }

  return rounds
}

// ─── court builders ──────────────────────────────────────────────────────────

function buildCourts(ids, numCourts, mode, byId, fixed, forbidden, getP, getO, ri, seed, coverage = false) {
  const shuffled = shuffle([...ids], ((seed >>> 0) ^ (ri * 7919)) >>> 0)
  if (mode === 'mixed') return buildMixed(shuffled, numCourts, byId, fixed, forbidden, getP, getO, coverage)
  if (mode === 'rivals') return buildRivals(shuffled, numCourts, byId, fixed, forbidden, getP, getO, coverage)
  if (mode === 'mixedRivals') return buildMixedRivals(shuffled, numCourts, byId, fixed, forbidden, getP, getO, coverage)
  return buildNormal(shuffled, numCourts, fixed, forbidden, getP, getO, coverage)
}

/** Normal / Coverage mode: penalty-based greedy assignment.
 *  coverage=true uses heavier penalties to maximise unique partnerships and matchups. */
function buildNormal(ids, numCourts, fixed, forbidden, getP, getO, coverage = false) {
  const used = new Set()
  const courts = []
  for (let ci = 0; ci < numCourts; ci++) {
    const avail = ids.filter(id => !used.has(id))
    if (avail.length < 4) break
    const c = pickBestCourt(avail, fixed, forbidden, getP, getO, coverage)
    c.forEach(id => used.add(id))
    courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
  }
  return courts
}

/**
 * Mixed doubles: each team = 1M + 1F.
 * Falls back to same-gender pairs when mixed pool runs out.
 */
function buildMixed(ids, numCourts, byId, fixed, forbidden, getP, getO, coverage = false) {
  const used = new Set()
  const courts = []

  for (let ci = 0; ci < numCourts; ci++) {
    const males = ids.filter(id => !used.has(id) && byId[id]?.gender === 'M')
    const females = ids.filter(id => !used.has(id) && byId[id]?.gender === 'F')

    if (males.length >= 2 && females.length >= 2) {
      const c = pickMixedCourt(males, females, fixed, forbidden, getP, getO, coverage)
      c.forEach(id => used.add(id))
      courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
    } else {
      const avail = ids.filter(id => !used.has(id))
      if (avail.length < 4) break
      const c = pickBestCourt(avail, fixed, forbidden, getP, getO, coverage)
      c.forEach(id => used.add(id))
      courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
    }
  }
  return courts
}

/**
 * Rivals mode: same team stays together (red vs blue).
 * Falls back to normal when one colour runs out.
 */
function buildRivals(ids, numCourts, byId, fixed, forbidden, getP, getO, coverage = false) {
  const used = new Set()
  const courts = []

  for (let ci = 0; ci < numCourts; ci++) {
    const reds = ids.filter(id => !used.has(id) && byId[id]?.team === 'red')
    const blues = ids.filter(id => !used.has(id) && byId[id]?.team === 'blue')

    if (reds.length >= 2 && blues.length >= 2) {
      const c = pickRivalCourt(reds, blues, fixed, forbidden, getP, getO, coverage)
      c.forEach(id => used.add(id))
      courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
    } else {
      const avail = ids.filter(id => !used.has(id))
      if (avail.length < 4) break
      const c = pickBestCourt(avail, fixed, forbidden, getP, getO, coverage)
      c.forEach(id => used.add(id))
      courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
    }
  }
  return courts
}

/**
 * Mixed+Rivals: each team = 1red + 1blue AND 1M + 1F.
 * Falls back progressively to mixed-only, then normal.
 */
function buildMixedRivals(ids, numCourts, byId, fixed, forbidden, getP, getO, coverage = false) {
  const used = new Set()
  const courts = []

  const av = type => ids.filter(id => !used.has(id) && byId[id]?.team === type.team && byId[id]?.gender === type.gender)

  for (let ci = 0; ci < numCourts; ci++) {
    const redM = av({ team: 'red', gender: 'M' })
    const redF = av({ team: 'red', gender: 'F' })
    const blueM = av({ team: 'blue', gender: 'M' })
    const blueF = av({ team: 'blue', gender: 'F' })

    if (redM.length >= 1 && blueF.length >= 1 && blueM.length >= 1 && redF.length >= 1) {
      const c = pickMixedRivalsCourt(redM, redF, blueM, blueF, fixed, forbidden, getP, getO, coverage)
      c.forEach(id => used.add(id))
      courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
    } else {
      const males = ids.filter(id => !used.has(id) && byId[id]?.gender === 'M')
      const females = ids.filter(id => !used.has(id) && byId[id]?.gender === 'F')
      if (males.length >= 2 && females.length >= 2) {
        const c = pickMixedCourt(males, females, fixed, forbidden, getP, getO, coverage)
        c.forEach(id => used.add(id))
        courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
      } else {
        const avail = ids.filter(id => !used.has(id))
        if (avail.length < 4) break
        const c = pickBestCourt(avail, fixed, forbidden, getP, getO, coverage)
        c.forEach(id => used.add(id))
        courts.push({ teamA: [c[0], c[1]], teamB: [c[2], c[3]] })
      }
    }
  }
  return courts
}

// ─── low-level court pickers ─────────────────────────────────────────────────

/** Returns [a1, a2, b1, b2] with minimal partner/opponent repeat penalty.
 *  coverage=true boosts partner weight to 50 and opponent weight to 20,
 *  so the algorithm strongly prefers pairs that haven't played together/against each other yet.
 *  Fixed-partner constraint always overrides by applying a large negative bonus. */
function pickBestCourt(available, fixed, forbidden, getP, getO, coverage = false) {
  const pW = coverage ? 50 : 10  // partner repeat weight
  const oW = coverage ? 20 : 3   // opponent repeat weight
  const fixedBonus = 20          // fixed-partner constraint reward (always applies)

  const cands = available.slice(0, Math.min(available.length, 12))
  let bestScore = Infinity, best = null

  for (let i = 0; i < cands.length - 3; i++) {
    for (let j = i + 1; j < cands.length - 2; j++) {
      const a1 = cands[i], a2 = cands[j]
      const kA = pairKey(a1, a2)
      if (forbidden.has(kA)) continue
      const sA = getP(kA) * pW - (fixed.has(kA) ? fixedBonus : 0)

      for (let k = 0; k < cands.length - 1; k++) {
        if (k === i || k === j) continue
        for (let l = k + 1; l < cands.length; l++) {
          if (l === i || l === j) continue
          const b1 = cands[k], b2 = cands[l]
          const kB = pairKey(b1, b2)
          if (forbidden.has(kB)) continue
          const sB = getP(kB) * pW - (fixed.has(kB) ? fixedBonus : 0)
          const sOpp = getO(pairKey(a1, b1)) + getO(pairKey(a1, b2)) +
                       getO(pairKey(a2, b1)) + getO(pairKey(a2, b2))
          const score = sA + sB + sOpp * oW
          if (score < bestScore) { bestScore = score; best = [a1, a2, b1, b2] }
        }
      }
    }
  }
  return best ?? available.slice(0, 4)
}

/** Returns [a1, a2, b1, b2] where a1,a2 are red and b1,b2 are blue. */
function pickRivalCourt(reds, blues, fixed, forbidden, getP, getO, coverage = false) {
  const pW = coverage ? 50 : 10
  const oW = coverage ? 20 : 3
  const rc = reds.slice(0, 6), bc = blues.slice(0, 6)
  let bestScore = Infinity, best = null

  for (let i = 0; i < rc.length - 1; i++) {
    for (let j = i + 1; j < rc.length; j++) {
      const r1 = rc[i], r2 = rc[j]
      const kR = pairKey(r1, r2)
      if (forbidden.has(kR)) continue
      const sR = getP(kR) * pW - (fixed.has(kR) ? 20 : 0)

      for (let k = 0; k < bc.length - 1; k++) {
        for (let l = k + 1; l < bc.length; l++) {
          const b1 = bc[k], b2 = bc[l]
          const kB = pairKey(b1, b2)
          if (forbidden.has(kB)) continue
          const sB = getP(kB) * pW - (fixed.has(kB) ? 20 : 0)
          const sOpp = getO(pairKey(r1,b1))+getO(pairKey(r1,b2))+getO(pairKey(r2,b1))+getO(pairKey(r2,b2))
          const score = sR + sB + sOpp * oW
          if (score < bestScore) { bestScore = score; best = [r1, r2, b1, b2] }
        }
      }
    }
  }
  return best ?? [...reds.slice(0, 2), ...blues.slice(0, 2)]
}

/**
 * Returns [teamA_m, teamA_f, teamB_m, teamB_f].
 * Tries both male-female pairing options and picks lower penalty.
 */
function pickMixedCourt(males, females, fixed, forbidden, getP, getO, coverage = false) {
  const pW = coverage ? 50 : 10
  const oW = coverage ? 20 : 3
  const mc = males.slice(0, 6), fc = females.slice(0, 6)
  let bestScore = Infinity, best = null

  for (let i = 0; i < mc.length - 1; i++) {
    for (let j = i + 1; j < mc.length; j++) {
      const m1 = mc[i], m2 = mc[j]
      for (let k = 0; k < fc.length - 1; k++) {
        for (let l = k + 1; l < fc.length; l++) {
          const f1 = fc[k], f2 = fc[l]
          for (const [ta1, ta2, tb1, tb2] of [[m1,f1,m2,f2],[m1,f2,m2,f1]]) {
            const kA = pairKey(ta1, ta2), kB = pairKey(tb1, tb2)
            if (forbidden.has(kA) || forbidden.has(kB)) continue
            const sA = getP(kA)*pW - (fixed.has(kA)?20:0)
            const sB = getP(kB)*pW - (fixed.has(kB)?20:0)
            const sOpp = getO(pairKey(ta1,tb1))+getO(pairKey(ta1,tb2))+getO(pairKey(ta2,tb1))+getO(pairKey(ta2,tb2))
            const score = sA + sB + sOpp * oW
            if (score < bestScore) { bestScore = score; best = [ta1, ta2, tb1, tb2] }
          }
        }
      }
    }
  }
  return best ?? [males[0], females[0], males[1], females[1]]
}

/**
 * Returns [ta1, ta2, tb1, tb2] where each team = 1red+1blue AND 1M+1F.
 * teamA=[redM,blueF] vs teamB=[blueM,redF]  OR  teamA=[redF,blueM] vs teamB=[blueF,redM]
 */
function pickMixedRivalsCourt(redM, redF, blueM, blueF, fixed, forbidden, getP, getO, coverage = false) {
  const pW = coverage ? 50 : 10
  const oW = coverage ? 20 : 3
  const rmC = redM.slice(0,4), rfC = redF.slice(0,4), bmC = blueM.slice(0,4), bfC = blueF.slice(0,4)
  let bestScore = Infinity, best = null

  for (const rm of rmC) for (const bf of bfC) for (const bm of bmC) for (const rf of rfC) {
    if ([rm,bf,bm,rf].some((x,i,a)=>a.indexOf(x)!==i)) continue
    for (const [ta1,ta2,tb1,tb2] of [[rm,bf,bm,rf],[bm,rf,rm,bf]]) {
      const kA = pairKey(ta1,ta2), kB = pairKey(tb1,tb2)
      if (forbidden.has(kA)||forbidden.has(kB)) continue
      const sA = getP(kA)*pW-(fixed.has(kA)?20:0)
      const sB = getP(kB)*pW-(fixed.has(kB)?20:0)
      const sOpp = getO(pairKey(ta1,tb1))+getO(pairKey(ta1,tb2))+getO(pairKey(ta2,tb1))+getO(pairKey(ta2,tb2))
      const score = sA+sB+sOpp*oW
      if (score < bestScore) { bestScore = score; best = [ta1,ta2,tb1,tb2] }
    }
  }
  return best ?? [redM[0], blueF[0], blueM[0], redF[0]]
}

/**
 * Derive priorState from existing rounds so append-generate continues fairly.
 */
export function extractPriorState(rounds, players) {
  const playCount = {}
  const partnerCount = {}
  const opponentCount = {}
  players.forEach(p => { playCount[p.id] = 0 })

  rounds.forEach(round => {
    round.bench.forEach(id => { /* bench doesn't count as played */ })
    round.courts.forEach(court => {
      const [a1, a2] = court.teamA
      const [b1, b2] = court.teamB
      ;[a1, a2, b1, b2].forEach(id => { playCount[id] = (playCount[id] || 0) + 1 })
      const pk = (x, y) => x < y ? `${x}-${y}` : `${y}-${x}`
      partnerCount[pk(a1,a2)] = (partnerCount[pk(a1,a2)] || 0) + 1
      partnerCount[pk(b1,b2)] = (partnerCount[pk(b1,b2)] || 0) + 1
      ;[a1,a2].forEach(a => [b1,b2].forEach(b => {
        opponentCount[pk(a,b)] = (opponentCount[pk(a,b)] || 0) + 1
      }))
    })
  })

  // Reconstruct absenceLeft: start from player config, tick down once per round
  const absenceLeft = {}
  players.forEach(p => { absenceLeft[p.id] = p.status === 'absent' ? Math.max(0, p.absenceRounds || 0) : 0 })

  return { playCount, partnerCount, opponentCount, absenceLeft, roundOffset: rounds.length }
}

// Fisher-Yates shuffle with LCG seeded RNG for deterministic variation per round
function shuffle(arr, seed = 42) {
  let s = seed >>> 0
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000 }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
