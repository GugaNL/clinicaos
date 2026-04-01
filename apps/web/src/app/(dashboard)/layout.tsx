'use client'

import { useAuth } from '@/hooks/useAuth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">ClinicaOS</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Dashboard
          </a>
          <a href="/agendamentos" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Agendamentos
          </a>
          <a href="/pacientes" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Pacientes
          </a>
          <a href="/medicos" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Médicos
          </a>
          <a href="/financeiro" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Financeiro
          </a>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('clinicId')
              window.location.href = '/login'
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="ml-60 p-8">
        {children}
      </main>
    </div>
  )
}