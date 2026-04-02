'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Settings, Users, Building2, Trash2, Plus } from 'lucide-react'
import { IMaskInput } from 'react-imask'

interface Clinic {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  RECEPTIONIST: 'Recepcionista',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  DOCTOR: 'bg-blue-100 text-blue-700',
  RECEPTIONIST: 'bg-green-100 text-green-700',
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'clinic' | 'users'>('clinic')
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserForm, setShowUserForm] = useState(false)
  const [clinicForm, setClinicForm] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'RECEPTIONIST',
    password: '',
  })

  async function loadData() {
    try {
      const [clinicRes, usersRes] = await Promise.all([
        api.get('/settings/clinic'),
        api.get('/settings/users'),
      ])
      setClinic(clinicRes.data)
      setUsers(usersRes.data)
      setClinicForm({
        name: clinicRes.data.name,
        phone: clinicRes.data.phone || '',
        address: clinicRes.data.address || '',
      })
    } catch {
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSaveClinic(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.put('/settings/clinic', clinicForm)
      toast.success('Dados da clínica atualizados!')
      loadData()
    } catch {
      toast.error('Erro ao salvar dados')
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/settings/users', userForm)
      toast.success('Usuário criado!')
      setShowUserForm(false)
      setUserForm({ name: '', email: '', role: 'RECEPTIONIST', password: '' })
      loadData()
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Erro ao criar usuário')
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    try {
      await api.delete(`/settings/users/${id}`)
      toast.success('Usuário removido!')
      loadData()
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Erro ao remover usuário')
    }
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>

  return (
    <div className="space-y-6">
    <div className="flex items-center gap-3 mt-2">
      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
        <Settings className="w-5 h-5 text-slate-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Configurações</h2>
        <p className="text-slate-500 mt-0.5">Gerencie sua clínica e usuários</p>
      </div>
    </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: 'clinic', label: 'Dados da clínica', icon: Building2 },
          { key: 'users', label: `Usuários (${users.length})`, icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'clinic' | 'users')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Dados da clínica */}
      {activeTab === 'clinic' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Informações da clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveClinic} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Nome da clínica <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={clinicForm.name}
                    onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Identificador (slug)
                  </label>
                  <input
                    value={clinic?.slug || ''}
                    disabled
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400">O identificador não pode ser alterado</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Telefone</label>
                  <IMaskInput
                    mask="(00) 00000-0000"
                    value={clinicForm.phone}
                    onAccept={(value) => setClinicForm({ ...clinicForm, phone: value })}
                    placeholder="(81) 99999-9999"
                    autoComplete="new-password"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Endereço</label>
                  <input
                    value={clinicForm.address}
                    onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Salvar alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: Usuários */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowUserForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo usuário
            </Button>
          </div>

          {showUserForm && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Novo usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        placeholder="João Silva"
                        required
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        E-mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        placeholder="joao@email.com"
                        required
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Perfil <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="RECEPTIONIST">Recepcionista</option>
                        <option value="DOCTOR">Médico</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Senha <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Criar usuário
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowUserForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 font-semibold text-sm">
                              {user.name.charAt(0)}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}