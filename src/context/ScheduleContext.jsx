// src/context/ScheduleContext.jsx
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { DAYS, getTodayDay } from '../utils/helpers'

// Estado inicial
const initialState = {
  courses: [],
  teachers: [],
  classrooms: [],
  schedules: [],
  selectedCourses: [],
  selectedCycle: '',
  filterType: 'all', // 'all' | 'teoria' | 'practica'
  selectedClassroom: '',
  loading: false,
  error: null,
  occupancy: [],
}

// Reducer
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
    case 'SET_SELECTED_COURSES':
      return { ...state, selectedCourses: action.payload }
    case 'SET_SELECTED_CYCLE':
      return { ...state, selectedCycle: action.payload }
    case 'SET_FILTER_TYPE':
      return { ...state, filterType: action.payload }
    case 'SET_SELECTED_CLASSROOM':
      return { ...state, selectedClassroom: action.payload }
    case 'SET_OCCUPANCY':
      return { ...state, occupancy: action.payload }
    case 'TOGGLE_COURSE':
      const idx = state.selectedCourses.indexOf(action.payload)
      if (idx >= 0) {
        return { ...state, selectedCourses: state.selectedCourses.filter(c => c !== action.payload) }
      } else {
        return { ...state, selectedCourses: [...state.selectedCourses, action.payload] }
      }
    case 'SELECT_COURSES_BY_CYCLE':
      const coursesInCycle = state.courses
        .filter(c => c.cycle === action.payload)
        .map(c => c.id)
      return { ...state, selectedCourses: coursesInCycle }
    default:
      return state
  }
}

// Context
const ScheduleContext = createContext()

export function ScheduleProvider({ children }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialState)

  // Cargar datos iniciales
  const loadData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      // Cargar cursos
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code')

      if (coursesError) throw coursesError

      // Cargar docentes
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('name')

      if (teachersError) throw teachersError

      // Cargar aulas
      const { data: classrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .order('name')

      if (classroomsError) throw classroomsError

      // Cargar horarios con relaciones
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          courses:course_id (id, code, name, cycle, credits),
          teachers:teacher_id (id, name, email),
          classrooms:classroom_id (id, name, capacity, type)
        `)
        .order('day_of_week')
        .order('start_time')

      if (schedulesError) throw schedulesError

      dispatch({
        type: 'SET_DATA',
        payload: { courses, teachers, classrooms, schedules }
      })

      // Si no hay cursos seleccionados, seleccionar todos
      if (state.selectedCourses.length === 0 && courses.length > 0) {
        dispatch({ type: 'SET_SELECTED_COURSES', payload: courses.map(c => c.id) })
      }

      // Calcular ocupación inicial
      await updateOccupancy(classrooms, schedules)

    } catch (error) {
      console.error('Error cargando datos:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Actualizar ocupación
  const updateOccupancy = useCallback(async (classrooms = state.classrooms, schedules = state.schedules) => {
    try {
      const today = getTodayDay()
      const now = new Date()
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const occupancy = classrooms.map(classroom => {
        // Buscar si hay algún horario en esta aula para hoy que incluya la hora actual
        const active = schedules.some(s =>
          s.classroom_id === classroom.id &&
          s.day_of_week === today &&
          s.start_time <= nowStr &&
          s.end_time > nowStr
        )
        return {
          ...classroom,
          occupied: active,
        }
      })

      dispatch({ type: 'SET_OCCUPANCY', payload: occupancy })
    } catch (error) {
      console.error('Error actualizando ocupación:', error)
    }
  }, [state.classrooms, state.schedules])

  // Efecto de carga inicial
  useEffect(() => {
    loadData()
  }, [])

  // Actualizar ocupación cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      updateOccupancy()
    }, 60000)

    return () => clearInterval(interval)
  }, [updateOccupancy])

  // Value del context
  const value = {
    ...state,
    dispatch,
    loadData,
    updateOccupancy,
  }

  return (
    <ScheduleContext.Provider value={value}>
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
