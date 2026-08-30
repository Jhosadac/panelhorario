// src/components/ScheduleGrid.jsx
import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { DAYS, HOURS, HOUR_START, getPositionAndHeight, getDayIndex, formatTime, groupOverlaps, isToday } from '../utils/helpers'
import { getCourseColor } from '../utils/colors'

function ScheduleGrid() {
  const {
    schedules,
    courses,
    teachers,
    classrooms,
    selectedCourses,
    filterType,
    selectedClassroom,
    loading,
  } = useSchedule()

  const [tooltip, setTooltip] = useState(null)
  const gridRef = useRef(null)

  // Filtrar horarios
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      // Filtro por cursos seleccionados
      if (!selectedCourses.includes(s.course_id)) return false

      // Filtro por tipo
      if (filterType !== 'all') {
        const typeLower = s.type?.toLowerCase() || ''
        if (typeLower !== filterType) return false
      }

      // Filtro por aula
      if (selectedClassroom && s.classroom_id !== selectedClassroom) return false

      return true
    })
  }, [schedules, selectedCourses, filterType, selectedClassroom])

  // Agrupar horarios por día
  const schedulesByDay = useMemo(() => {
    const groups = {}
    DAYS.forEach(day => { groups[day] = [] })

    filteredSchedules.forEach(s => {
      if (groups[s.day_of_week]) {
        groups[s.day_of_week].push(s)
      }
    })

    return groups
  }, [filteredSchedules])

  // Para cada día, agrupar bloques superpuestos
  const groupedByDay = useMemo(() => {
    const result = {}
    DAYS.forEach(day => {
      const daySchedules = schedulesByDay[day] || []
      // Ordenar por hora de inicio
      const sorted = [...daySchedules].sort((a, b) => a.start_time.localeCompare(b.start_time))

      // Agrupar por superposición
      const groups = []
      for (const s of sorted) {
        let placed = false
        for (const g of groups) {
          const overlaps = g.some(item =>
            s.start_time < item.end_time && s.end_time > item.start_time
          )
          if (overlaps) {
            g.push(s)
            placed = true
            break
          }
        }
        if (!placed) {
          groups.push([s])
        }
      }
      result[day] = groups
    })
    return result
  }, [schedulesByDay])

  // Encontrar curso por id
  const findCourse = (id) => courses.find(c => c.id === id)
  const findTeacher = (id) => teachers.find(t => t.id === id)
  const findClassroom = (id) => classrooms.find(c => c.id === id)

  // Renderizar tooltip
  const renderTooltip = (schedule, event) => {
    const course = findCourse(schedule.course_id)
    const teacher = findTeacher(schedule.teacher_id)
    const classroom = findClassroom(schedule.classroom_id)

    if (!course) return

    const rect = event.currentTarget.getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: {
        code: course.code,
        name: course.name,
        teacher: teacher?.name || 'Sin asignar',
        section: schedule.section || '-',
        classroom: classroom?.name || 'Sin aula',
        time: `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`,
        type: schedule.type || '-',
      }
    })
  }

  const hideTooltip = () => setTooltip(null)

  // Calcular el ancho de los bloques en un grupo (para superposición)
  const getBlockWidthAndOffset = (group, index) => {
    const count = group.length
    if (count === 1) return { width: '100%', left: '0%' }
    // Distribuir uniformemente
    const width = 100 / count
    const left = index * width
    return { width: `${width}%`, left: `${left}%` }
  }

  // Obtener el color de fondo para un curso
  const getBgColor = (courseId) => {
    return getCourseColor(courseId)
  }

  // Obtener el color de texto (blanco o negro según contraste)
  const getTextColor = (hex) => {
    // Simple: si el color es muy claro, usar texto oscuro
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 160 ? '#1e293b' : '#ffffff'
  }

  const rowHeight = 60

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-center">
          <div className="text-3xl mb-3">⏳</div>
          <p>Cargando horarios...</p>
        </div>
      </div>
    )
  }

  if (filteredSchedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-center max-w-md">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-lg font-medium">No hay horarios para mostrar</p>
          <p className="text-sm text-slate-500 mt-1">
            Selecciona algunos cursos en el panel lateral para ver sus horarios.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-auto" ref={gridRef}>
      <div className="min-w-[800px]">
        {/* Encabezados de días */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10">
          <div className="schedule-cell-header bg-slate-800/95 backdrop-blur-sm rounded-tl-lg border-b-0">
            <span className="text-xs text-slate-500">Hora</span>
          </div>
          {DAYS.map(day => (
            <div
              key={day}
              className={`schedule-cell-header bg-slate-800/95 backdrop-blur-sm border-b-0 ${isToday(day) ? 'ring-1 ring-blue-500/30' : ''}`}
            >
              <div className="font-medium">{day}</div>
              <div className="text-[10px] text-slate-500 font-normal">
                {isToday(day) && '🟢 Hoy'}
              </div>
            </div>
          ))}
        </div>

        {/* Cuerpo de la cuadrícula */}
        <div className="relative">
          {HOURS.map((hour, idx) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)]">
              <div className="schedule-cell border-l-0 bg-slate-800/20 flex items-center justify-end pr-2">
                <span className="text-xs text-slate-500 font-mono">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              {DAYS.map(day => {
                const isTodayDay = isToday(day)
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`schedule-cell ${isTodayDay ? 'bg-slate-700/20 ring-1 ring-blue-500/10' : ''}`}
                  />
                )
              })}
            </div>
          ))}

          {/* Bloques de horarios */}
          {DAYS.map(day => {
            const groups = groupedByDay[day] || []
            const dayIndex = getDayIndex(day)

            return groups.map((group, groupIdx) => {
              // Cada grupo tiene bloques que se superponen
              return group.map((schedule, blockIdx) => {
                const course = findCourse(schedule.course_id)
                if (!course) return null

                const pos = getPositionAndHeight(
                  schedule.start_time,
                  schedule.end_time,
                  HOUR_START,
                  rowHeight
                )

                const { width, left } = getBlockWidthAndOffset(group, blockIdx)
                const color = getBgColor(course.id)
                const textColor = getTextColor(color)

                // Construir el nombre abreviado
                const shortName = course.name.length > 20
                  ? course.name.substring(0, 18) + '…'
                  : course.name

                return (
                  <div
                    key={`${schedule.id}-${day}`}
                    className="course-block"
                    style={{
                      top: pos.top,
                      height: pos.height,
                      left: `calc(${left} + 2px)`,
                      width: `calc(${width} - 4px)`,
                      backgroundColor: color,
                      color: textColor,
                      boxShadow: `0 2px 8px ${color}40`,
                      borderColor: `${color}60`,
                      zIndex: blockIdx + 1,
                    }}
                    onMouseEnter={(e) => renderTooltip(schedule, e)}
                    onMouseLeave={hideTooltip}
                    onMouseMove={(e) => {
                      if (tooltip) {
                        // Actualizar posición del tooltip
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip(prev => prev ? {
                          ...prev,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                        } : null)
                      }
                    }}
                  >
                    <div className="course-block-content">
                      <div className="course-block-name">
                        {shortName}
                      </div>
                      <div className="course-block-meta">
                        <span>{schedule.type || ''}</span>
                        {schedule.type && schedule.section && '·'}
                        <span>{schedule.section || ''}</span>
                        {schedule.section && findClassroom(schedule.classroom_id) && '·'}
                        <span className="truncate">
                          {findClassroom(schedule.classroom_id)?.name || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            })
          })}
        </div>
      </div>

      {/* Tooltip flotante */}
      {tooltip && (
        <div
          className="tooltip-bubble fixed pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="space-y-0.5">
            <div className="font-semibold text-sm flex items-center gap-2">
              <span className="text-blue-300">{tooltip.content.code}</span>
              <span className="text-slate-400 font-normal text-[11px]">·</span>
              <span className="font-normal text-sm">{tooltip.content.name}</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div>👨‍🏫 {tooltip.content.teacher}</div>
              <div className="flex gap-3">
                <span>📋 {tooltip.content.section}</span>
                <span>🏫 {tooltip.content.classroom}</span>
              </div>
              <div className="text-slate-400 text-[10px]">
                🕐 {tooltip.content.time} · {tooltip.content.type}
              </div>
            </div>
          </div>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1e293b',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default ScheduleGrid
