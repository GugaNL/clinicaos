'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { LoadingTable } from '@/components/LoadingSpinner'
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
import { IMaskInput } from 'react-imask'

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
  const [boletoData, setBoletoData] = useState<{
    boletoUrl: string
    barcode: string
    expiresAt: string
  } | null>(null)
  const [showBoletoForm, setShowBoletoForm] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [boletoForm, setBoletoForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cpf: '',
    zip: '',
    street: '',
    number: '',
    city: '',
    state: '',
  })

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

  async function handleGenerateBoleto(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPaymentId) return
    try {
      const { data } = await api.post(`/payments/${selectedPaymentId}/boleto`, boletoForm)
      setBoletoData(data)
      setShowBoletoForm(false)
      toast.success('Boleto gerado!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar boleto')
    }
  }

  async function generateReceipt(payment: Payment) {
    const jsPDF = (await import('jspdf')).jsPDF
    const doc = new jsPDF()

    const blue = '#2563eb'
    const darkBlue = '#1e40af'
    const gray = '#64748b'
    const lightGray = '#f1f5f9'
    const dark = '#0f172a'

    // Cabeçalho azul
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 45, 'F')

    // Título
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('ClinicaOS', 20, 20)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Gestão Clínica', 20, 30)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE PAGAMENTO', 210 - 20, 25, { align: 'right' })

    // Número do recibo
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nº ${payment.id.slice(-8).toUpperCase()}`, 210 - 20, 35, { align: 'right' })

    // Faixa cinza claro
    doc.setFillColor(241, 245, 249)
    doc.rect(0, 45, 210, 20, 'F')

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Data de emissão:', 20, 57)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text(format(new Date(), "dd/MM/yyyy 'às' HH:mm"), 60, 57)

    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text('Status:', 130, 57)
    doc.setTextColor(22, 163, 74)
    doc.setFont('helvetica', 'bold')
    doc.text('PAGO', 150, 57)

    // Seção: Dados da consulta
    doc.setFillColor(255, 255, 255)
    doc.setTextColor(37, 99, 235)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DA CONSULTA', 20, 80)

    doc.setDrawColor(37, 99, 235)
    doc.setLineWidth(0.5)
    doc.line(20, 83, 190, 83)

    const fields = [
      { label: 'Paciente', value: payment.appointment.patient.name },
      { label: 'Médico', value: payment.appointment.doctor.name },
      { label: 'Data da consulta', value: format(parseISO(payment.appointment.startsAt), "dd/MM/yyyy 'às' HH:mm") },
      { label: 'Forma de pagamento', value: METHOD_LABELS[payment.method] },
      { label: 'Data do pagamento', value: payment.paidAt ? format(parseISO(payment.paidAt), 'dd/MM/yyyy') : '—' },
    ]

    let y = 95
    fields.forEach((field, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(15, y - 6, 180, 14, 'F')
      }
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(field.label + ':', 20, y)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text(field.value, 80, y)
      y += 16
    })

    // Seção: Valor
    y += 10
    doc.setFillColor(37, 99, 235)
    doc.rect(15, y - 8, 180, 28, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('VALOR TOTAL PAGO', 20, y + 4)

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(payment.amount)),
      190,
      y + 4,
      { align: 'right' }
    )

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Por extenso: ${formatCurrency(Number(payment.amount))}`, 20, y + 14)

    // Rodapé
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(15, 265, 195, 265)

    doc.setTextColor(148, 163, 184)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Este recibo é válido como comprovante de pagamento.', 105, 272, { align: 'center' })
    doc.text('ClinicaOS — Sistema de Gestão Clínica', 105, 279, { align: 'center' })
    doc.text(`app.codexlabdigital.com.br`, 105, 286, { align: 'center' })

    doc.save(`recibo-${payment.appointment.patient.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'ddMMyyyy')}.pdf`)
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
            <LoadingTable />
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
                                className="text-orange-600"
                                onClick={() => {
                                  setSelectedPaymentId(payment.id)
                                  setBoletoForm({
                                    firstName: payment.appointment.patient.name.split(' ')[0],
                                    lastName: payment.appointment.patient.name.split(' ').slice(1).join(' '),
                                    email: '',
                                    cpf: '',
                                    zip: '',
                                    street: '',
                                    number: '',
                                    city: '',
                                    state: '',
                                  })
                                  setShowBoletoForm(true)
                                }}
                              >
                                Gerar Boleto
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 text-center">
              <p className="text-white font-semibold text-lg">Pague com PIX</p>
              <p className="text-blue-100 text-sm mt-0.5">Escaneie o QR Code ou copie o código</p>
            </div>

            <div className="p-6 space-y-5">
              {/* QR Code */}
              {pixData.qrCodeBase64 && (
                <div className="flex justify-center">
                  <div className="border-4 border-blue-600 rounded-xl p-2">
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-44 h-44"
                    />
                  </div>
                </div>
              )}

              {/* Validade */}
              {pixData.expiresAt && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg py-2">
                  <span>⏱</span>
                  <span>Expira em {format(parseISO(pixData.expiresAt), "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
              )}

              {/* PIX Copia e Cola */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PIX Copia e Cola</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 truncate font-mono">
                    {pixData.pixCopiaECola}
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.pixCopiaECola)
                      toast.success('Código copiado!')
                    }}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              {/* Fechar */}
              <Button
                variant="outline"
                className="w-full border-slate-200 text-slate-600"
                onClick={() => setPixData(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {boletoData && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="bg-orange-500 px-6 py-4 text-center">
        <p className="text-white font-semibold text-lg">Boleto gerado!</p>
        <p className="text-orange-100 text-sm mt-0.5">Copie o código ou acesse o boleto</p>
      </div>
      <div className="p-6 space-y-4">
        {boletoData.expiresAt && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg py-2">
            <span>⏱</span>
            <span>Vence em {format(parseISO(boletoData.expiresAt), "dd/MM/yyyy")}</span>
          </div>
        )}
        {boletoData.barcode && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código de barras</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 truncate font-mono">
                {boletoData.barcode}
              </div>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(boletoData.barcode)
                  toast.success('Código copiado!')
                }}
              >
                Copiar
              </Button>
            </div>
          </div>
        )}
        {boletoData.boletoUrl && (
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600"
            onClick={() => window.open(boletoData.boletoUrl, '_blank')}
          >
            Abrir boleto PDF
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full border-slate-200"
          onClick={() => setBoletoData(null)}
        >
          Fechar
        </Button>
      </div>
    </div>
  </div>
)}

      {showBoletoForm && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="bg-orange-500 px-6 py-4">
        <p className="text-white font-semibold text-lg">Gerar Boleto</p>
        <p className="text-orange-100 text-sm mt-0.5">Preencha os dados do pagador</p>
      </div>
      <form onSubmit={handleGenerateBoleto} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Nome</label>
            <input
              value={boletoForm.firstName}
              onChange={(e) => setBoletoForm({ ...boletoForm, firstName: e.target.value })}
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Sobrenome</label>
            <input
              value={boletoForm.lastName}
              onChange={(e) => setBoletoForm({ ...boletoForm, lastName: e.target.value })}
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">E-mail</label>
          <input
            type="email"
            value={boletoForm.email}
            onChange={(e) => setBoletoForm({ ...boletoForm, email: e.target.value })}
            required
            className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">CPF</label>
            <IMaskInput
              mask="000.000.000-00"
              value={boletoForm.cpf}
              onAccept={(value) => setBoletoForm({ ...boletoForm, cpf: value })}
              placeholder="000.000.000-00"
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">CEP</label>
            <IMaskInput
              mask="00000-000"
              value={boletoForm.zip}
              onAccept={(value) => setBoletoForm({ ...boletoForm, zip: value })}
              placeholder="00000-000"
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Rua</label>
            <input
              value={boletoForm.street}
              onChange={(e) => setBoletoForm({ ...boletoForm, street: e.target.value })}
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Número</label>
            <input
              value={boletoForm.number}
              onChange={(e) => setBoletoForm({ ...boletoForm, number: e.target.value })}
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Cidade</label>
            <input
              value={boletoForm.city}
              onChange={(e) => setBoletoForm({ ...boletoForm, city: e.target.value })}
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">UF</label>
            <input
              value={boletoForm.state}
              onChange={(e) => setBoletoForm({ ...boletoForm, state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="PE"
              required
              className="flex h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
            Gerar boleto
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowBoletoForm(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  )
}