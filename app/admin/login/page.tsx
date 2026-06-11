'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/admin')
    } catch (err: any) {
      setError('Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#111b21] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">CP</span>
          </div>
          <h1 className="text-[#e9edef] text-2xl font-light">Central PY</h1>
          <p className="text-[#8696a0] text-sm mt-1">Painel de Atendimento</p>
        </div>

        {/* Card */}
        <div className="bg-[#202c33] rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[#8696a0] text-xs font-medium mb-2 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full bg-[#2a3942] text-[#d1d7db] placeholder-[#8696a0] rounded-xl px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-[#25d366]"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[#8696a0] text-xs font-medium mb-2 uppercase tracking-wide">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#2a3942] text-[#d1d7db] placeholder-[#8696a0] rounded-xl px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-[#25d366]"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-[#25d366] hover:bg-[#22c35e] active:bg-[#1da851] text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
