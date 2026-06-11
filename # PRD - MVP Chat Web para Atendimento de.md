# PRD - MVP Chat Web para Atendimento de Leads

## Visão Geral

Criar um sistema simples de atendimento via chat web.

O lead recebe um link em um disparo de WhatsApp.

Ao clicar no link:

1. Informa seu nome.
2. Inicia uma conversa.
3. Troca mensagens em tempo real com um atendente.

Todas as mensagens ficam armazenadas no banco de dados.

O atendente acessa um painel interno para visualizar e responder conversas.

---

# Objetivo

Validar um canal de atendimento próprio sem depender da API do WhatsApp.

---

# Escopo MVP

## Área do Cliente

### Tela Inicial

Campos:

* Nome

Botão:

* Iniciar Conversa

Fluxo:

O usuário informa o nome e entra no chat.

---

### Tela de Conversa

Componentes:

* Histórico de mensagens
* Campo de texto
* Botão enviar

Funcionalidades:

* Enviar mensagem
* Receber mensagens em tempo real
* Manter histórico durante a sessão

---

## Área do Atendente

### Login Simples

Apenas:

* E-mail
* Senha

Utilizar Supabase Auth.

---

### Lista de Conversas

Exibir:

* Nome do lead
* Última mensagem
* Horário da última interação

Ordenar:

Mais recentes primeiro.

---

### Chat do Atendente

Exibir:

* Nome do lead
* Histórico completo

Permitir:

* Enviar mensagens
* Receber mensagens em tempo real

---

# Banco de Dados

## Tabela: conversations

Campos:

id
lead_name
status
created_at
updated_at

Status:

new
open
closed

---

## Tabela: messages

Campos:

id
conversation_id
sender_type
message
created_at

sender_type:

lead
agent

---

# Regras de Negócio

## Nova Conversa

Quando o usuário iniciar conversa:

* Criar registro em conversations
* Status = new

---

## Envio de Mensagem

Ao enviar mensagem:

* Salvar em messages
* Atualizar updated_at da conversa

---

## Recebimento em Tempo Real

Utilizar Supabase Realtime.

Quando nova mensagem for criada:

* Atualizar tela do cliente
* Atualizar tela do atendente

Sem necessidade de refresh.

---

# Tecnologias

Frontend:

* Next.js
* Tailwind CSS

Backend:

* Supabase

Banco:

* PostgreSQL (Supabase)

Realtime:

* Supabase Realtime

Autenticação:

* Supabase Auth

---

# Estrutura de Páginas

/

Página de entrada

---

/chat/[conversationId]

Chat do cliente

---

/admin/login

Login do atendente

---

/admin

Lista de conversas

---

/admin/chat/[conversationId]

Atendimento individual

---

# Critérios de Sucesso

O MVP será considerado validado quando:

1. Um lead acessar o link.
2. Informar seu nome.
3. Enviar mensagem.
4. O atendente receber em tempo real.
5. O atendente responder.
6. O lead receber a resposta em tempo real.
7. Todo histórico permanecer salvo.

---

# Fora do Escopo

Não implementar nesta fase:

* IA
* Multiatendentes
* Upload de arquivos
* Áudio
* Emoji
* CRM
* Funil
* Tags
* Notificações
* WhatsApp API
* Integrações externas

Essas funcionalidades serão avaliadas somente após validação do MVP.
