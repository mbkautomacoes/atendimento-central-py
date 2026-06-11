'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ lead_name: name.trim(), status: 'new' }])
        .select()
      if (error) throw error
      router.push(`/chat/${data[0].id}`)
    } catch {
      alert('Erro ao iniciar conversa. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#202c33] px-6 py-6 text-center">
          <div className="w-16 h-16 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">Central PY</h1>
          <p className="text-[#8696a0] text-sm mt-1">Fale com nosso atendente</p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qual é o seu nome?
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Digite seu nome"
                autoComplete="given-name"
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-[#25d366] hover:bg-[#22c35e] active:bg-[#1da851] text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Iniciando...' : 'Iniciar Conversa'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Suas mensagens são seguras 🔒
          </p>
        </div>
      </div>
    </div>
  )
}
