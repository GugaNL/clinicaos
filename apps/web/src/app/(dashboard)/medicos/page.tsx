'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Doctor {
  id: string
  name: string
  crm: string | null
  specialty: string | null
  color: string
}

export default function MedicosPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [form, setForm] = useState({
    name: '',
    crm: '',
    specialty: '',
    color: '#3B82F6',
  })

  async function loadDoctors() {
    try {
      const { data } = await api.get('/doctors')
      setDoctors(data)
    } catch {
      toast.error('Erro ao carregar médicos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDoctors()
  }, [])

  function openNew() {
    setEditingDoctor(null)
    setForm({ name: '', crm: '', specialty: '', color: '#3B82F6' })
    setShowForm(true)
  }

  function openEdit(doctor: Doctor) {
    setEditingDoctor(doctor)
    setForm({
      name: doctor.name,
      crm: doctor.crm || '',
      specialty: doctor.specialty || '',
      color: doctor.color,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor.id}`, form)
        toast.success('Médico atualizado!')
      } else {
        await api.post('/doctors', form)
        toast.success('Médico cadastrado!')
      }
      setShowForm(false)
      loadDoctors()
    } catch {
      toast.error('Erro ao salvar médico')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover este médico?')) return
    try {
      await api.delete(`/doctors/${id}`)
      toast.success('Médico removido!')
      loadDoctors()
    } catch {
      toast.error('Erro ao remover médico')
    }
  }

  return (
    <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Médicos</h2>
        <p className="text-slate-500 mt-0.5">Gerencie os médicos da sua clínica</p>
      </div>
      <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
        + Novo médico
      </Button>
    </div>

    {showForm && (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            {editingDoctor ? 'Editar médico' : 'Novo médico'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  placeholder="Dr. João Silva"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="crm" className="text-sm font-medium text-slate-700">
                  CRM
                </label>
                <input
                  id="crm"
                  placeholder="CRM/SP 123456"
                  value={form.crm}
                  onChange={(e) => setForm({ ...form, crm: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="specialty" className="text-sm font-medium text-slate-700">
                  Especialidade
                </label>
                <input
                  id="specialty"
                  placeholder="Clínico Geral"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="color" className="text-sm font-medium text-slate-700">
                  Cor no calendário
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-10 w-16 rounded-md border border-slate-200 cursor-pointer p-1 bg-white"
                  />
                  <span className="text-sm text-slate-500 font-mono">{form.color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingDoctor ? 'Salvar alterações' : 'Cadastrar médico'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )}

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">Nenhum médico cadastrado ainda.</p>
            <Button className="mt-4" onClick={openNew}>
              Cadastrar primeiro médico
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor) => (
            <Card key={doctor.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: doctor.color }}
                    >
                      {doctor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{doctor.name}</p>
                      {doctor.specialty && (
                        <p className="text-sm text-slate-500">{doctor.specialty}</p>
                      )}
                      {doctor.crm && (
                        <p className="text-xs text-slate-400">{doctor.crm}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-200 text-slate-600 hover:text-slate-900"
                    onClick={() => openEdit(doctor)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-slate-200 text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleDelete(doctor.id)}
                  >
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}