'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

  async function loadSummary() {
    try {
      const { data } = await api.get('/dashboard/summary')
      setSummary(data)
    } catch {
      toast.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [])

  if (loading) {
    return <p className="text-slate-500">Carregando...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Consultas hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {summary?.appointmentsToday ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {summary?.totalPatients ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Médicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {summary?.totalDoctors ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Receita do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(Number(summary?.revenueMonth ?? 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.nextAppointments.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma consulta agendada.</p>
          ) : (
            <div className="space-y-3">
              {summary?.nextAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
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
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[apt.status]}`}
                  >
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