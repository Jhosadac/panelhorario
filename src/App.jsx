import React from 'react'
import { ScheduleProvider } from './context/ScheduleContext'
import Sidebar from './components/Sidebar'
import ScheduleGrid from './components/ScheduleGrid'

function App() {
  return (
    <ScheduleProvider>
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-[#6B1F1F] border-b border-[#4A1515] px-6 py-3 flex items-center justify-between shrink-0">
            <h1 className="text-lg font-semibold text-white">
              Panel de Horarios Académicos
            </h1>
            <div className="text-xs text-[#E8DFB5]">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-[#F5F2EB]">
            <ScheduleGrid />
          </div>
        </main>
      </div>
    </ScheduleProvider>
  )
}

export default App
