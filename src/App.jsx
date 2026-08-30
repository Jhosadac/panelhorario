// src/App.jsx
import React from 'react'
import { ScheduleProvider } from './context/ScheduleContext'
import Sidebar from './components/Sidebar'
import ScheduleGrid from './components/ScheduleGrid'

function App() {
  return (
    <ScheduleProvider>
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-slate-800/80 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between shrink-0">
            <h1 className="text-lg font-semibold text-slate-100">
              📚 Panel de Horarios Académicos
            </h1>
            <div className="text-xs text-slate-400">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <ScheduleGrid />
          </div>
        </main>
      </div>
    </ScheduleProvider>
  )
}

export default App
