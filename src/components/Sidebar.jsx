import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useSchedule } from '../context/ScheduleContext'
import { COLORS } from '../utils/colors'

const EPIES_SECTIONS = ['A', 'B', 'C', 'D', 'E']

function Sidebar() {
  const {
    courses,
    schedules,
    tempDepartments,
    tempSections,
    tempCycles,
    tempFilterType,
    occupancy,
    dispatch,
  } = useSchedule()

  const [isOpen, setIsOpen] = useState(true)

  // Depuración: muestra el estado de tempSections cuando cambia (puedes eliminar después)
  useEffect(() => {
    console.log('🔥 tempSections actualizado:', tempSections)
  }, [tempSections])

  // Ciclos disponibles
  const availableCycles = useMemo(() => {
    let filtered = courses
    if (tempDepartments.length > 0) {
      filtered = filtered.filter(c => tempDepartments.includes(c.department))
    }
    const unique = new Set(filtered.map(c => c.cycle).filter(Boolean))
    return Array.from(unique).sort()
  }, [courses, tempDepartments])

  // Cursos filtrados
  const filteredCourses = useMemo(() => {
    let result = courses
    if (tempDepartments.length > 0) {
      result = result.filter(c => tempDepartments.includes(c.department))
    }
    if (tempCycles.length > 0) {
      result = result.filter(c => tempCycles.includes(c.cycle))
    }
    return result
  }, [courses, tempDepartments, tempCycles])

  // Obtener secciones de un curso según escuela
  const getSectionsForCourse = useCallback((course) => {
    const courseSchedules = schedules.filter(s => s.course_name === course.name)
    const allSections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
    if (course.department === 'EPIES') {
      return allSections.filter(sec => EPIES_SECTIONS.includes(sec))
    } else if (course.department === 'EPIEC') {
      return allSections.filter(sec => !EPIES_SECTIONS.includes(sec))
    }
    return allSections
  }, [schedules])

  // Actualizar secciones según filtros
  const updateSectionsForCurrentFilters = useCallback((depts, cycles) => {
    let filtered = courses
    if (depts.length > 0) {
      filtered = filtered.filter(c => depts.includes(c.department))
    }
    if (cycles.length > 0) {
      filtered = filtered.filter(c => cycles.includes(c.cycle))
    }
    const newSections = { ...tempSections }
    Object.keys(newSections).forEach(courseName => {
      if (!filtered.some(c => c.name === courseName)) {
        newSections[courseName] = []
      }
    })
    filtered.forEach(course => {
      const sections = getSectionsForCourse(course)
      newSections[course.name] = sections
    })
    dispatch({ type: 'SET_TEMP_SECTIONS', payload: newSections })
  }, [courses, tempSections, getSectionsForCourse, dispatch])

  // Manejar escuela
  const handleDepartmentClick = (dept) => {
    let newDepts
    if (tempDepartments.includes(dept) && tempDepartments.length === 1) {
      newDepts = []
    } else {
      newDepts = [dept]
    }
    dispatch({ type: 'SET_TEMP_DEPARTMENTS', payload: newDepts })

    const filteredCycles = availableCycles.filter(c =>
      courses.some(course => course.cycle === c && newDepts.includes(course.department))
    )
    dispatch({ type: 'SET_TEMP_CYCLES', payload: filteredCycles })
    updateSectionsForCurrentFilters(newDepts, filteredCycles)
  }

  // Toggle ciclo
  const toggleCycle = (cycle) => {
    let newCycles
    if (tempCycles.includes(cycle)) {
      newCycles = tempCycles.filter(c => c !== cycle)
    } else {
      newCycles = [...tempCycles, cycle]
    }
    dispatch({ type: 'SET_TEMP_CYCLES', payload: newCycles })
    updateSectionsForCurrentFilters(tempDepartments, newCycles)
  }

  // Toggle todas las secciones de un curso (con depuración)
  const toggleCourse = (courseName) => {
    const course = courses.find(c => c.name === courseName)
    if (!course) {
      console.warn('Curso no encontrado:', courseName)
      return
    }
    const sections = getSectionsForCourse(course)
    const current = tempSections[courseName] || []
    console.log(`🔄 Toggling ${courseName}: actual=${current.length}, total=${sections.length}`)

    let newSelected
    if (current.length === sections.length && sections.length > 0) {
      newSelected = []
    } else {
      newSelected = [...sections] // copia nueva
    }

    dispatch({
      type: 'SET_TEMP_SECTIONS',
      payload: { ...tempSections, [courseName]: newSelected }
    })
  }

  // Toggle una sección específica
  const toggleSection = (courseName, section) => {
    const current = tempSections[courseName] || []
    let newSections
    if (current.includes(section)) {
      newSections = current.filter(s => s !== section)
    } else {
      newSections = [...current, section]
    }
    dispatch({
      type: 'SET_TEMP_SECTIONS',
      payload: { ...tempSections, [courseName]: newSections }
    })
  }

  const applyFilters = () => {
    dispatch({ type: 'APPLY_FILTERS' })
  }

  const getColor = (courseId) => {
    let hash = 0
    for (let i = 0; i < courseId.length; i++) {
      hash = courseId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return COLORS[Math.abs(hash) % COLORS.length]
  }

  // Contador de secciones marcadas vs totales
  const selectedCount = useMemo(() => {
    let marked = 0
    let total = 0
    filteredCourses.forEach(course => {
      const sections = getSectionsForCourse(course)
      const selected = tempSections[course.name] || []
      marked += selected.length
      total += sections.length
    })
    return { marked, total }
  }, [filteredCourses, tempSections, getSectionsForCourse])

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#6B1F1F] text-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <aside className={`
        w-80 bg-white border-r border-[#E0E0E0] flex flex-col shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative z-40 h-full
        shadow-lg
      `}>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Escuela */}
          <div className="sidebar-section">
            <label className="sidebar-label">🏫 Escuela</label>
            <div className="flex gap-2">
              {['EPIES', 'EPIEC'].map(dept => (
                <button
                  key={dept}
                  onClick={() => handleDepartmentClick(dept)}
                  className={`
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition border
                    ${tempDepartments.includes(dept)
                      ? 'bg-[#6B1F1F] text-white border-[#6B1F1F]'
                      : 'bg-white text-[#6B1F1F] border-[#6B1F1F] hover:bg-[#F2545B] hover:text-white'}
                  `}
                >
                  {dept}
                </button>
              ))}
            </div>
            {tempDepartments.length === 0 && (
              <div className="text-xs text-[#F2545B] mt-1">Ninguna escuela seleccionada</div>
            )}
          </div>

          {/* Ciclos */}
          <div className="sidebar-section">
            <label className="sidebar-label">📋 Ciclos</label>
            <div className="flex flex-wrap gap-1.5">
              {availableCycles.map(cycle => (
                <button
                  key={cycle}
                  onClick={() => toggleCycle(cycle)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium transition border
                    ${tempCycles.includes(cycle)
                      ? 'bg-[#6B1F1F] text-white border-[#6B1F1F]'
                      : 'bg-white text-[#6B1F1F] border-[#6B1F1F] hover:bg-[#F2545B] hover:text-white'}
                  `}
                >
                  {cycle}
                </button>
              ))}
              {availableCycles.length === 0 && (
                <span className="text-xs text-[#9E9E9E]">Sin ciclos disponibles</span>
              )}
            </div>
          </div>

          {/* Cursos y secciones */}
          <div className="sidebar-section">
            <div className="flex items-center justify-between mb-2">
              <label className="sidebar-label mb-0">📚 Cursos y secciones</label>
              <span className="text-xs text-[#9E9E9E]">
                {selectedCount.marked} de {selectedCount.total} secciones seleccionadas
              </span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredCourses.map(course => {
                const sections = getSectionsForCourse(course)
                const selected = tempSections[course.name] || []
                const allSelected = sections.length > 0 && selected.length === sections.length
                const color = getColor(course.id)

                return (
                  <div key={course.id} className="bg-[#E8DFB5]/30 rounded-lg p-2 border border-[#E0E0E0]">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleCourse(course.name)}
                        className="w-4 h-4 rounded border-[#9E9E9E] text-[#6B1F1F] focus:ring-[#6B1F1F] cursor-pointer"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-[#333333] truncate flex-1">
                        {course.code} - {course.name}
                      </span>
                      <span className="text-[10px] text-[#9E9E9E] font-mono">
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
                              className="w-3 h-3 rounded border-[#9E9E9E] text-[#6B1F1F] focus:ring-[#6B1F1F] cursor-pointer"
                            />
                            <span className="text-[#333333]">{sec}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredCourses.length === 0 && (
                <div className="text-sm text-[#9E9E9E] text-center py-4">
                  No hay cursos con los filtros actuales
                </div>
              )}
            </div>
          </div>

          {/* Tipo de BH */}
          <div className="sidebar-section">
            <label className="sidebar-label">🎯 Tipo de BH</label>
            <div className="flex gap-2">
              {['all', 'teoria', 'practica'].map(type => (
                <button
                  key={type}
                  onClick={() => dispatch({ type: 'SET_TEMP_FILTER_TYPE', payload: type })}
                  className={`
                    flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize border
                    ${tempFilterType === type
                      ? 'bg-[#6B1F1F] text-white border-[#6B1F1F]'
                      : 'bg-white text-[#6B1F1F] border-[#6B1F1F] hover:bg-[#F2545B] hover:text-white'}
                  `}
                >
                  {type === 'all' ? 'Todos' : type === 'teoria' ? 'Teoría' : 'Práctica'}
                </button>
              ))}
            </div>
          </div>

          {/* Aplicar filtros */}
          <div className="sidebar-section">
            <button
              onClick={applyFilters}
              className="w-full btn-primary text-center"
            >
              ✅ Aplicar filtros
            </button>
          </div>

          {/* Ocupación de aulas */}
          <div className="sidebar-section">
            <label className="sidebar-label flex items-center gap-2">
              🟢 Ocupación de aulas
              <span className="text-[10px] text-[#9E9E9E] font-normal">(en tiempo real)</span>
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {occupancy.map(classroom => (
                <div
                  key={classroom.id}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#E8DFB5]/30 border border-[#E0E0E0]"
                >
                  <span className="text-sm text-[#333333]">{classroom.name}</span>
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${classroom.occupied ? 'text-[#F2545B]' : 'text-[#4CAF50]'}`}>
                    <span className="text-base">{classroom.occupied ? '🔴' : '🟢'}</span>
                    {classroom.occupied ? 'Ocupado' : 'Libre'}
                  </span>
                </div>
              ))}
              {occupancy.length === 0 && (
                <div className="text-sm text-[#9E9E9E] text-center py-2">No hay aulas</div>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="border-t border-[#E0E0E0] pt-4 mt-2">
            <div className="text-xs text-[#9E9E9E]">
              <span className="font-medium text-[#333333]">Secciones marcadas:</span> {selectedCount.marked} de {selectedCount.total}
            </div>
            <div className="text-xs text-[#9E9E9E] mt-1">
              <span className="font-medium text-[#333333]">Escuela:</span> {tempDepartments.join(', ') || 'Ninguna'}
            </div>
            <div className="text-xs text-[#9E9E9E]">
              <span className="font-medium text-[#333333]">Ciclos:</span> {tempCycles.length > 0 ? tempCycles.join(', ') : 'Todos'}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E0E0E0] p-3 text-center text-[10px] text-[#9E9E9E]">
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
