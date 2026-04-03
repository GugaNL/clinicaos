import Link from 'next/link'
import { Stethoscope, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-8xl font-bold text-blue-600">404</h1>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">Página não encontrada</h2>
          <p className="text-slate-500 mt-2">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  )
}