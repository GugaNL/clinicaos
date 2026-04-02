'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { DollarSign, Clock, AlertCircle } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Payment {
  id: string
  amount: number
  method: string
  status: string
  paidAt: string | null
  createdAt: string
  appointment: {
    startsAt: string
    doctor: { name: string }
    patient: { name: string; phone: string | null }
  }
}

interface MonthReport {
  month: string
  paid: number
  pending: number
  paidCount: number
  pendingCount: number
}

const METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de crédito',
  HEALTH_INSURANCE: 'Convênio',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  REFUNDED: 'Estornado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-red-100 text-red-700',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [overdue, setOverdue] = useState<Payment[]>([])
  const [report, setReport] = useState<MonthReport[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'payments' | 'report' | 'overdue'>('payments')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStart, setFilterStart] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  )
  const [filterEnd, setFilterEnd] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  )
  const [pixData, setPixData] = useState<{
    pixCopiaECola: string
    qrCodeBase64: string
    expiresAt: string
  } | null>(null)
  const [pixLoading, setPixLoading] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [payRes, overdueRes, reportRes] = await Promise.all([
        api.get('/payments', {
          params: {
            start: filterStart,
            end: filterEnd,
            ...(filterStatus && { status: filterStatus }),
          },
        }),
        api.get('/payments/overdue'),
        api.get('/payments/report'),
      ])
      setPayments(payRes.data)
      setOverdue(overdueRes.data)
      setReport(reportRes.data)
    } catch {
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterStart, filterEnd, filterStatus])

  async function handleStatusChange(id: string, status: string) {
    try {
      await api.patch(`/payments/${id}/status`, { status })
      toast.success('Status atualizado!')
      loadData()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  async function handleGeneratePix(payment: Payment) {
    setPixLoading(true)
    try {
      const { data } = await api.post(`/payments/${payment.id}/pix`)
      setPixData(data)
      toast.success('PIX gerado com sucesso!')
    } catch {
      toast.error('Erro ao gerar PIX')
    } finally {
      setPixLoading(false)
    }
  }

  async function generateReceipt(payment: Payment) {
    const jsPDF = (await import('jspdf')).jsPDF

    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('RECIBO DE PAGAMENTO', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.text(`Paciente: ${payment.appointment.patient.name}`, 20, 50)
    doc.text(`Médico: ${payment.appointment.doctor.name}`, 20, 60)
    doc.text(
      `Data da consulta: ${format(parseISO(payment.appointment.startsAt), "dd/MM/yyyy 'às' HH:mm")}`,
      20, 70
    )
    doc.text(`Forma de pagamento: ${METHOD_LABELS[payment.method]}`, 20, 80)
    doc.text(`Valor: ${formatCurrency(Number(payment.amount))}`, 20, 90)
    doc.text(
      `Data do pagamento: ${payment.paidAt ? format(parseISO(payment.paidAt), 'dd/MM/yyyy') : '—'}`,
      20, 100
    )

    doc.setFontSize(10)
    doc.text(
      `Recibo gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      105, 280,
      { align: 'center' }
    )

    doc.save(`recibo-${payment.appointment.patient.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

  const totalPaid = payments
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + Number(p.amount), 0)

  const totalPending = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Financeiro</h2>
        <p className="text-slate-500 mt-0.5">Controle de cobranças e pagamentos</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Recebido no período</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '8px' }}>
                <DollarSign style={{ color: '#16a34a', width: '20px', height: '20px' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Pendente no período</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(totalPending)}</p>
              </div>
              <div style={{ backgroundColor: '#fffbeb', padding: '8px', borderRadius: '8px' }}>
                <Clock style={{ color: '#d97706', width: '20px', height: '20px' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Inadimplentes</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{overdue.length}</p>
              </div>
              <div style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '8px' }}>
                <AlertCircle style={{ color: '#dc2626', width: '20px', height: '20px' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: 'payments' as const, label: 'Cobranças' },
          { key: 'report' as const, label: 'Relatório mensal' },
          { key: 'overdue' as const, label: `Inadimplência (${overdue.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Cobranças */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg p-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">De</label>
              <input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
                className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Até</label>
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="REFUNDED">Estornado</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500">Carregando...</p>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">Nenhuma cobrança encontrada.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Médico</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Método</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {payment.appointment.patient.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {payment.appointment.doctor.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {format(parseISO(payment.appointment.startsAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {formatCurrency(Number(payment.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {METHOD_LABELS[payment.method]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[payment.status]}`}>
                          {STATUS_LABELS[payment.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {payment.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600"
                                disabled={pixLoading}
                                onClick={() => handleGeneratePix(payment)}
                              >
                                Gerar PIX
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleStatusChange(payment.id, 'PAID')}
                              >
                                Marcar pago
                              </Button>
                            </>
                          )}
                          {payment.status === 'PAID' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateReceipt(payment)}
                            >
                              Recibo PDF
                            </Button>
                          )}
                          {payment.status === 'PAID' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleStatusChange(payment.id, 'REFUNDED')}
                            >
                              Estornar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Relatório mensal */}
      {activeTab === 'report' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita dos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => format(parseISO(v), 'MMM/yy', { locale: ptBR })}
                />
                <YAxis tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: unknown) =>
                    formatCurrency(
                      Number(Array.isArray(value) ? value[0] : value)
                    )
                  }
                  labelFormatter={(v) =>
                    format(parseISO(String(v)), 'MMMM yyyy', { locale: ptBR })
                  }
                />
                <Legend />
                <Bar dataKey="paid" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab: Inadimplência */}
      {activeTab === 'overdue' && (
        <div className="space-y-3">
          {overdue.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-green-600 font-medium">Nenhum inadimplente! 🎉</p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Paciente</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Telefone</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Data consulta</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Valor</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {payment.appointment.patient.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {payment.appointment.patient.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {format(parseISO(payment.appointment.startsAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">
                        {formatCurrency(Number(payment.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => handleStatusChange(payment.id, 'PAID')}
                        >
                          Marcar pago
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {pixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-base text-center">Pague com PIX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {pixData.qrCodeBase64 && (
                <Image
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={192}
                  height={192}
                  className="mx-auto h-48 w-48"
                  unoptimized
                />
              )}
              <div className="space-y-2">
                <p className="text-sm text-slate-500">PIX Copia e Cola</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={pixData.pixCopiaECola}
                    className="flex-1 text-xs rounded-md border border-input bg-background px-3 py-2 truncate"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.pixCopiaECola)
                      toast.success('Copiado!')
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
              {pixData.expiresAt && (
                <p className="text-xs text-slate-400">
                  Expira em {format(parseISO(pixData.expiresAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPixData(null)}
              >
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}