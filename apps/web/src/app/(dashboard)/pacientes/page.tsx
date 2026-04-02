'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { FormField } from '@/components/ui/form-field'
import { IMaskInput } from 'react-imask'

interface Patient {
  id: string
  name: string
  email: string | null
  phone: string | null
  cpf: string | null
  birthDate: string | null
  notes: string | null
}

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    notes: '',
  })

  async function loadPatients() {
    try {
      const { data } = await api.get('/patients')
      setPatients(data)
    } catch {
      toast.error('Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatients()
  }, [])

  function openNew() {
    setEditingPatient(null)
    setForm({ name: '', email: '', phone: '', cpf: '', birthDate: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(patient: Patient) {
    setEditingPatient(patient)
    setForm({
      name: patient.name,
      email: patient.email || '',
      phone: patient.phone || '',
      cpf: patient.cpf || '',
      birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
      notes: patient.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, form)
        toast.success('Paciente atualizado!')
      } else {
        await api.post('/patients', form)
        toast.success('Paciente cadastrado!')
      }
      setShowForm(false)
      loadPatients()
    } catch {
      toast.error('Erro ao salvar paciente')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover este paciente?')) return
    try {
      await api.delete(`/patients/${id}`)
      toast.success('Paciente removido!')
      loadPatients()
    } catch {
      toast.error('Erro ao remover paciente')
    }
  }

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search) ||
    p.phone?.includes(search)
  )

  return (
    <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pacientes</h2>
        <p className="text-slate-500 mt-0.5">Gerencie os pacientes da sua clínica</p>
      </div>
      <Button
        onClick={openNew}
        className="bg-blue-600 hover:bg-blue-700 gap-2"
      >
        + Novo paciente
      </Button>
    </div>

      {showForm && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              {editingPatient ? 'Editar paciente' : 'Novo paciente'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="name"
                  label="Nome completo"
                  placeholder="Maria da Silva"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  required
                />
                <FormField
                  id="email"
                  label="E-mail"
                  type="email"
                  placeholder="maria@email.com"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                    Telefone
                  </label>
                  <IMaskInput
                    id="phone"
                    mask="(00) 00000-0000"
                    value={form.phone}
                    onAccept={(value) => setForm({ ...form, phone: value })}
                    placeholder="(81) 99999-9999"
                    autoComplete="new-password"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cpf" className="text-sm font-medium text-slate-700">
                    CPF
                  </label>
                  <IMaskInput
                    id="cpf"
                    mask="000.000.000-00"
                    value={form.cpf}
                    onAccept={(value) => setForm({ ...form, cpf: value })}
                    placeholder="000.000.000-00"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Data de nascimento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={form.birthDate ? form.birthDate.split('-')[2] : ''}
                      onChange={(e) => {
                        const parts = form.birthDate ? form.birthDate.split('-') : ['', '', '']
                        parts[2] = e.target.value
                        setForm({ ...form, birthDate: parts.join('-') })
                      }}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Dia</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d).padStart(2, '0')}>
                          {String(d).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      value={form.birthDate ? form.birthDate.split('-')[1] : ''}
                      onChange={(e) => {
                        const parts = form.birthDate ? form.birthDate.split('-') : ['', '', '']
                        parts[1] = e.target.value
                        setForm({ ...form, birthDate: parts.join('-') })
                      }}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Mês</option>
                      {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                        <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={form.birthDate ? form.birthDate.split('-')[0] : ''}
                      onChange={(e) => {
                        const parts = form.birthDate ? form.birthDate.split('-') : ['', '', '']
                        parts[0] = e.target.value
                        setForm({ ...form, birthDate: parts.join('-') })
                      }}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Ano</option>
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <FormField
                  id="notes"
                  label="Observações"
                  placeholder="Alergia a dipirona..."
                  value={form.notes}
                  onChange={(v) => setForm({ ...form, notes: v })}
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingPatient ? 'Salvar alterações' : 'Cadastrar paciente'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">
              {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
            </p>
            {!search && (
              <Button className="mt-4" onClick={openNew}>
                Cadastrar primeiro paciente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => (
                <tr key={patient.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{patient.name}</p>
                    {patient.birthDate && (
                      <p className="text-xs text-slate-400">
                        {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.cpf || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300"
                        onClick={() => router.push(`/pacientes/${patient.id}`)}
                      >
                        Prontuário
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:text-slate-900"
                        onClick={() => openEdit(patient)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-red-500 hover:text-red-600 hover:border-red-300"
                        onClick={() => handleDelete(patient.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}