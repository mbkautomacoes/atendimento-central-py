'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStartChat(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ lead_name: name, status: 'new' }])
        .select()

      if (error) throw error

      const conversationId = data[0].id
      router.push(`/chat/${conversationId}`)
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao iniciar conversa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          ChatWeb Atendimento
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Converse com nosso atendente
        </p>

        <form onSubmit={handleStartChat} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual é seu nome?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando...' : 'Iniciar Conversa'}
          </button>
        </form>
      </div>
    </div>
  )
}
