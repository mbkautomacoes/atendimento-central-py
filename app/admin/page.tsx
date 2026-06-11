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

interface Message {
  id: string
  message: string
  sender_type: 'lead' | 'agent'
  message_type: string
  file_url?: string
  file_name?: string
  created_at: string
}

export default function AdminPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [email, setEmail] = useState('')
  const [search, setSearch] = useState('')
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set())
  const [showChat, setShowChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const convChannelRef = useRef<any>(null)
  const msgChannelRef = useRef<any>(null)
  const notifPermRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    setupNotifications()
    return () => {
      convChannelRef.current?.unsubscribe()
      msgChannelRef.current?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (selectedConv) {
      setMessages([])
      loadMessages(selectedConv.id)
      subscribeToMessages(selectedConv.id)
      setUnreadIds(prev => { const n = new Set(prev); n.delete(selectedConv.id); return n })
    }
  }, [selectedConv?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const count = unreadIds.size
    document.title = count > 0 ? `(${count}) Central PY` : 'Central PY - Atendimento'
  }, [unreadIds])

  function setupNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => { notifPermRef.current = p === 'granted' })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      notifPermRef.current = true
    }
  }

  function playSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  function notify(title: string, body: string) {
    if (notifPermRef.current && document.hidden) {
      new Notification(title, { body, icon: '/icon.svg' })
    }
  }

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/admin/login'); return }
    setEmail(user.email || '')
    await loadConversations()
    subscribeToConversations()
  }

  async function loadConversations() {
    try {
      const { data, error } = await supabase.from('conversations')
        .select('*').order('updated_at', { ascending: false })
      if (error) throw error
      setConversations(data || [])
    } finally { setLoading(false) }
  }

  function subscribeToConversations() {
    convChannelRef.current?.unsubscribe()
    convChannelRef.current = supabase.channel('admin-convs-v5')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, (p) => {
        const conv = p.new as Conversation
        setConversations(prev => [conv, ...prev])
        setUnreadIds(prev => new Set([...prev, conv.id]))
        playSound()
        notify('Novo Lead!', `${conv.lead_name} iniciou uma conversa`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => loadConversations())
      .subscribe()
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', convId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  function subscribeToMessages(convId: string) {
    msgChannelRef.current?.unsubscribe()
    msgChannelRef.current = supabase.channel(`msgs-v3-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (p) => {
          const msg = p.new as Message
          setMessages(prev => [...prev, msg])
          if (msg.sender_type === 'lead') {
            playSound()
            notify('Nova mensagem', msg.message_type === 'text' ? msg.message : '📎 Arquivo')
          }
        })
      .subscribe()
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConv) return
    setSending(true)
    try {
      await supabase.from('messages').insert([{
        conversation_id: selectedConv.id, sender_type: 'agent', message_type: 'text', message: newMessage,
      }])
      setNewMessage('')
      await supabase.from('conversations').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', selectedConv.id)
    } finally { setSending(false) }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedConv) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${selectedConv.id}/${Date.now()}.${ext}`
      const { data: up, error } = await supabase.storage.from('chat-files').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(up.path)
      const isImage = file.type.startsWith('image/')
      await supabase.from('messages').insert([{
        conversation_id: selectedConv.id, sender_type: 'agent',
        message_type: isImage ? 'image' : 'document',
        message: file.name, file_url: publicUrl, file_name: file.name,
      }])
      await supabase.from('conversations').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', selectedConv.id)
    } catch { alert('Erro ao enviar arquivo') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    setShowChat(true)
    setUnreadIds(prev => { const n = new Set(prev); n.delete(conv.id); return n })
  }

  function handleLogout() {
    supabase.auth.signOut().then(() => router.push('/admin/login'))
  }

  function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  function fmtDate(d: string) {
    const date = new Date(d), today = new Date()
    return date.toDateString() === today.toDateString()
      ? fmtTime(d) : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const filtered = conversations.filter(c => c.lead_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex w-full overflow-hidden bg-[#111b21]" style={{ height: '100dvh' }}>

      {/* ══ SIDEBAR ══ */}
      <div className={`
        flex-col bg-[#111b21] border-r border-[#2a3942]
        ${showChat ? 'hidden' : 'flex'}
        w-full md:flex md:w-72 lg:w-80 xl:w-96 md:flex-shrink-0
      `} style={{ height: '100dvh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 bg-[#202c33] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            <span className="text-[#e9edef] text-xs truncate">{email}</span>
          </div>
          <button onClick={handleLogout} className="text-[#8696a0] hover:text-[#e9edef] text-xs whitespace-nowrap flex-shrink-0 px-2 py-1">
            Sair
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-2 gap-2">
            <svg className="w-4 h-4 text-[#8696a0] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar"
              className="bg-transparent text-[#d1d7db] placeholder-[#8696a0] text-sm outline-none w-full" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-[#8696a0] text-sm text-center mt-10">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-[#8696a0] text-sm text-center mt-10">Nenhuma conversa</p>
          ) : filtered.map(conv => (
            <button key={conv.id} onClick={() => selectConversation(conv)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#2a3942] active:bg-[#2a3942] transition border-b border-[#2a3942] text-left ${selectedConv?.id === conv.id ? 'bg-[#2a3942]' : ''}`}>
              <div className="w-11 h-11 rounded-full bg-[#6b7280] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                {conv.lead_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-1">
                  <span className="text-[#e9edef] font-medium text-sm truncate">{conv.lead_name}</span>
                  <span className="text-[#8696a0] text-[11px] flex-shrink-0">{fmtDate(conv.updated_at)}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5 gap-1">
                  <span className="text-[#8696a0] text-xs truncate">
                    {conv.status === 'new' ? 'Nova conversa' : conv.status === 'open' ? 'Em atendimento' : 'Finalizada'}
                  </span>
                  {unreadIds.has(conv.id) && (
                    <span className="bg-[#25d366] text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">!</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ CHAT ══ */}
      <div className={`
        flex-col bg-[#0b141a] overflow-hidden
        ${showChat ? 'flex' : 'hidden'}
        w-full md:flex md:flex-1
      `} style={{ height: '100dvh' }}>

        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-2 px-3 py-3 bg-[#202c33] shadow flex-shrink-0">
              <button onClick={() => setShowChat(false)}
                className="md:hidden text-[#8696a0] active:text-[#e9edef] p-1 -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-9 h-9 rounded-full bg-[#6b7280] flex items-center justify-center text-white font-bold flex-shrink-0">
                {selectedConv.lead_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#e9edef] font-medium text-sm truncate">{selectedConv.lead_name}</p>
                <p className="text-[#8696a0] text-xs">
                  {selectedConv.status === 'new' ? 'Nova' : selectedConv.status === 'open' ? 'Em atendimento' : 'Finalizada'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-md ${msg.sender_type === 'agent' ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}>
                    {msg.message_type === 'image' && msg.file_url ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                        <img src={msg.file_url} alt={msg.file_name} className="rounded max-w-full max-h-52 object-cover" />
                      </a>
                    ) : msg.message_type === 'document' && msg.file_url ? (
                      <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:opacity-80 transition">
                        <div className="w-9 h-9 bg-[#8696a0] rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#e9edef] text-xs font-medium truncate max-w-[140px]">{msg.file_name}</p>
                          <p className="text-[#8696a0] text-[10px]">Toque para abrir</p>
                        </div>
                      </a>
                    ) : (
                      <p className="text-[#e9edef] text-sm leading-relaxed break-words">{msg.message}</p>
                    )}
                    <p className="text-[#8696a0] text-[10px] mt-1 text-right">{fmtTime(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-2 py-2 bg-[#202c33] flex-shrink-0">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="text-[#8696a0] active:text-[#e9edef] p-2 disabled:opacity-50 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                {uploading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
              <form onSubmit={sendMessage} className="flex-1 flex items-center gap-2 min-w-0">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem"
                  className="flex-1 min-w-0 bg-[#2a3942] text-[#d1d7db] placeholder-[#8696a0] rounded-full px-4 py-2.5 outline-none text-sm"
                  disabled={sending} />
                <button type="submit" disabled={sending || !newMessage.trim()}
                  className="text-[#00a884] active:text-[#25d366] disabled:opacity-30 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Empty state - desktop only */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35]">
            <svg className="w-16 h-16 text-[#2a3942] mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            <h2 className="text-[#e9edef] text-xl font-light mb-2">Painel de Atendimento</h2>
            <p className="text-[#8696a0] text-sm text-center px-8">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
