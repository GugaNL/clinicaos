export function LoadingSpinner({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  )
}

export function LoadingTable() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-slate-200 rounded-lg" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-lg" />
      ))}
    </div>
  )
}