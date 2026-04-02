'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { setAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Stethoscope } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    slug: '',
    email: '',
    password: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.token, data.clinicId)
      router.push('/dashboard')
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error.response?.data?.error || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Lado esquerdo — visual */}
      <div className="hidden md:flex flex-col justify-between bg-blue-600 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold">ClinicaOS</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold leading-tight">
            Gestão clínica simples e eficiente
          </h2>
          <p className="text-blue-100 text-lg">
            Agendamentos, prontuários, financeiro e muito mais em um só lugar.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Clínicas ativas', value: '100+' },
            { label: 'Consultas gerenciadas', value: '50k+' },
            { label: 'Satisfação', value: '98%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-blue-100 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm space-y-8">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold">ClinicaOS</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta</h1>
            <p className="text-slate-500 mt-1">Entre na sua clínica para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador da clínica</Label>
              <Input
                id="slug"
                placeholder="minha-clinica"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <a href="/register" className="text-blue-600 font-medium hover:underline">
              Cadastre sua clínica
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}