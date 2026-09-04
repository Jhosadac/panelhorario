import React from 'react'
import { useSchedule } from '../context/ScheduleContext'

function ClassroomOccupancy() {
  const { occupancy } = useSchedule()

  if (occupancy.length === 0) {
    return (
      <div className="text-sm text-slate-500 text-center py-4">
        No hay aulas registradas
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {occupancy.map(classroom => (
        <div
          key={classroom.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800/70 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">
              {classroom.name}
            </span>
            {classroom.capacity && (
              <span className="text-[10px] text-slate-500">
                ({classroom.capacity} puestos)
              </span>
            )}
          </div>
          <div className={`text-xs font-medium flex items-center gap-1.5 ${classroom.occupied ? 'text-red-400' : 'text-green-400'}`}>
            <span className="text-base">
              {classroom.occupied ? '🔴' : '🟢'}
            </span>
            {classroom.occupied ? 'Ocupado' : 'Libre'}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ClassroomOccupancy
