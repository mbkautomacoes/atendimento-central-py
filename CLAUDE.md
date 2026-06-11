# CHATWEB ATENDIMENTO - MVP Chat para Atendimento de Leads

## Visão Geral
Sistema simples de chat web para atendimento de leads. Lead clica em link, informa nome, conversa em tempo real com atendente. Mensagens salvas no BD.

## Objetivo MVP
Validar um canal de atendimento próprio sem depender da API do WhatsApp.

---

## Arquitetura

### Tech Stack
- **Frontend**: Next.js + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Realtime**: Supabase Realtime (websocket)

### Rotas
```
/                          → Página entrada (informa nome)
/chat/[conversationId]     → Chat do cliente
/admin/login               → Login atendente
/admin                     → Lista conversas
/admin/chat/[conversationId] → Chat atendente
```

---

## Banco de Dados

### Tabela: conversations
```
id (uuid)
lead_name (text)
status (enum: new, open, closed)
created_at
updated_at
```

### Tabela: messages
```
id (uuid)
conversation_id (fk)
sender_type (enum: lead, agent)
message (text)
created_at
```

---

## Fluxo Crítico (MVP)

1. **Lead inicia**: Tela com campo "Nome" + botão "Iniciar Conversa"
2. **Cria conversa**: POST /api/conversations (status = new)
3. **Entra no chat**: Redireciona para /chat/[conversationId]
4. **Envia msg**: POST /api/messages (salva no BD)
5. **Realtime**: Subscribe messages na conversation_id, atualiza tela
6. **Atendente recebe**: Subscribe na lista conversas, vê nova msg em tempo real
7. **Atendente responde**: POST /api/messages (sender_type = agent)
8. **Lead recebe**: Realtime entrega msg para cliente

---

## Prioridades MVP
✅ Criar conversas (lead)
✅ Enviar/receber mensagens tempo real (lead + atendente)
✅ Login simples atendente (Supabase Auth)
✅ Histórico persistente

---

## Fora do Escopo v1
❌ IA, Multiatendentes, Upload, Áudio, Emoji, CRM, Tags, Notificações

---

## Memória do Projeto
Guardar no arquivo: tudo o que trabalhar aqui deve ser documentado na memória.
