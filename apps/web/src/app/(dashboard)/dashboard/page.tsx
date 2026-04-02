'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  Users,
  Stethoscope,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react'

interface Appointment {
  id: string
  startsAt: string
  endsAt: string
  status: string
  doctor: { name: string; color: string }
  patient: { name: string }
}

interface Summary {
  appointmentsToday: number
  totalPatients: number
  totalDoctors: number
  revenueMonth: number
  nextAppointments: Appointment[]
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
  DONE: 'Realizado',
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
  DONE: 'bg-slate-100 text-slate-700',
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/dashboard/summary')
        setSummary(data)
      } catch {
        toast.error('Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Consultas hoje',
      value: summary?.appointmentsToday ?? 0,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pacientes',
      value: summary?.totalPatients ?? 0,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Médicos',
      value: summary?.totalDoctors ?? 0,
      icon: Stethoscope,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Receita do mês',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(summary?.revenueMonth ?? 0)),
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-0.5 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-lg">
          <TrendingUp className="w-4 h-4 text-green-500" />
          Sistema operacional
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <CardTitle className="text-base">Próximas consultas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {summary?.nextAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhuma consulta agendada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary?.nextAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: apt.doctor.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {apt.patient.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {apt.doctor.name} •{' '}
                        {format(parseISO(apt.startsAt), "d MMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[apt.status]}`}>
                    {STATUS_LABELS[apt.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}