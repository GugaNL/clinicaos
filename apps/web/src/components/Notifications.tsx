'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Bell, Calendar, DollarSign, X } from 'lucide-react'

interface Notification {
  id: string
  type: 'appointment' | 'payment'
  title: string
  description: string
  href: string
}

export function Notifications() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  async function loadNotifications() {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) loadNotifications()
        }}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-900 text-sm">Notificações</p>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-500">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    router.push(notification.href)
                    setOpen(false)
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    notification.type === 'appointment'
                      ? 'bg-blue-100'
                      : 'bg-amber-100'
                  }`}>
                    {notification.type === 'appointment' ? (
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{notification.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}