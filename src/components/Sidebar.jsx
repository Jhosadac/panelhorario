// src/components/Sidebar.jsx
import React, { useState, useMemo } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { COLORS } from '../utils/colors'
import { DAYS, getTodayDay, isNowBetween } from '../utils/helpers'

function Sidebar() {
  const {
    courses,
    classrooms,
    schedules,
    selectedCourses,
    selectedCycle,
    filterType,
    selectedClassroom,
    occupancy,
    dispatch,
  } = useSchedule()

  const [isOpen, setIsOpen] = useState(true)

  // Obtener ciclos únicos
  const cycles = useMemo(() => {
    const unique = new Set(courses.map(c => c.cycle).filter(Boolean))
    return Array.from(unique).sort()
  }, [courses])

  // Manejar selección de ciclo
  const handleCycleChange = (e) => {
    const cycle = e.target.value
    dispatch({ type: 'SET_SELECTED_CYCLE', payload: cycle })
    if (cycle) {
      const courseIds = courses.filter(c => c.cycle === cycle).map(c => c.id)
      dispatch({ type: 'SET_SELECTED_COURSES', payload: courseIds })
    }
  }

  // Manejar toggle de curso
  const toggleCourse = (courseId) => {
    dispatch({ type: 'TOGGLE_COURSE', payload: courseId })
  }

  // Seleccionar/deseleccionar todos
  const toggleAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      dispatch({ type: 'SET_SELECTED_COURSES', payload: [] })
    } else {
      dispatch({ type: 'SET_SELECTED_COURSES', payload: courses.map(c => c.id) })
    }
  }

  // Obtener color para un curso
  const getColor = (courseId) => {
    let hash = 0
    for (let i = 0; i < courseId.length; i++) {
      hash = courseId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return COLORS[Math.abs(hash) % COLORS.length]
  }

  // Contar horarios por curso
  const getScheduleCount = (courseId) => {
    return schedules.filter(s => s.course_id === courseId).length
  }

  return (
    <>
      {/* Botón toggle para móvil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-700"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <aside
        className={`
          w-80 bg-slate-900/95 border-r border-slate-700/50 flex flex-col shrink-0
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          fixed lg:relative z-40 h-full
          lg:w-80
        `}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Filtro por ciclo */}
          <div className="sidebar-section">
            <label className="sidebar-label">📋 Ciclo</label>
            <select
              value={selectedCycle}
              onChange={handleCycleChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            >
              <option value="">Todos los ciclos</option>
              {cycles.map(cycle => (
                <option key={cycle} value={cycle}>{cycle}</option>
              ))}
            </select>
          </div>

          {/* Lista de cursos */}
          <div className="sidebar-section">
            <div className="flex items-center justify-between mb-2">
              <label className="sidebar-label mb-0">📚 Cursos</label>
              <button
                onClick={toggleAllCourses}
                className="text-xs text-slate-400 hover:text-slate-200 transition px-2 py-0.5 rounded bg-slate-800/50"
              >
                {selectedCourses.length === courses.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {courses.map(course => (
                <label
                  key={course.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition text-sm group"
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 cursor-pointer"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getColor(course.id) }}
                  />
                  <span className="text-slate-300 truncate flex-1">
                    {course.code} - {course.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {getScheduleCount(course.id)}
                  </span>
                </label>
              ))}
              {courses.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                  No hay cursos cargados
                </div>
              )}
            </div>
          </div>

          {/* Filtro por tipo */}
          <div className="sidebar-section">
            <label className="sidebar-label">🎯 Tipo de BH</label>
            <div className="flex gap-2">
              {['all', 'teoria', 'practica'].map(type => (
                <button
                  key={type}
                  onClick={() => dispatch({ type: 'SET_FILTER_TYPE', payload: type })}
                  className={`
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize
                    ${filterType === type
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                  `}
                >
                  {type === 'all' ? 'Todos' : type === 'teoria' ? 'Teoría' : 'Práctica'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por aula */}
          <div className="sidebar-section">
            <label className="sidebar-label">🏫 Aula</label>
            <select
              value={selectedClassroom}
              onChange={(e) => dispatch({ type: 'SET_SELECTED_CLASSROOM', payload: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            >
              <option value="">Todas las aulas</option>
              {classrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ocupación de aulas en tiempo real */}
          <div className="sidebar-section">
            <label className="sidebar-label flex items-center gap-2">
              🟢 Ocupación de aulas
              <span className="text-[10px] text-slate-500 font-normal">(en tiempo real)</span>
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {occupancy.map(classroom => (
                <div
                  key={classroom.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30"
                >
                  <span className="text-sm text-slate-300">{classroom.name}</span>
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${classroom.occupied ? 'text-red-400' : 'text-green-400'}`}>
                    <span className="text-base">
                      {classroom.occupied ? '🔴' : '🟢'}
                    </span>
                    {classroom.occupied ? 'Ocupado' : 'Libre'}
                  </span>
                </div>
              ))}
              {occupancy.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-2">
                  No hay aulas registradas
                </div>
              )}
            </div>
          </div>

          {/* Resumen de filtros */}
          <div className="border-t border-slate-700/50 pt-4 mt-2">
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-400">Cursos seleccionados:</span>{' '}
              {selectedCourses.length} de {courses.length}
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-400">Horarios mostrados:</span>{' '}
              {
                schedules.filter(s => {
                  const courseSelected = selectedCourses.includes(s.course_id)
                  const typeMatch = filterType === 'all' || s.type?.toLowerCase() === filterType
                  const classroomMatch = !selectedClassroom || s.classroom_id === selectedClassroom
                  return courseSelected && typeMatch && classroomMatch
                }).length
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/50 p-3 text-center text-[10px] text-slate-500">
          v1.0 · Datos actualizados en tiempo real
        </div>
      </aside>

      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
