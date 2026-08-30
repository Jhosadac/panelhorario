export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const HOUR_START = 6
export const HOUR_END = 23
export const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

export function formatTime(timeStr) {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
}

export function getHourFromTime(timeStr) {
  if (!timeStr) return 0
  return parseInt(timeStr.split(':')[0], 10)
}

export function getMinutesFromTime(timeStr) {
  if (!timeStr) return 0
  return parseInt(timeStr.split(':')[1], 10)
}

export function getPositionAndHeight(start, end, hourStart = HOUR_START, rowHeight = 60) {
  const startH = getHourFromTime(start)
  const startM = getMinutesFromTime(start)
  const endH = getHourFromTime(end)
  const endM = getMinutesFromTime(end)
  const top = ((startH - hourStart) + startM / 60) * rowHeight
  const height = ((endH - startH) + (endM - startM) / 60) * rowHeight
  return { top, height: Math.max(height, 30) }
}

export function getDayIndex(day) {
  return DAYS.indexOf(day)
}

export function getTodayDay() {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[new Date().getDay()]
}

export function isToday(day) {
  return getTodayDay() === day
}

export function isNowBetween(start, end) {
  const now = new Date()
  const nowH = now.getHours()
  const nowM = now.getMinutes()
  const nowTotal = nowH * 60 + nowM
  const startH = getHourFromTime(start)
  const startM = getMinutesFromTime(start)
  const endH = getHourFromTime(end)
  const endM = getMinutesFromTime(end)
  const startTotal = startH * 60 + startM
  const endTotal = endH * 60 + endM
  return nowTotal >= startTotal && nowTotal < endTotal
}
