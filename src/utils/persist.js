const KEY = 'tennis-rotation-v2'

export function saveState(players, settings, schedule, session) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      players: players.serialize(),
      settings: settings.serialize(),
      schedule: schedule.serialize(),
      session: session.serialize(),
    }))
  } catch (_) {}
}

export function loadState(players, settings, schedule, session) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    players.hydrate(data.players)
    settings.hydrate(data.settings)
    schedule.hydrate(data.schedule)
    session.hydrate(data.session)
  } catch (_) {}
}
