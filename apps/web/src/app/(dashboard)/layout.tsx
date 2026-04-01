'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

useEffect(() => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.replace('/login')
    return
  }
  setReady(true)
}, [router])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">ClinicaOS</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
        <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${pathname === '/dashboard' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'}`}>
          Dashboard
        </Link>
        <Link href="/agendamentos" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${pathname === '/agendamentos' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'}`}>
          Agendamentos
        </Link>
        <Link href="/pacientes" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${pathname?.startsWith('/pacientes') ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'}`}>
          Pacientes
        </Link>
        <Link href="/medicos" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${pathname === '/medicos' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'}`}>
          Médicos
        </Link>
        <Link href="/financeiro" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${pathname === '/financeiro' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700'}`}>
          Financeiro
        </Link>
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