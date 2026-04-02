'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Search, Users, Stethoscope, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SearchResults {
  patients: { id: string; name: string; phone: string | null; email: string | null }[]
  doctors: { id: string; name: string; specialty: string | null; color: string }[]
  appointments: {
    id: string
    startsAt: string
    patient: { name: string }
    doctor: { name: string; color: string }
  }[]
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/search', { params: { q: query } })
        setResults(data)
        setOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  const hasResults = results && (
    results.patients.length > 0 ||
    results.doctors.length > 0 ||
    results.appointments.length > 0
  )

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Buscar... (⌘K)"
          className="w-full h-9 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && hasResults && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.patients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pacientes</span>
              </div>
              {results.patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => {
                    router.push(`/pacientes/${patient.id}`)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                >
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-700 text-xs font-semibold">{patient.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                    {patient.phone && <p className="text-xs text-slate-500">{patient.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.doctors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 border-t border-t-slate-100">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Médicos</span>
              </div>
              {results.doctors.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => {
                    router.push('/medicos')
                    setOpen(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-semibold"
                    style={{ backgroundColor: doctor.color }}
                  >
                    {doctor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doctor.name}</p>
                    {doctor.specialty && <p className="text-xs text-slate-500">{doctor.specialty}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.appointments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 border-t border-t-slate-100">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agendamentos</span>
              </div>
              {results.appointments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => {
                    router.push('/agendamentos')
                    setOpen(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                >
                  <div
                    className="w-2 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: apt.doctor.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{apt.patient.name}</p>
                    <p className="text-xs text-slate-500">
                      {apt.doctor.name} • {format(parseISO(apt.startsAt), "d MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {open && query.length >= 2 && !loading && !hasResults && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 text-center">
          <p className="text-sm text-slate-500">Nenhum resultado para &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  )
}