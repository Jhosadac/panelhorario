// src/utils/colors.js
export const COLORS = [
  '#FF6B6B', // 0 - Rojo suave
  '#4ECDC4', // 1 - Turquesa
  '#45B7D1', // 2 - Azul celeste
  '#96CEB4', // 3 - Verde menta
  '#FFEAA7', // 4 - Amarillo claro
  '#DDA0DD', // 5 - Ciruela claro
  '#98D8C8', // 6 - Verde agua
  '#F7DC6F', // 7 - Amarillo dorado
  '#BB8FCE', // 8 - Lila
  '#85C1E9', // 9 - Azul claro
]

export const COLORS_LIGHT = COLORS.map(c => c + '33') // con transparencia

export function getCourseColor(courseId, palette = COLORS) {
  if (!courseId) return palette[0]
  // Usar el id (string) para generar un índice consistente
  let hash = 0
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % palette.length
  return palette[index]
}

export function getCourseColorWithOpacity(courseId, opacity = 0.85) {
  const hex = getCourseColor(courseId)
  // Convertir hex a rgb con opacidad
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
