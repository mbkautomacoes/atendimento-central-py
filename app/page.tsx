'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [savedConv, setSavedConv] = useState<{ id: string; name: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const convId = localStorage.getItem('cp_conv_id')
    const convName = localStorage.getItem('cp_lead_name')
    if (convId && convName) {
      // Verifica se a conversa ainda existe e não está fechada
      supabase.from('conversations').select('id, status').eq('id', convId).single()
        .then(({ data }) => {
          if (data && data.status !== 'closed') {
            setSavedConv({ id: convId, name: convName })
          } else {
            localStorage.removeItem('cp_conv_id')
            localStorage.removeItem('cp_lead_name')
          }
          setChecking(false)
        })
    } else {
      setChecking(false)
    }
  }, [])

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
      localStorage.setItem('cp_conv_id', data[0].id)
      localStorage.setItem('cp_lead_name', name.trim())
      router.push(`/chat/${data[0].id}`)
    } catch {
      alert('Erro ao iniciar conversa. Tente novamente.')
      setLoading(false)
    }
  }

  function continueConversation() {
    if (savedConv) router.push(`/chat/${savedConv.id}`)
  }

  function startNew() {
    localStorage.removeItem('cp_conv_id')
    localStorage.removeItem('cp_lead_name')
    setSavedConv(null)
  }

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#111b21]">
        <p className="text-[#8696a0] text-sm">Carregando...</p>
      </div>
    )
  }

  // Cliente já tem conversa ativa
  if (savedConv) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-8">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#202c33] px-6 py-6 text-center">
            <div className="w-16 h-16 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-2xl">
                {savedConv.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-white text-xl font-bold">Olá, {savedConv.name}!</h1>
            <p className="text-[#8696a0] text-sm mt-1">Você já tem uma conversa ativa</p>
          </div>
          <div className="px-6 py-6 space-y-3">
            <button
              onClick={continueConversation}
              className="w-full bg-[#25d366] hover:bg-[#22c35e] active:bg-[#1da851] text-white font-semibold py-3 rounded-xl transition text-base"
            >
              Continuar Conversa
            </button>
            <button
              onClick={startNew}
              className="w-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 font-medium py-3 rounded-xl transition text-sm"
            >
              Sou outra pessoa
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Novo cliente
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#202c33] px-6 py-6 text-center">
          <div className="w-16 h-16 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">Central PY</h1>
          <p className="text-[#8696a0] text-sm mt-1">Fale com nosso atendente</p>
        </div>
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
          <p className="text-center text-xs text-gray-400 mt-4">Suas mensagens são seguras 🔒</p>
        </div>
      </div>
    </div>
  )
}
