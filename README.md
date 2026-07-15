# Consultório · Salas — versão hospedável (Supabase + Netlify)

Esta é a versão do sistema pronta para rodar fora do Claude, com:
- **Login real** (Supabase Auth — senhas criptografadas, nunca em texto puro)
- **Banco de dados real** (Postgres via Supabase, com regras de segurança por linha — cada locatário só vê os próprios dados; o gestor vê tudo)
- **Atualização em tempo real** entre telas (Supabase Realtime)
- Todas as funcionalidades já construídas: turnos, horários globais, salas, reservas fixas com valor negociado, financeiro, cadastro completo, reset de senha.

## Passo 1 — Criar o projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (na sua organização "Dudu Novaes Ferraz", plano Free — você tem 1 vaga livre).
2. Anote a **senha do banco** que você definir (só é usada internamente, não precisa lembrar depois).
3. Quando o projeto terminar de criar, vá em **Project Settings → API**. Você vai precisar de dois valores:
   - **Project URL**
   - **anon public key**

## Passo 2 — Rodar o schema do banco

1. No painel do seu projeto, abra **SQL Editor → New query**.
2. Abra o arquivo `supabase/schema.sql` (está junto com este projeto), copie **todo o conteúdo** e cole no editor.
3. Clique em **Run**. Isso cria as tabelas, as 3 salas, os horários padrão e todas as regras de segurança.

## Passo 3 — Desabilitar confirmação de e-mail (recomendado para começar)

Para não depender de configurar um servidor de e-mail agora:
1. Vá em **Authentication → Providers → Email**.
2. Desmarque **"Confirm email"**.

(Você pode reativar depois, quando quiser configurar um e-mail remetente próprio em **Authentication → Emails**.)

## Passo 4 — Configurar as variáveis de ambiente

1. Copie o arquivo `.env.example` para `.env`.
2. Preencha com os valores do Passo 1:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

## Passo 5 — Testar localmente (opcional)

```bash
npm install
npm run dev
```
Abre em `http://localhost:5173`.

## Passo 6 — Criar sua conta de gestor

1. Rode o app (local ou já publicado) e clique em **"Primeiro acesso"**.
2. Cadastre-se com seus próprios dados — você vira um usuário comum (`tenant`) por enquanto.
3. No Supabase, vá em **SQL Editor** e rode (trocando pelo seu e-mail):
   ```sql
   update public.profiles set role = 'manager', status = 'ativo' where email = 'seuemail@exemplo.com';
   ```
4. Saia e entre de novo no app — agora você é o gestor.

## Passo 7 — Publicar no Netlify

Você já usa Netlify, então:

**Opção A — via GitHub (recomendado, atualiza sozinho a cada mudança):**
1. Suba esta pasta para um repositório novo no seu GitHub.
2. No Netlify: **Add new project → Import from GitHub** → selecione o repositório.
3. Build command: `npm run build` — Publish directory: `dist` (o `netlify.toml` já configura isso automaticamente).
4. Em **Site settings → Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env`.
5. Deploy.

**Opção B — upload manual (mais rápido pra testar agora):**
```bash
npm run build
```
Depois arraste a pasta `dist` gerada para a área "Drag and drop your project folder" no Netlify (você já viu essa tela).
⚠️ Nesse caso as variáveis de ambiente precisam ser configuradas manualmente em **Site settings → Environment variables** e você precisa rodar `npm run build` de novo e reenviar sempre que houver mudanças.

## Sobre segurança dos dados

- Cada locatário só consegue ver e mexer nas próprias reservas e nos próprios dados — reforçado no próprio banco (Row Level Security), não só na tela.
- Senhas nunca ficam visíveis a ninguém, nem ao gestor — reset é feito por link de e-mail.
- CPF, data de nascimento e telefone ficam salvos no banco, visíveis apenas ao próprio usuário e ao gestor.

## Limites do plano gratuito (para acompanhar)

- Supabase Free: 500 MB de banco, 50.000 usuários ativos/mês, projeto pausa após 7 dias sem uso (basta reabrir o painel para reativar).
- Netlify Free: créditos mensais compartilhados com seu outro projeto — o consumo deste app deve ser mínimo.
