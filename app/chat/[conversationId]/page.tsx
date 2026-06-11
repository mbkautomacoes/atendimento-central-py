'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  message: string
  sender_type: 'lead' | 'agent'
  message_type: string
  file_url?: string
  file_name?: string
  created_at: string
}

interface Conversation {
  id: string
  lead_name: string
}

export default function ChatPage({ params }: { params: { conversationId: string } }) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const { conversationId } = params

  useEffect(() => {
    init()
    // Polling fallback a cada 5s (garante atualização mesmo se Realtime falhar no mobile)
    pollRef.current = setInterval(() => {
      loadMessages()
    }, 5000)
    return () => {
      channelRef.current?.unsubscribe()
      clearInterval(pollRef.current)
    }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', conversationId).order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function init() {
    const [convRes, msgsRes] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', conversationId).single(),
      supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
    ])
    if (convRes.data) setConversation(convRes.data)
    if (msgsRes.data) setMessages(msgsRes.data)
    setLoading(false)

    channelRef.current?.unsubscribe()
    channelRef.current = supabase.channel(`lead-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => loadMessages())
      .subscribe()
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await supabase.from('messages').insert([{
        conversation_id: conversationId, sender_type: 'lead', message_type: 'text', message: newMessage,
      }])
      setNewMessage('')
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    } finally { setSending(false) }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${conversationId}/${Date.now()}.${ext}`
      const { data: up, error } = await supabase.storage.from('chat-files').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(up.path)
      await supabase.from('messages').insert([{
        conversation_id: conversationId, sender_type: 'lead',
        message_type: file.type.startsWith('image/') ? 'image' : 'document',
        message: file.name, file_url: publicUrl, file_name: file.name,
      }])
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    } catch { alert('Erro ao enviar arquivo') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-[#0b141a]" style={{ height: '100dvh' }}>
        <p className="text-[#8696a0] text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full bg-[#0b141a]" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 bg-[#202c33] shadow flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center text-white font-bold flex-shrink-0">
          {conversation?.lead_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[#e9edef] font-medium text-sm truncate">{conversation?.lead_name}</p>
          <p className="text-[#8696a0] text-xs">Atendimento</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-[#8696a0] text-sm">Nenhuma mensagem ainda</p>
              <p className="text-[#8696a0] text-xs mt-1">Diga olá! 👋</p>
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'lead' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-md ${msg.sender_type === 'lead' ? 'bg-[#005c4b]' : 'bg-[#202c33]'}`}>
              {msg.message_type === 'image' && msg.file_url ? (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                  <img src={msg.file_url} alt={msg.file_name} className="rounded max-w-full max-h-52 object-cover" />
                </a>
              ) : msg.message_type === 'document' && msg.file_url ? (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80">
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
          className="text-[#8696a0] active:text-[#e9edef] disabled:opacity-50 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
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
    </div>
  )
}
