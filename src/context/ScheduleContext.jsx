import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { DAYS, getTodayDay } from '../utils/helpers'

const EPIES_SECTIONS = ['A', 'B', 'C', 'D', 'E']

const initialState = {
  courses: [],
  teachers: [],
  classrooms: [],
  schedules: [],

  tempDepartments: [],
  tempSections: {},        // clave: "courseName|department"
  tempCycles: [],

  activeDepartments: [],
  activeSections: {},      // clave: "courseName|department"
  activeCycles: [],

  loading: false,
  error: null,
  occupancy: [],
}

const getSectionKey = (courseName, department) => `${courseName}|${department}`

const filterSectionsByDepartment = (sections, department) => {
  if (department === 'EPIES') {
    return sections.filter(sec => EPIES_SECTIONS.includes(sec))
  } else if (department === 'EPIEC') {
    return sections.filter(sec => !EPIES_SECTIONS.includes(sec))
  }
  return sections
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

    case 'SET_TEMP_DEPARTMENTS':
      return { ...state, tempDepartments: action.payload }
    case 'SET_TEMP_SECTIONS':
      return { ...state, tempSections: action.payload }
    case 'SET_TEMP_CYCLES':
      return { ...state, tempCycles: action.payload }

    case 'APPLY_FILTERS': {
      const filteredActiveSections = {}
      state.courses.forEach(course => {
        const key = getSectionKey(course.name, course.department)
        const sections = state.tempSections[key] || []
        filteredActiveSections[key] = filterSectionsByDepartment(sections, course.department)
      })
      return {
        ...state,
        activeDepartments: state.tempDepartments,
        activeSections: filteredActiveSections,
        activeCycles: state.tempCycles,
      }
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

      const allDepts = [...new Set(courses.map(c => c.department).filter(Boolean))]
      const allCycles = [...new Set(courses.map(c => c.cycle).filter(Boolean))]

      const initialSections = {}
      courses.forEach(course => {
        const courseSchedules = schedules.filter(s => s.course_name === course.name)
        const allSections = [...new Set(courseSchedules.map(s => s.class).filter(Boolean))]
        const key = getSectionKey(course.name, course.department)
        initialSections[key] = filterSectionsByDepartment(allSections, course.department)
      })

      dispatch({ type: 'SET_TEMP_DEPARTMENTS', payload: allDepts })
      dispatch({ type: 'SET_TEMP_CYCLES', payload: allCycles })
      dispatch({ type: 'SET_TEMP_SECTIONS', payload: initialSections })
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
