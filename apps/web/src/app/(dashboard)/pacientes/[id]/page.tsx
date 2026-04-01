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
  console.log('carregando dados para id:', id)
  try {
    const [patRes, recRes] = await Promise.all([
      api.get(`/patients/${id}`),
      api.get(`/records/patient/${id}`),
    ])
    setPatient(patRes.data)
    setRecords(recRes.data)
    console.log('records:', recRes.data)
console.log('records length:', recRes.data.length)
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

  function openNew() {
    setEditingRecord(null)
    setForm({
      complaint: '',
      anamnesis: '',
      physicalExam: '',
      diagnosis: '',
      prescription: '',
      notes: '',
    })
    setShowForm(true)
  }

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

  if (loading) return <p className="text-slate-500">Carregando...</p>
  if (!patient) return <p className="text-slate-500">Paciente não encontrado.</p>

return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/pacientes')}>
          ← Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{patient?.name}</h2>
          <p className="text-slate-500">Prontuário eletrônico</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Telefone</p>
              <p className="font-medium">{patient?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">CPF</p>
              <p className="font-medium">{patient?.cpf || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">E-mail</p>
              <p className="font-medium">{patient?.email || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Nascimento</p>
              <p className="font-medium">
                {patient?.birthDate
                  ? format(parseISO(patient.birthDate), 'dd/MM/yyyy')
                  : '—'}
              </p>
            </div>
            {patient?.notes && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-slate-500">Observações</p>
                <p className="font-medium">{patient.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Histórico de atendimentos</h3>
        <Button onClick={() => setShowForm(true)}>Novo atendimento</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingRecord ? 'Editar atendimento' : 'Novo atendimento'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Queixa principal</Label>
                <textarea
                  value={form.complaint}
                  onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                  placeholder="Descreva a queixa principal do paciente..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Anamnese</Label>
                <textarea
                  value={form.anamnesis}
                  onChange={(e) => setForm({ ...form, anamnesis: e.target.value })}
                  placeholder="História da doença atual, antecedentes..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Exame físico</Label>
                <textarea
                  value={form.physicalExam}
                  onChange={(e) => setForm({ ...form, physicalExam: e.target.value })}
                  placeholder="Sinais vitais, ausculta, palpação..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Diagnóstico</Label>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  placeholder="Hipótese diagnóstica, CID..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Prescrição</Label>
                <textarea
                  value={form.prescription}
                  onChange={(e) => setForm({ ...form, prescription: e.target.value })}
                  placeholder="Medicamentos, dosagens, orientações..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Retorno, encaminhamentos, outros..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
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
              <Card key={record.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {format(parseISO(record.createdAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {content.diagnosis && (
                        <p className="text-sm text-slate-500 mt-0.5">{content.diagnosis}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setExpandedRecord(isExpanded ? null : record.id)}>
                        {isExpanded ? 'Recolher' : 'Ver mais'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(record)}>
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(record.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3 text-sm">
                    {content.complaint && (
                      <div>
                        <p className="font-medium text-slate-700">Queixa principal</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{content.complaint}</p>
                      </div>
                    )}
                    {content.anamnesis && (
                      <div>
                        <p className="font-medium text-slate-700">Anamnese</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{content.anamnesis}</p>
                      </div>
                    )}
                    {content.physicalExam && (
                      <div>
                        <p className="font-medium text-slate-700">Exame físico</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{content.physicalExam}</p>
                      </div>
                    )}
                    {content.diagnosis && (
                      <div>
                        <p className="font-medium text-slate-700">Diagnóstico</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{content.diagnosis}</p>
                      </div>
                    )}
                    {content.prescription && (
                      <div>
                        <p className="font-medium text-slate-700">Prescrição</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{content.prescription}</p>
                      </div>
                    )}
                    {content.notes && (
                      <div>
                        <p className="font-medium text-slate-700">Observações</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{content.notes}</p>
                      </div>
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