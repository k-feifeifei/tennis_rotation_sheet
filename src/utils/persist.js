const KEY = 'tennis-rotation-v1'

export function saveState(players, settings, schedule) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      players: players.serialize(),
      settings: settings.serialize(),
      schedule: schedule.serialize(),
    }))
  } catch (_) {}
}

export function loadState(players, settings, schedule) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    players.hydrate(data.players)
    settings.hydrate(data.settings)
    schedule.hydrate(data.schedule)
  } catch (_) {}
}
