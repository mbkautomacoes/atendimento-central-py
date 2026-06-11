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
  const [showChat, setShowChat] = useState(false) // mobile: controla qual painel mostrar
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const convChannelRef = useRef<any>(null)
  const msgChannelRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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
      // Mark as read
      setUnreadIds(prev => {
        const next = new Set(prev)
        next.delete(selectedConv.id)
        return next
      })
    }
  }, [selectedConv?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update tab title with unread count
  useEffect(() => {
    const count = unreadIds.size
    document.title = count > 0 ? `(${count}) Painel Atendimento` : 'Painel Atendimento'
  }, [unreadIds])

  function setupNotifications() {
    // Create audio element for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiVkHRhWVuJiIRuYFpfh4iEcGNbXoaIhXFkXF+GiIVyZV1ghYiFc2ZeYYWIhXVnX2OFiIV2aWBlhYiFd2phZ4WIhXhrY2qFiIV5bGVthIiFeW5nb4SIhXpwaHGEiIV7cmp0hIiFe3NreISIhXx0bHqEiIV9dm18hIiFfnd0f4OIhX54dYGDiIV/enaDg4iGgHt4hoOIhoF9e4mDiIaCfn6Mg4iGg4CAj4OIhoSBgpKDiIaFg4WVg4iGhoWHmIOIhoeGipuDiIaJh42eg4iGiomPoIOIhoyKkqODiIaOi5Smg4iGkIyXqYOIhpKNmqyDiIaVjp2vg4iGl4+gsYOIhpmQo7SDiIabo6e2g4iGnZequIOIhqCWrbuDiIajl7C+g4iGpZizvYOIhqeZtr+DiIaqmrjBg4iGrZu7w4OIhrCcvMWDiIaynb7Hg4iGtZ6/yYOIhriegcrDiIa6n4LMhYiGvKCEzoWIhr2ghNGFiIa/oYXThYiGwqKH1YWIhsWjid6FiIbHpIrhg4iGy6WM44OIhs6mjuWDiIbSp5Dng4iG1qiS6YOIhtqpk+uDiIbdqpXtg4iG4auX74OIhuOsmfGDiIbmrZvzg4iG6a6c9YOIhu2vnveDiIbxsKD5g4iG9LGi+4OIhvmzpP+DiIb9tKX/hYiGAAAA')

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        notifPermRef.current = perm === 'granted'
      })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      notifPermRef.current = true
    }
  }

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  function sendBrowserNotification(title: string, body: string) {
    if (notifPermRef.current && document.hidden) {
      new Notification(title, { body, icon: '/favicon.ico' })
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
      const { data, error } = await supabase
        .from('conversations').select('*').order('updated_at', { ascending: false })
      if (error) throw error
      setConversations(data || [])
    } finally {
      setLoading(false)
    }
  }

  function subscribeToConversations() {
    convChannelRef.current?.unsubscribe()
    convChannelRef.current = supabase
      .channel('admin-convs-v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const conv = payload.new as Conversation
          setConversations(prev => [conv, ...prev])
          setUnreadIds(prev => new Set([...prev, conv.id]))
          playNotificationSound()
          sendBrowserNotification('Novo Lead!', `${conv.lead_name} iniciou uma conversa`)
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => { loadConversations() }
      )
      .subscribe()
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  function subscribeToMessages(convId: string) {
    msgChannelRef.current?.unsubscribe()
    msgChannelRef.current = supabase
      .channel(`admin-msgs-v2-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
        if (msg.sender_type === 'lead') {
          playNotificationSound()
          sendBrowserNotification('Nova mensagem', msg.message_type === 'text' ? msg.message : '📎 Arquivo')
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
        conversation_id: selectedConv.id, sender_type: 'agent',
        message_type: 'text', message: newMessage,
      }])
      setNewMessage('')
      await supabase.from('conversations')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', selectedConv.id)
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
      await supabase.from('conversations')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', selectedConv.id)
    } catch { alert('Erro ao enviar arquivo') }
    finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function selectConversation(conv: Conversation) {
    setSelectedConv(conv)
    setShowChat(true) // mobile: vai para o chat
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
      ? fmtTime(d)
      : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const filtered = conversations.filter(c =>
    c.lead_name.toLowerCase().includes(search.toLowerCase())
  )
  const totalUnread = unreadIds.size

  // ── SIDEBAR ──
  const Sidebar = (
    <div className="flex flex-col h-full bg-[#111b21]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#202c33]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {email.charAt(0).toUpperCase()}
          </div>
          <span className="text-[#e9edef] text-sm truncate max-w-[160px]">{email}</span>
        </div>
        <button onClick={handleLogout} className="text-[#8696a0] hover:text-[#e9edef] text-sm transition">Sair</button>
      </div>

      <div className="px-3 py-2 bg-[#111b21]">
        <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-2 gap-2">
          <svg className="w-4 h-4 text-[#8696a0] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar conversa"
            className="bg-transparent text-[#d1d7db] placeholder-[#8696a0] text-sm outline-none flex-1" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-[#8696a0] text-sm text-center mt-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-[#8696a0] text-sm text-center mt-8">Nenhuma conversa</p>
        ) : filtered.map(conv => (
          <button key={conv.id} onClick={() => selectConversation(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2a3942] transition border-b border-[#2a3942] text-left ${selectedConv?.id === conv.id ? 'bg-[#2a3942]' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-[#6b7280] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {conv.lead_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[#e9edef] font-medium text-sm truncate">{conv.lead_name}</span>
                <span className="text-[#8696a0] text-xs ml-2 flex-shrink-0">{fmtDate(conv.updated_at)}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-[#8696a0] text-xs">
                  {conv.status === 'new' ? 'Nova conversa' : conv.status === 'open' ? 'Em atendimento' : 'Finalizada'}
                </span>
                {unreadIds.has(conv.id) && (
                  <span className="bg-[#25d366] text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">!</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── CHAT PANEL ──
  const ChatPanel = selectedConv ? (
    <div className="flex-1 flex flex-col bg-[#0b141a] h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] shadow">
        {/* Mobile back button */}
        <button onClick={() => setShowChat(false)}
          className="md:hidden text-[#8696a0] hover:text-[#e9edef] mr-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-full bg-[#6b7280] flex items-center justify-center text-white font-bold flex-shrink-0">
          {selectedConv.lead_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[#e9edef] font-medium">{selectedConv.lead_name}</p>
          <p className="text-[#8696a0] text-xs">
            {selectedConv.status === 'new' ? 'Nova' : selectedConv.status === 'open' ? 'Em atendimento' : 'Finalizada'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-md ${msg.sender_type === 'agent' ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}>
              {msg.message_type === 'image' && msg.file_url ? (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={msg.file_url} alt={msg.file_name} className="rounded max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition" />
                </a>
              ) : msg.message_type === 'document' && msg.file_url ? (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:opacity-80 transition min-w-[160px]">
                  <div className="w-10 h-10 bg-[#8696a0] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#e9edef] text-sm font-medium truncate">{msg.file_name}</p>
                    <p className="text-[#8696a0] text-xs">Clique para abrir</p>
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

      <div className="flex items-center gap-2 px-3 py-3 bg-[#202c33]">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="text-[#8696a0] hover:text-[#e9edef] transition p-2 disabled:opacity-50 flex-shrink-0">
          {uploading ? (
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        <form onSubmit={sendMessage} className="flex-1 flex items-center gap-2">
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem"
            className="flex-1 bg-[#2a3942] text-[#d1d7db] placeholder-[#8696a0] rounded-lg px-4 py-2.5 outline-none text-sm"
            disabled={sending} />
          <button type="submit" disabled={sending || !newMessage.trim()}
            className="text-[#00a884] hover:text-[#25d366] transition disabled:opacity-30 p-2 flex-shrink-0">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  ) : (
    <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#222e35]">
      <svg className="w-20 h-20 text-[#2a3942] mb-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
      <h2 className="text-[#e9edef] text-2xl font-light mb-2">Painel de Atendimento</h2>
      <p className="text-[#8696a0] text-sm text-center max-w-xs">Selecione uma conversa para começar</p>
      {totalUnread > 0 && (
        <div className="mt-4 bg-[#25d366] text-black px-4 py-2 rounded-full text-sm font-bold">
          {totalUnread} conversa{totalUnread > 1 ? 's' : ''} aguardando!
        </div>
      )}
    </div>
  )

  return (
    <div className="flex w-screen h-screen overflow-hidden" style={{ background: '#111b21' }}>

      {/* MOBILE: mostra UM painel por vez em tela cheia */}
      {/* DESKTOP: sidebar fixa + chat ao lado */}

      {/* Sidebar */}
      <div className={`
        flex-col h-full
        ${showChat ? 'hidden' : 'flex'}
        w-full
        md:flex md:w-[360px] md:flex-shrink-0 md:border-r md:border-[#2a3942]
      `}>
        {Sidebar}
      </div>

      {/* Chat */}
      <div className={`
        flex-col h-full overflow-hidden
        ${showChat ? 'flex' : 'hidden'}
        w-full
        md:flex md:flex-1
      `}>
        {ChatPanel}
      </div>
    </div>
  )
}
