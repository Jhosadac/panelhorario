import React, { useState, useMemo } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { COLORS } from '../utils/colors'

function Sidebar() {
  const {
    courses,
    schedules,
    selectedDepartments,
    selectedSections,
    selectedCycle,
    filterType,
    selectedClassroom,
    selectedGlobalSection,
    occupancy,
    dispatch,
  } = useSchedule()

  const [isOpen, setIsOpen] = useState(true)

  // Obtener ciclos únicos de los cursos (considerando departamentos seleccionados)
  const cycles = useMemo(() => {
    const filtered = courses.filter(c => selectedDepartments.includes(c.department))
    const unique = new Set(filtered.map(c => c.cycle).filter(Boolean))
    return Array.from(unique).sort()
  }, [courses, selectedDepartments])

  // Obtener cursos según departamentos y ciclo seleccionado
  const filteredCourses = useMemo(() => {
    let result = courses
    if (selectedDepartments.length > 0) {
      result = result.filter(c => selectedDepartments.includes(c.department))
    }
    if (selectedCycle) {
      result = result.filter(c => c.cycle === selectedCycle)
    }
    return result
  }, [courses, selectedDepartments, selectedCycle])

  // Obtener todas las secciones únicas globales (para filtro global)
  const allSections = useMemo(() => {
    const secs = new Set()
    schedules.forEach(s => { if (s.class) secs.add(s.class) })
    return Array.from(secs).sort()
  }, [schedules])

  // Manejar selección de departamento (toggle)
  const toggleDepartment = (dept) => {
    let newDepts
    if (selectedDepartments.includes(dept)) {
      newDepts = selectedDepartments.filter(d => d !== dept)
    } else {
      newDepts = [...selectedDepartments, dept]
    }
    dispatch({ type: 'SET_SELECTED_DEPARTMENTS', payload: newDepts })
  }

  // Manejar selección de ciclo
  const handleCycleChange = (e) => {
    const cycle = e.target.value
    dispatch({ type: 'SET_SELECTED_CYCLE', payload: cycle })
    if (cycle) {
      // Seleccionar todas las secciones de los cursos de ese ciclo (y departamentos activos)
      const coursesInCycle = courses.filter(c => 
        c.cycle === cycle && selectedDepartments.includes(c.department)
      )
      const newSections = { ...selectedSections }
      coursesInCycle.forEach(c => {
        const courseSchedules = schedules.filter(s => s.course_name === c.name)
        const sections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
        newSections[c.name] = sections
      })
      dispatch({ type: 'SET_SELECTED_SECTIONS', payload: newSections })
    }
  }

  // Toggle selección de todas las secciones de un curso
  const toggleCourse = (courseName) => {
    const courseSchedules = schedules.filter(s => s.course_name === courseName)
    const sections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
    const current = selectedSections[courseName] || []
    let newSelected
    if (current.length === sections.length && sections.length > 0) {
      // Ya están todas seleccionadas, las deseleccionamos
      newSelected = []
    } else {
      newSelected = sections
    }
    dispatch({
      type: 'SET_SELECTED_SECTIONS',
      payload: { ...selectedSections, [courseName]: newSelected }
    })
  }

  // Toggle de una sección específica
  const toggleSection = (courseName, section) => {
    const current = selectedSections[courseName] || []
    let newSections
    if (current.includes(section)) {
      newSections = current.filter(s => s !== section)
    } else {
      newSections = [...current, section]
    }
    dispatch({
      type: 'SET_SELECTED_SECTIONS',
      payload: { ...selectedSections, [courseName]: newSections }
    })
  }

  // Obtener color para un curso
  const getColor = (courseId) => {
    let hash = 0
    for (let i = 0; i < courseId.length; i++) {
      hash = courseId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return COLORS[Math.abs(hash) % COLORS.length]
  }

  // Contar horarios seleccionados (para resumen)
  const selectedCount = useMemo(() => {
    let count = 0
    Object.entries(selectedSections).forEach(([courseName, sections]) => {
      count += sections.length
    })
    return count
  }, [selectedSections])

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-700"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <aside className={`
        w-80 bg-slate-900/95 border-r border-slate-700/50 flex flex-col shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative z-40 h-full
      `}>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Filtro por Departamento */}
          <div className="sidebar-section">
            <label className="sidebar-label">🏫 Escuela</label>
            <div className="flex gap-2">
              {['EPIES', 'EPIEC'].map(dept => (
                <button
                  key={dept}
                  onClick={() => toggleDepartment(dept)}
                  className={`
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition
                    ${selectedDepartments.includes(dept)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                  `}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

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

          {/* Lista de cursos con secciones */}
          <div className="sidebar-section">
            <div className="flex items-center justify-between mb-2">
              <label className="sidebar-label mb-0">📚 Cursos y secciones</label>
              <span className="text-xs text-slate-500">{selectedCount} secciones seleccionadas</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredCourses.map(course => {
                const courseSchedules = schedules.filter(s => s.course_name === course.name)
                const sections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
                const selected = selectedSections[course.name] || []
                const allSelected = sections.length > 0 && selected.length === sections.length
                const color = getColor(course.id)

                return (
                  <div key={course.id} className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleCourse(course.name)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-slate-300 truncate flex-1">
                        {course.code} - {course.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {sections.length}
                      </span>
                    </div>
                    {sections.length > 0 && (
                      <div className="ml-6 mt-1 flex flex-wrap gap-1">
                        {sections.map(sec => (
                          <label key={sec} className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.includes(sec)}
                              onChange={() => toggleSection(course.name, sec)}
                              className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                            />
                            <span className="text-slate-400">{sec}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredCourses.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                  No hay cursos con los filtros actuales
                </div>
              )}
            </div>
          </div>

          {/* Filtro por tipo de BH */}
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
              {[...new Set(schedules.map(s => s.classroom).filter(Boolean))].map(classroom => (
                <option key={classroom} value={classroom}>{classroom}</option>
              ))}
            </select>
          </div>

          {/* Filtro global por sección */}
          <div className="sidebar-section">
            <label className="sidebar-label">🔤 Sección (global)</label>
            <select
              value={selectedGlobalSection}
              onChange={(e) => dispatch({ type: 'SET_SELECTED_GLOBAL_SECTION', payload: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
            >
              <option value="">Todas las secciones</option>
              {allSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Ocupación de aulas */}
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
                    <span className="text-base">{classroom.occupied ? '🔴' : '🟢'}</span>
                    {classroom.occupied ? 'Ocupado' : 'Libre'}
                  </span>
                </div>
              ))}
              {occupancy.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-2">No hay aulas</div>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="border-t border-slate-700/50 pt-4 mt-2">
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-400">Secciones seleccionadas:</span> {selectedCount}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700/50 p-3 text-center text-[10px] text-slate-500">
          v2.0 · Datos actualizados
        </div>
      </aside>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}

export default Sidebar
