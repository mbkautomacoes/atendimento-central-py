'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Conversation {
  id: string
  lead_name: string
  status: string
  updated_at: string
}

export default function AdminPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const router = useRouter()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    checkAuth()
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
      return
    }
    setEmail(user.email || '')
    await loadConversations()
    subscribeToConversations()
  }

  async function loadConversations() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  function subscribeToConversations() {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }

    channelRef.current = supabase
      .channel('admin-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => { loadConversations() }
      )
      .subscribe()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-600">Carregando conversas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Painel Atendente</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{email}</span>
            <button
              onClick={handleLogout}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Conversas Recentes
        </h2>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p>Nenhuma conversa ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => router.push(`/admin/chat/${conv.id}`)}
                className="w-full bg-white rounded-lg shadow p-4 hover:shadow-lg transition text-left border-l-4 border-blue-500"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800">{conv.lead_name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(conv.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      conv.status === 'new'
                        ? 'bg-green-100 text-green-800'
                        : conv.status === 'open'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {conv.status === 'new' ? 'Nova' : conv.status === 'open' ? 'Aberta' : 'Fechada'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
