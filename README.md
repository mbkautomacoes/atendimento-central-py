# ChatWeb Atendimento - MVP

Sistema de chat web para atendimento de leads com Supabase.

## ⚡ Quick Start

### 1️⃣ Setup Supabase (5 min)

1. Vá para [Supabase Console](https://supabase.com/dashboard)
2. Abra o SQL Editor
3. Copie e cole todo conteúdo do arquivo `supabase.sql`
4. Clique em "Run"

### 2️⃣ Setup Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Abre http://localhost:3000 no navegador.

---

## 🎯 Testando o MVP

### Cliente (Lead)
1. Va para http://localhost:3000
2. Informe um nome qualquer (ex: "João")
3. Clique em "Iniciar Conversa"
4. Envie uma mensagem (ex: "Olá!")

### Atendente (Admin)
1. Vá para http://localhost:3000/admin/login
2. Faça login com credenciais do Supabase (ou crie um usuário novo)
3. Clique na conversa do lead
4. Responda a mensagem

Você verá mensagens em tempo real em ambas as telas! 🎉

---

## 📁 Estrutura

```
/app
  /admin          → Painel do atendente
    /login        → Login
    /chat/[id]    → Chat do atendente
  /chat/[id]      → Chat do lead
  page.tsx        → Página inicial
/lib
  supabase.ts     → Cliente Supabase
```

---

## 🚀 Próximos Passos (v2)

- [ ] Multi-atendentes
- [ ] IA para sugestões
- [ ] Upload de arquivos
- [ ] Notificações push
- [ ] Tags de conversas
- [ ] CRM integrado

---

## 📊 Tecnologias

- **Next.js 14** (Frontend + API)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Tailwind CSS** (Styling)
- **TypeScript** (Type safety)

---

## 🤝 Dúvidas?

Verifique o arquivo `CLAUDE.md` para mais detalhes sobre o projeto.
