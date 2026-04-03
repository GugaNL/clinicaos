'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingTable } from '@/components/LoadingSpinner'
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
import React from 'react'

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
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPatient, setFilterPatient] = useState('')
  const searchParams = useSearchParams()

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
  const appointmentId = searchParams.get('appointmentId')
  if (appointmentId && appointments.length > 0) {
      const apt = appointments.find((a) => a.id === appointmentId)
      if (apt) setSelectedAppointment(apt)
    }
  }, [searchParams, appointments])

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
      const matchDay = isSameDay(aptDate, day) && aptDate.getHours() === hour
      const matchDoctor = !filterDoctor || apt.doctor.id === filterDoctor
      const matchPatient = !filterPatient || apt.patient.id === filterPatient
      const matchStatus = !filterStatus || apt.status === filterStatus
      return matchDay && matchDoctor && matchPatient && matchStatus
    })
  }

  return (
    <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Agendamentos</h2>
        <p className="text-slate-500 mt-0.5">Calendário semanal de consultas</p>
      </div>
      <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
        + Nova consulta
      </Button>
    </div>

      {showForm && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Nova consulta</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Médico <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.doctorId}
                    onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecione o médico</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Paciente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecione o paciente</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Horário <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Duração</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <input
                    placeholder="Opcional..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Agendar consulta
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedAppointment && (
        <Card className="border-blue-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Detalhes da consulta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Paciente</p>
                <p className="font-medium text-slate-900">{selectedAppointment.patient.name}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Médico</p>
                <p className="font-medium text-slate-900">{selectedAppointment.doctor.name}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Horário</p>
                <p className="font-medium text-slate-900">
                  {format(parseISO(selectedAppointment.startsAt), 'HH:mm')} -{' '}
                  {format(parseISO(selectedAppointment.endsAt), 'HH:mm')}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedAppointment.status]}`}>
                  {STATUS_LABELS[selectedAppointment.status]}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {Object.keys(STATUS_LABELS).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:text-slate-900 text-xs"
                  onClick={() => handleStatusChange(selectedAppointment.id, status)}
                  disabled={selectedAppointment.status === status}
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
              {selectedAppointment.status === 'DONE' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  onClick={() => setShowPaymentForm(true)}
                >
                  Gerar cobrança
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-500 hover:text-red-600 text-xs"
                onClick={() => handleDelete(selectedAppointment.id)}
              >
                Remover
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-200 text-slate-600 text-xs"
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
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 shrink-0"
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
        >
          ←
        </Button>
        <p className="font-medium text-slate-700 text-base text-center">
          {format(weekStart, "d 'de' MMM", { locale: ptBR })} -{' '}
          {format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 shrink-0"
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
        >
          →
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">Médico</label>
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">Paciente</label>
          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1 min-w-[160px]">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="SCHEDULED">Agendado</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="NO_SHOW">Não compareceu</option>
            <option value="DONE">Realizado</option>
          </select>
        </div>
        {(filterDoctor || filterPatient || filterStatus) && (
          <button
            onClick={() => {
              setFilterDoctor('')
              setFilterPatient('')
              setFilterStatus('')
            }}
            className="h-9 px-3 text-sm text-red-500 hover:text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Calendário */}
      {loading ? (
        <LoadingTable />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <div className="grid min-w-[600px]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
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
              <React.Fragment key={`hour-${hour}`}>
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
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}