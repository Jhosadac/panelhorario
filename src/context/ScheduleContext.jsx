import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { DAYS, getTodayDay, isNowBetween } from '../utils/helpers'

const initialState = {
  courses: [],
  teachers: [],
  classrooms: [],
  schedules: [],

  // Filtros temporales (lo que el usuario ve en la UI)
  tempDepartments: [],
  tempSections: {},        // { 'courseName': ['A', 'B'] }
  tempCycle: '',
  tempFilterType: 'all',
  tempClassroom: '',

  // Filtros activos (los que realmente se aplican a la cuadrícula)
  activeDepartments: [],
  activeSections: {},
  activeCycle: '',
  activeFilterType: 'all',
  activeClassroom: '',

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

    // Filtros temporales
    case 'SET_TEMP_DEPARTMENTS':
      return { ...state, tempDepartments: action.payload }
    case 'SET_TEMP_SECTIONS':
      return { ...state, tempSections: action.payload }
    case 'SET_TEMP_CYCLE':
      return { ...state, tempCycle: action.payload }
    case 'SET_TEMP_FILTER_TYPE':
      return { ...state, tempFilterType: action.payload }
    case 'SET_TEMP_CLASSROOM':
      return { ...state, tempClassroom: action.payload }

    // Aplicar filtros (copiar temporales a activos)
    case 'APPLY_FILTERS':
      return {
        ...state,
        activeDepartments: state.tempDepartments,
        activeSections: state.tempSections,
        activeCycle: state.tempCycle,
        activeFilterType: state.tempFilterType,
        activeClassroom: state.tempClassroom,
      }

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
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code')
      if (coursesError) throw coursesError

      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('name')
      if (teachersError) throw teachersError

      const { data: classrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .order('name')
      if (classroomsError) throw classroomsError

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

      // Inicializar secciones temporales: todas las secciones de cada curso
      const initialSections = {}
      courses.forEach(course => {
        const courseSchedules = schedules.filter(s => s.course_name === course.name)
        const sections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
        initialSections[course.name] = sections
      })
      dispatch({ type: 'SET_TEMP_SECTIONS', payload: initialSections })

      // Departamentos temporales: todos
      const depts = [...new Set(courses.map(c => c.department).filter(Boolean))]
      dispatch({ type: 'SET_TEMP_DEPARTMENTS', payload: depts })

      // Aplicar filtros por defecto (para que se vea algo)
      dispatch({ type: 'APPLY_FILTERS' })

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
