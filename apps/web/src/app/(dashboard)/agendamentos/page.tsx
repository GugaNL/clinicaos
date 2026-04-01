'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  addMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Doctor {
  id: string
  name: string
  color: string
  specialty: string | null
}

interface Patient {
  id: string
  name: string
  phone: string | null
}

interface Appointment {
  id: string
  startsAt: string
  endsAt: string
  status: string
  notes: string | null
  doctor: Doctor
  patient: Patient
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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7) // 7h às 18h

export default function AgendamentosPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [form, setForm] = useState({
    doctorId: '',
    patientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    duration: '30',
    notes: '',
  })
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'PIX',
  })

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  async function loadData() {
    setLoading(true)
    try {
      const [appRes, docRes, patRes] = await Promise.all([
        api.get('/appointments', {
          params: {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString(),
          },
        }),
        api.get('/doctors'),
        api.get('/patients'),
      ])
      setAppointments(appRes.data)
      setDoctors(docRes.data)
      setPatients(patRes.data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentWeek])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const startsAt = new Date(`${form.date}T${form.startTime}:00`)
      const endsAt = addMinutes(startsAt, Number(form.duration))

      await api.post('/appointments', {
        doctorId: form.doctorId,
        patientId: form.patientId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes: form.notes,
      })

      toast.success('Consulta agendada!')
      setShowForm(false)
      loadData()
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Erro ao agendar')
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/appointments/${id}/status`, { status })
      toast.success('Status atualizado!')
      setSelectedAppointment(null)
      loadData()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja cancelar este agendamento?')) return
    try {
      await api.delete(`/appointments/${id}`)
      toast.success('Agendamento removido!')
      setSelectedAppointment(null)
      loadData()
    } catch {
      toast.error('Erro ao remover agendamento')
    }
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAppointment) return
    try {
      await api.post('/payments', {
        appointmentId: selectedAppointment.id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
      })
      toast.success('Cobrança gerada!')
      setShowPaymentForm(false)
      setSelectedAppointment(null)
      setPaymentForm({ amount: '', method: 'PIX' })
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Erro ao gerar cobrança')
    }
  }

  function getAppointmentsForDayAndHour(day: Date, hour: number) {
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.startsAt)
      return isSameDay(aptDate, day) && aptDate.getHours() === hour
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Agendamentos</h2>
          <p className="text-slate-500">Calendário semanal de consultas</p>
        </div>
        <Button onClick={() => setShowForm(true)}>Nova consulta</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova consulta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Médico</Label>
                  <select
                    value={form.doctorId}
                    onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecione o médico</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Paciente</Label>
                  <select
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração</Label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    placeholder="Opcional..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Agendar consulta</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedAppointment && (
        <Card className="border-slate-300">
          <CardHeader>
            <CardTitle className="text-base">Detalhes da consulta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Paciente</p>
                <p className="font-medium">{selectedAppointment.patient.name}</p>
              </div>
              <div>
                <p className="text-slate-500">Médico</p>
                <p className="font-medium">{selectedAppointment.doctor.name}</p>
              </div>
              <div>
                <p className="text-slate-500">Horário</p>
                <p className="font-medium">
                  {format(parseISO(selectedAppointment.startsAt), 'HH:mm')} -{' '}
                  {format(parseISO(selectedAppointment.endsAt), 'HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedAppointment.status]}`}>
                  {STATUS_LABELS[selectedAppointment.status]}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
            {Object.keys(STATUS_LABELS).map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(selectedAppointment.id, status)}
                disabled={selectedAppointment.status === status}
              >
                {STATUS_LABELS[status]}
              </Button>
            ))}
            {selectedAppointment.status === 'DONE' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowPaymentForm(true)}
              >
                Gerar cobrança
              </Button>
            )}
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDelete(selectedAppointment.id)}
              >
                Remover
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedAppointment(null)}
              >
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showPaymentForm && selectedAppointment && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base">Gerar cobrança</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="PIX">PIX</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="CREDIT_CARD">Cartão de crédito</option>
                    <option value="HEALTH_INSURANCE">Convênio</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                  Confirmar cobrança
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Navegação semanal */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          ← Semana anterior
        </Button>
        <p className="font-medium text-slate-700">
          {format(weekStart, "d 'de' MMMM", { locale: ptBR })} -{' '}
          {format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <Button variant="outline" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          Próxima semana →
        </Button>
      </div>

      {/* Calendário */}
      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-auto">
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            {/* Header dias */}
            <div className="border-b border-slate-200" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="border-b border-l border-slate-200 p-2 text-center"
              >
                <p className="text-xs text-slate-500 uppercase">
                  {format(day, 'EEE', { locale: ptBR })}
                </p>
                <p className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-900'}`}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}

            {/* Linhas de horário */}
            {HOURS.map((hour) => (
              <>
                <div key={`hour-${hour}`} className="border-b border-slate-100 p-2 text-right">
                  <span className="text-xs text-slate-400">{String(hour).padStart(2, '0')}:00</span>
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDayAndHour(day, hour)
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="border-b border-l border-slate-100 min-h-[60px] p-1 relative"
                    >
                      {dayAppointments.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className="w-full text-left rounded p-1 mb-1 text-xs font-medium text-white truncate"
                          style={{ backgroundColor: apt.doctor.color }}
                        >
                          {format(parseISO(apt.startsAt), 'HH:mm')} {apt.patient.name}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}