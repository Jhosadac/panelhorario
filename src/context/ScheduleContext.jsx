import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { DAYS, getTodayDay, isNowBetween } from '../utils/helpers'

const initialState = {
  courses: [],
  teachers: [],
  classrooms: [],
  schedules: [],
  // Filtros
  selectedDepartments: [],      // ['EPIES', 'EPIEC']
  selectedSections: {},         // { 'courseName': ['A', 'B'] }  o también puede ser un conjunto de strings 'courseName|section'
  selectedCycle: '',
  filterType: 'all',            // 'all' | 'teoria' | 'practica'
  selectedClassroom: '',
  selectedGlobalSection: '',    // filtro global por sección (texto)
  loading: false,
  error: null,
  occupancy: [],
}

function scheduleReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_DATA':
      return {
        ...state,
        courses: action.payload.courses || state.courses,
        teachers: action.payload.teachers || state.teachers,
        classrooms: action.payload.classrooms || state.classrooms,
        schedules: action.payload.schedules || state.schedules,
      }
    case 'SET_OCCUPANCY':
      return { ...state, occupancy: action.payload }
    case 'SET_SELECTED_DEPARTMENTS':
      return { ...state, selectedDepartments: action.payload }
    case 'SET_SELECTED_SECTIONS':
      return { ...state, selectedSections: action.payload }
    case 'SET_SELECTED_CYCLE':
      return { ...state, selectedCycle: action.payload }
    case 'SET_FILTER_TYPE':
      return { ...state, filterType: action.payload }
    case 'SET_SELECTED_CLASSROOM':
      return { ...state, selectedClassroom: action.payload }
    case 'SET_SELECTED_GLOBAL_SECTION':
      return { ...state, selectedGlobalSection: action.payload }
    default:
      return state
  }
}

const ScheduleContext = createContext()

export function ScheduleProvider({ children }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState)

  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      // Obtener cursos
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code')
      if (coursesError) throw coursesError

      // Obtener docentes (solo nombre)
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('name')
      if (teachersError) throw teachersError

      // Obtener aulas
      const { data: classrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .order('name')
      if (classroomsError) throw classroomsError

      // Obtener horarios
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .order('day_of_week')
        .order('start_time')
      if (schedulesError) throw schedulesError

      dispatch({
        type: 'SET_DATA',
        payload: { courses, teachers, classrooms, schedules }
      })

      // Inicializar selección de secciones: por defecto todas las secciones de todos los cursos
      const initialSections = {}
      courses.forEach(course => {
        const courseSchedules = schedules.filter(s => s.course_name === course.name)
        const sections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
        if (sections.length > 0) {
          initialSections[course.name] = sections
        } else {
          // Si no hay secciones, poner un array vacío o null? Lo dejamos vacío para que no se seleccione nada
          initialSections[course.name] = []
        }
      })
      dispatch({ type: 'SET_SELECTED_SECTIONS', payload: initialSections })

      // Seleccionar todos los departamentos por defecto
      const depts = [...new Set(courses.map(c => c.department).filter(Boolean))]
      dispatch({ type: 'SET_SELECTED_DEPARTMENTS', payload: depts })

      // Calcular ocupación
      await updateOccupancy(classrooms, schedules)

    } catch (error) {
      console.error('Error cargando datos:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  const updateOccupancy = useCallback(async (classrooms = state.classrooms, schedules = state.schedules) => {
    try {
      const today = getTodayDay()
      const now = new Date()
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const occupancy = classrooms.map(classroom => {
        const active = schedules.some(s =>
          s.classroom === classroom.name &&
          s.day_of_week === today &&
          s.start_time <= nowStr &&
          s.end_time > nowStr
        )
        return { ...classroom, occupied: active }
      })
      dispatch({ type: 'SET_OCCUPANCY', payload: occupancy })
    } catch (error) {
      console.error('Error actualizando ocupación:', error)
    }
  }, [state.classrooms, state.schedules])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      updateOccupancy()
    }, 60000)
    return () => clearInterval(interval)
  }, [updateOccupancy])

  return (
    <ScheduleContext.Provider value={{ ...state, dispatch, loadData, updateOccupancy }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export function useSchedule() {
  const context = useContext(ScheduleContext)
  if (!context) {
    throw new Error('useSchedule debe usarse dentro de ScheduleProvider')
  }
  return context
}
