import React, { useMemo, useState } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { DAYS, HOURS, HOUR_START, getPositionAndHeight, formatTime, isToday } from '../utils/helpers'
import { getCourseColor } from '../utils/colors'

const EPIES_SECTIONS = ['A', 'B', 'C', 'D', 'E']
const getSectionKey = (courseName, department) => `${courseName}|${department}`

function ScheduleGrid() {
  const {
    schedules,
    courses,
    activeSections,
    loading,
  } = useSchedule()

  const [tooltip, setTooltip] = useState(null)

  const activeKeys = useMemo(() => new Set(Object.keys(activeSections)), [activeSections])

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const inferredDept = EPIES_SECTIONS.includes(s.class) ? 'EPIES' : 'EPIEC'
      const key = getSectionKey(s.course_name, inferredDept)

      if (!activeKeys.has(key)) return false
      const selectedSections = activeSections[key] || []
      if (!selectedSections.includes(s.class)) return false

      return true
    })
  }, [schedules, activeKeys, activeSections])

  const groupedByDay = useMemo(() => {
    const result = {}
    DAYS.forEach(day => {
      const daySchedules = filteredSchedules.filter(s => s.day_of_week === day)
      const sorted = [...daySchedules].sort((a, b) => a.start_time.localeCompare(b.start_time))
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
  }, [filteredSchedules])

  const findCourse = (name) => courses.find(c => c.name === name)

  const showTooltip = (schedule, event) => {
    const course = findCourse(schedule.course_name)
    if (!course) return
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: {
        code: course.code,
        name: course.name,
        teacher: schedule.teacher_name || 'Sin asignar',
        section: schedule.class || '-',
        classroom: schedule.classroom || 'Sin aula',
        time: `${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`,
        type: schedule.category || '-',
      }
    })
  }
  const hideTooltip = () => setTooltip(null)

  const getBgColor = (courseName) => {
    const course = findCourse(courseName)
    return course ? getCourseColor(course.id) : '#6b7280'
  }

  const getTextColor = (hex) => {
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
        <div className="text-[#9E9E9E] text-center">
          <div className="text-3xl mb-3">⏳</div>
          <p>Cargando horarios...</p>
        </div>
      </div>
    )
  }

  if (filteredSchedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#9E9E9E] text-center max-w-md">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-lg font-medium">No hay horarios para mostrar</p>
          <p className="text-sm mt-1">
            Selecciona cursos y secciones, luego presiona <strong>"Aplicar"</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-auto">
      <div className="min-w-[800px]">
        {/* Encabezados */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10">
          <div className="schedule-cell-header bg-[#6B1F1F] rounded-tl-lg border-b-0">
            <span className="text-xs text-white">Hora</span>
          </div>
          {DAYS.map(day => (
            <div
              key={day}
              className={`schedule-cell-header bg-[#6B1F1F] border-b-0 ${isToday(day) ? 'ring-2 ring-[#F2545B]' : ''}`}
            >
              <div className="font-medium">{day}</div>
              <div className="text-[10px] text-[#E8DFB5] font-normal">
                {isToday(day) && '🟢 Hoy'}
              </div>
            </div>
          ))}
        </div>

        {/* Cuerpo */}
        <div className="relative">
          {/* Filas de horas */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)]">
              <div className="schedule-cell border-l-0 bg-[#E8DFB5]/10 flex items-center justify-end pr-2">
                <span className="text-xs text-[#9E9E9E] font-mono">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              {DAYS.map(day => (
                <div
                  key={`${day}-${hour}`}
                  className={`schedule-cell ${isToday(day) ? 'bg-slate-700/20 ring-1 ring-[#F2545B]/30' : ''}`}
                />
              ))}
            </div>
          ))}

          {/* Bloques por día */}
          {DAYS.map((day, dayIndex) => {
            const groups = groupedByDay[day] || []
            if (groups.length === 0) return null

            return (
              <div
                key={`day-container-${day}`}
                className="absolute top-0 h-full pointer-events-none"
                style={{
                  left: `calc(60px + (${dayIndex} * (100% - 60px) / 7))`,
                  width: `calc((100% - 60px) / 7)`,
                }}
              >
                {groups.map((group) =>
                  group.map((schedule, blockIdx) => {
                    const course = findCourse(schedule.course_name)
                    if (!course) return null

                    const pos = getPositionAndHeight(
                      schedule.start_time,
                      schedule.end_time,
                      HOUR_START,
                      rowHeight
                    )
                    const count = group.length
                    const width = count === 1 ? '100%' : `${100 / count}%`
                    const left = count === 1 ? '0%' : `${blockIdx * (100 / count)}%`
                    const color = getBgColor(course.name)
                    const textColor = getTextColor(color)

                    const shortName = course.name.length > 20
                      ? course.name.substring(0, 18) + '…'
                      : course.name

                    return (
                      <div
                        key={`${schedule.id}-${day}`}
                        className="course-block pointer-events-auto"
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
                        onMouseEnter={(e) => showTooltip(schedule, e)}
                        onMouseLeave={hideTooltip}
                      >
                        <div className="course-block-content">
                          <div className="course-block-name">{shortName}</div>
                          <div className="course-block-meta">
                            <span>{schedule.category || ''}</span>
                            {schedule.category && schedule.class && '·'}
                            <span>{schedule.class || ''}</span>
                            {schedule.class && schedule.classroom && '·'}
                            <span className="truncate">{schedule.classroom || ''}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip */}
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
              <span className="text-[#F2545B]">{tooltip.content.code}</span>
              <span className="text-[#9E9E9E] font-normal text-[11px]">·</span>
              <span className="font-normal text-sm">{tooltip.content.name}</span>
            </div>
            <div className="text-[11px] text-[#E8DFB5] space-y-0.5">
              <div>👨‍🏫 {tooltip.content.teacher}</div>
              <div className="flex gap-3">
                <span>📋 {tooltip.content.section}</span>
                <span>🏫 {tooltip.content.classroom}</span>
              </div>
              <div className="text-[#9E9E9E] text-[10px]">
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
              borderTop: '6px solid #2B1B17',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default ScheduleGrid
