'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  birthDate: string | null
  notes: string | null
}

interface RecordContent {
  complaint?: string
  anamnesis?: string
  physicalExam?: string
  diagnosis?: string
  prescription?: string
  notes?: string
}

interface MedicalRecord {
  id: string
  createdAt: string
  content: string
}

export default function PatientPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [form, setForm] = useState<RecordContent>({
    complaint: '',
    anamnesis: '',
    physicalExam: '',
    diagnosis: '',
    prescription: '',
    notes: '',
  })

  async function loadData() {
    try {
      const [patRes, recRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/records/patient/${id}`),
      ])
      setPatient(patRes.data)
      setRecords(recRes.data)
    } catch {
      toast.error('Erro ao carregar dados do paciente')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])


  function openEdit(record: MedicalRecord) {
    setEditingRecord(record)
    setForm(JSON.parse(record.content))
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingRecord) {
        await api.put(`/records/${editingRecord.id}`, { content: form })
        toast.success('Prontuário atualizado!')
      } else {
        await api.post('/records', { patientId: id, content: form })
        toast.success('Prontuário criado!')
      }
      setShowForm(false)
      loadData()
    } catch {
      toast.error('Erro ao salvar prontuário')
    }
  }

  async function handleDelete(recordId: string) {
    if (!confirm('Deseja remover este prontuário?')) return
    try {
      await api.delete(`/records/${recordId}`)
      toast.success('Prontuário removido!')
      loadData()
    } catch {
      toast.error('Erro ao remover prontuário')
    }
  }

  async function handleExportAllPDF() {
    if (records.length === 0) return
    const jsPDF = (await import('jspdf')).jsPDF
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('ClinicaOS', 20, 18)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Histórico Completo de Atendimentos', 20, 28)

    doc.setFontSize(10)
    doc.text(format(new Date(), "dd/MM/yyyy"), 190, 28, { align: 'right' })

    // Dados do paciente
    doc.setFillColor(241, 245, 249)
    doc.rect(0, 40, 210, 28, 'F')

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(patient?.name || '', 20, 54)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    const infos = [
      patient?.phone ? `Tel: ${patient.phone}` : null,
      patient?.cpf ? `CPF: ${patient.cpf}` : null,
      patient?.birthDate ? `Nasc: ${format(parseISO(patient.birthDate), 'dd/MM/yyyy')}` : null,
    ].filter(Boolean).join('   |   ')
    doc.text(infos, 20, 63)

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.text(`Total de atendimentos: ${records.length}`, 20, 72)

    let y = 88

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const content: RecordContent = JSON.parse(record.content)

      if (i > 0) {
        doc.addPage()
        y = 20
      }

      // Separador do atendimento
      doc.setFillColor(37, 99, 235)
      doc.rect(0, y - 6, 210, 14, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `Atendimento ${i + 1} — ${format(parseISO(record.createdAt), "dd/MM/yyyy 'às' HH:mm")}`,
        20,
        y + 2
      )

      y += 16

      const fields = [
        { label: 'Queixa Principal', value: content.complaint },
        { label: 'Anamnese', value: content.anamnesis },
        { label: 'Exame Físico', value: content.physicalExam },
        { label: 'Diagnóstico', value: content.diagnosis },
        { label: 'Prescrição', value: content.prescription },
        { label: 'Observações', value: content.notes },
      ].filter((f) => f.value)

      for (const field of fields) {
        if (y > 260) {
          doc.addPage()
          y = 20
        }

        doc.setTextColor(37, 99, 235)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(field.label.toUpperCase(), 20, y)

        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)

        const lines = doc.splitTextToSize(field.value || '', 170)
        doc.text(lines, 20, y + 7)

        y += 10 + lines.length * 6 + 6

        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(20, y - 3, 190, y - 3)
      }
    }

    // Rodapé na última página
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(8)
    doc.text('ClinicaOS — Sistema de Gestão Clínica', 105, 285, { align: 'center' })

    doc.save(`historico-completo-${patient?.name?.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'ddMMyyyy')}.pdf`)
  }

  async function handleExportPDF(record: MedicalRecord) {
      const jsPDF = (await import('jspdf')).jsPDF
      const content: RecordContent = JSON.parse(record.content)
      const doc = new jsPDF()

      // Cabeçalho
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, 210, 40, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('ClinicaOS', 20, 18)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Prontuário Eletrônico', 20, 28)

      doc.setFontSize(10)
      doc.text(format(new Date(), "dd/MM/yyyy"), 190, 28, { align: 'right' })

      // Dados do paciente
      doc.setFillColor(241, 245, 249)
      doc.rect(0, 40, 210, 28, 'F')

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(patient?.name || '', 20, 54)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      const infos = [
        patient?.phone ? `Tel: ${patient.phone}` : null,
        patient?.cpf ? `CPF: ${patient.cpf}` : null,
        patient?.birthDate ? `Nasc: ${format(parseISO(patient.birthDate), 'dd/MM/yyyy')}` : null,
      ].filter(Boolean).join('   |   ')
      doc.text(infos, 20, 63)

      // Data do atendimento
      doc.setTextColor(37, 99, 235)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Atendimento: ${format(parseISO(record.createdAt), "dd/MM/yyyy 'às' HH:mm")}`, 20, 82)

      doc.setDrawColor(37, 99, 235)
      doc.setLineWidth(0.5)
      doc.line(20, 85, 190, 85)

      // Campos do prontuário
      const fields = [
        { label: 'Queixa Principal', value: content.complaint },
        { label: 'Anamnese', value: content.anamnesis },
        { label: 'Exame Físico', value: content.physicalExam },
        { label: 'Diagnóstico', value: content.diagnosis },
        { label: 'Prescrição', value: content.prescription },
        { label: 'Observações', value: content.notes },
      ].filter((f) => f.value)

      let y = 95

      for (const field of fields) {
        if (y > 260) {
          doc.addPage()
          y = 20
        }

        doc.setTextColor(37, 99, 235)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(field.label.toUpperCase(), 20, y)

        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)

        const lines = doc.splitTextToSize(field.value || '', 170)
        doc.text(lines, 20, y + 7)

        y += 10 + lines.length * 6 + 6

        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(20, y - 3, 190, y - 3)
      }

      // Rodapé
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.text('ClinicaOS — Sistema de Gestão Clínica', 105, 285, { align: 'center' })

      doc.save(`prontuario-${patient?.name?.toLowerCase().replace(/\s+/g, '-')}-${format(parseISO(record.createdAt), 'ddMMyyyy')}.pdf`)
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>
  if (!patient) return <p className="text-slate-500">Paciente não encontrado.</p>

return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          className="border-slate-200 text-slate-600"
          onClick={() => router.push('/pacientes')}
        >
          ← Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{patient?.name}</h2>
          <p className="text-slate-500 mt-0.5">Prontuário eletrônico</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">Dados do paciente</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Telefone</p>
              <p className="font-medium text-slate-900">{patient?.phone || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">CPF</p>
              <p className="font-medium text-slate-900">{patient?.cpf || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">E-mail</p>
              <p className="font-medium text-slate-900">{patient?.email || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Nascimento</p>
              <p className="font-medium text-slate-900">
                {patient?.birthDate
                  ? format(parseISO(patient.birthDate), 'dd/MM/yyyy')
                  : '—'}
              </p>
            </div>
            {patient?.notes && (
              <div className="col-span-2 md:col-span-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-amber-600 mb-1 font-medium">⚠ Observações</p>
                <p className="text-slate-900">{patient.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Histórico de atendimentos</h3>
        {records.length > 0 && (
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600"
            onClick={handleExportAllPDF}
          >
            Exportar histórico PDF
          </Button>
        )}
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          + Novo atendimento
        </Button>
      </div>

      {showForm && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              {editingRecord ? 'Editar atendimento' : 'Novo atendimento'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: 'complaint', label: 'Queixa principal', placeholder: 'Descreva a queixa principal do paciente...', rows: 2 },
                { id: 'anamnesis', label: 'Anamnese', placeholder: 'História da doença atual, antecedentes...', rows: 3 },
                { id: 'physicalExam', label: 'Exame físico', placeholder: 'Sinais vitais, ausculta, palpação...', rows: 3 },
                { id: 'diagnosis', label: 'Diagnóstico', placeholder: 'Hipótese diagnóstica, CID...', rows: 2 },
                { id: 'prescription', label: 'Prescrição', placeholder: 'Medicamentos, dosagens, orientações...', rows: 3 },
                { id: 'notes', label: 'Observações', placeholder: 'Retorno, encaminhamentos, outros...', rows: 2 },
              ].map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">{field.label}</label>
                  <textarea
                    value={form[field.id as keyof RecordContent] || ''}
                    onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={field.rows}
                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingRecord ? 'Salvar alterações' : 'Salvar atendimento'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Nenhum atendimento registrado ainda.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              Registrar primeiro atendimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const content: RecordContent = JSON.parse(record.content)
            const isExpanded = expandedRecord === record.id
            return (
              <Card key={record.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {format(parseISO(record.createdAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {content.diagnosis && (
                        <p className="text-sm text-slate-500 mt-0.5">{content.diagnosis}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 text-xs"
                        onClick={() => handleExportPDF(record)}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 text-xs"
                        onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                      >
                        {isExpanded ? 'Recolher' : 'Ver mais'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 text-xs"
                        onClick={() => openEdit(record)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-500 hover:text-red-600 text-xs"
                        onClick={() => handleDelete(record.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4 text-sm border-t border-slate-100">
                    {[
                      { key: 'complaint', label: 'Queixa principal' },
                      { key: 'anamnesis', label: 'Anamnese' },
                      { key: 'physicalExam', label: 'Exame físico' },
                      { key: 'diagnosis', label: 'Diagnóstico' },
                      { key: 'prescription', label: 'Prescrição' },
                      { key: 'notes', label: 'Observações' },
                    ].map(({ key, label }) =>
                      content[key as keyof RecordContent] ? (
                        <div key={key} className="pt-4">
                          <p className="font-medium text-slate-700 mb-1">{label}</p>
                          <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                            {content[key as keyof RecordContent]}
                          </p>
                        </div>
                      ) : null
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}