# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Este arquivo e a fonte absoluta da verdade do projeto.** Leia-o no inicio de cada sessao e confirme o entendimento do estado atual antes de qualquer acao. Toda decisao tecnica relevante deve ser registrada aqui.

---

## Projeto

**Nome:** The Agent (Meteora Digital)
**Descricao:** Plataforma SaaS de gestao de agentes de IA conversacionais, com suporte multicanal (WhatsApp, Instagram, Web), base de conhecimento (RAG), analytics e administracao multi-tenant.
**Repositorio:** https://github.com/RNobre1/sierrabrasil

## Metodologia de Trabalho: Pair Programming (Akita/XP)

Operamos em **Pair Programming** estrito: o usuario e o **Arquiteto/Piloto** (define rumo e decisoes), a IA e o **Agente Executor** (implementa de forma incremental e segura).

### Principios Inegociaveis

1. **Sem alucinacao arquitetural.** Nunca gere sistemas inteiros, arquiteturas complexas ou grandes blocos de codigo de forma arbitraria. O usuario define o esqueleto; a IA preenche funcoes especificas de forma iterativa.
2. **TDD absoluto.** E proibido escrever codigo de producao antes dos testes correspondentes. O primeiro passo ao receber uma feature e criar os cenarios de teste. Use mocks quando dependencias ainda nao existirem. Codigo de producao so existe para fazer um teste falho passar.
3. **Transparencia e aprovacao.** Antes de executar acoes destrutivas ou de impacto (migrations, instalar pacotes, deletar arquivos, alterar configs), explique o que pretende fazer e aguarde aprovacao explicita.
4. **Correcao autonoma com registro.** Se a IA cometer erros, o usuario explicara via prompt. A IA deve corrigir por conta propria e documentar a licao aprendida neste arquivo para que a falha nao se repita.
5. **YAGNI.** Cada interacao foca em uma unica tarefa. Sem codigo especulativo, sem antecipar funcionalidades futuras. Diante de ambiguidade, pergunte.
6. **Conventional Commits.** Mensagens de commit seguem o padrao: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

### Ciclo de Desenvolvimento (Fases Sequenciais)

Ao iniciar ou expandir um modulo:

1. **Fundacao** — Rascunhar arquitetura, modelagem de dados e estrutura de diretorios neste arquivo. Nenhum codigo pratico nesta fase.
2. **Testes** — Escrever 100% dos cenarios de teste (TDD) para as features planejadas.
3. **Implementacao** — Codificar estritamente para que os testes passem. Foco em legibilidade e corretude; zero otimizacao prematura.
4. **Refatoracao** — Com testes passando, refatorar, aplicar Design Patterns e otimizar.
5. **Integracao** — Criar a camada de apresentacao (componentes React, endpoints).
6. **CI/CD** — Configurar linters, testes automaticos e scripts de deploy.

### Workflow de Desenvolvimento com Antigravity (Gemini 3.1 Pro High)

O desenvolvimento conta com dois agentes de IA:

- **Claude Code (este)** — Dev Senior / Orquestrador. Toma decisoes arquiteturais, implementa funcionalidades criticas, e revisa todo codigo produzido.
- **Antigravity (Gemini 3.1 Pro High)** — Dev Junior. Executa tarefas especificas delegadas pelo Claude Code.

**Regras de delegacao:**

1. Para cada tarefa em andamento, Claude Code deve identificar subtarefas paralelizaveis e gerar um **prompt detalhado** para o Antigravity executar.
2. O prompt deve incluir: contexto do projeto, arquivos que pode editar, arquivos que **NAO deve tocar** (para evitar conflitos), criterios de aceitacao, e convencoes do projeto.
3. Apos gerar o prompt, **perguntar ao usuario:** "Quer paralelizar essa tarefa com o Antigravity?"
   - Se **sim**: considerar a tarefa delegada; continuar trabalhando em outras coisas; aguardar o usuario enviar a resposta do Antigravity para revisao.
   - Se **nao**: Claude Code executa tudo sozinho.
4. **Revisao obrigatoria:** Todo codigo produzido pelo Antigravity deve ser revisado pelo Claude Code antes de ser aceito. Verificar: corretude, padroes do projeto, seguranca, testes, e conflitos com outros arquivos.
5. **Isolamento de arquivos:** Nunca delegar ao Antigravity arquivos que o Claude Code esta editando ativamente. Definir claramente o escopo de cada agente.

### Uso Proativo de MCPs

Sempre que identificar uma integracao externa (API, servico, ferramenta) que seria melhor acessada via MCP server ao inves de chamadas manuais, **perguntar ao usuario:** "Quer adicionar um MCP server para [servico]? Facilitaria [beneficio]."

Se o usuario aceitar, ajudar a configurar o MCP (buscar servidor disponivel, configurar credenciais, testar conexao).

**MCPs atualmente conectados:**
- Supabase (gerenciamento de projetos, SQL, migrations, edge functions)
- Notion
- Canva
- Asana

## Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript 5.8 + Vite 5 (SWC) |
| Roteamento | React Router DOM 6 |
| Estado servidor | TanStack React Query 5 |
| Formularios | React Hook Form + Zod |
| UI | shadcn/ui (Radix) + Tailwind CSS 3 |
| Animacao | Framer Motion |
| Graficos | Recharts |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions Deno) |
| Gateway LLM | OpenRouter (multi-modelo: Claude, GPT, Gemini) |
| Web Scraping | Apify (redes sociais e sites) |
| WhatsApp | Evolution API (Droplet DigitalOcean) |
| Transcricao Audio | AssemblyAI |
| Testes unitarios | Vitest + Testing Library (jsdom) |
| Testes E2E | Playwright |
| Lint | ESLint 9 (TS + React Hooks + React Refresh) |
| Hospedagem Frontend | DigitalOcean (App Platform para testes, Droplet para producao) |

### Ferramentas Disponiveis (com plano pago)

DigitalOcean, OpenRouter, Manus, Claude, Apify (gratis por enquanto), Lovable, n8n, Supabase.

## Comandos

```bash
npm run dev          # Dev server em localhost:8080 com HMR
npm run build        # Build de producao (dist/)
npm run build:dev    # Build de dev com source maps
npm run preview      # Preview do build de producao
npm run lint         # ESLint em todos os TS/TSX
npm run test         # Vitest (execucao unica)
npm run test:watch   # Vitest em modo watch
```

Para rodar um unico teste:
```bash
npx vitest run src/path/to/file.test.ts
```

Testes ficam em `src/**/*.{test,spec}.{ts,tsx}`. Setup em `src/test/setup.ts`.

## Variaveis de Ambiente

Prefixo `VITE_` obrigatorio para acesso no browser via `import.meta.env`.

| Variavel | Descricao |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publica (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |

**Secrets no Supabase (Edge Functions):**

| Secret | Descricao |
|---|---|
| `OPENROUTER_API_KEY` | Gateway multi-modelo LLM |
| `ASSEMBLYAI_API_KEY` | Transcricao de audio |
| `APIFY_API_TOKEN` | Web scraping de redes sociais |
| `EVOLUTION_API_KEY` | Autenticacao na Evolution API |
| `EVOLUTION_API_URL` | URL do droplet DigitalOcean |

## Arquitetura

### Estrutura de Diretorios

```
src/
  App.tsx                    # Roteador principal (BrowserRouter + Routes)
  main.tsx                   # Entry point React DOM
  contexts/AuthContext.tsx    # Provider de autenticacao (user, session, profile, roles, isAdmin)
  components/
    ui/                      # Componentes shadcn/ui (~50 arquivos, nao editar diretamente)
    layouts/                 # ClientLayout, AdminLayout
    agents/                  # Componentes de agentes (Config, Knowledge, Memory, Skills)
    channels/                # InstagramTab, WhatsAppTab
    onboarding/              # Fluxo de onboarding
    ProtectedRoute.tsx       # Guard de autenticacao (suporta requireAdmin)
  pages/                     # Paginas (1 arquivo = 1 rota)
    admin/                   # Paginas administrativas
  hooks/                     # use-toast, use-mobile
  integrations/supabase/
    client.ts                # Instancia unica do Supabase client
    types.ts                 # Tipos auto-gerados (nao editar)
  lib/utils.ts               # cn() para class merging
  assets/                    # Imagens de branding
  test/setup.ts              # Setup Vitest + Testing Library

supabase/
  config.toml                # project_id
  functions/                 # Edge Functions (Deno runtime)
    chat/                    # Handler principal de conversacao
    onboarding-chat/         # Assistente de onboarding
    process-knowledge/       # Processamento de base de conhecimento (RAG)
    scrape-urls/             # Web scraping para knowledge base
    evolution-api/           # Integracao WhatsApp via Evolution API
    whatsapp-webhook/        # Webhook de mensagens WhatsApp
    transcribe-audio/        # Transcricao de audio
  migrations/                # SQL migrations (timestamp_uuid.sql)
```

### Padroes e Convencoes

- **Import alias:** `@/` mapeia para `src/` (tsconfig.json + vite.config.ts)
- **Supabase client:** Sempre importar de `@/integrations/supabase/client`
- **Autenticacao:** Hook `useAuth()` retorna `{ user, session, profile, roles, isAdmin, loading, signOut }`
- **Rotas protegidas:** Envolver com `<ProtectedRoute>` (ou `<ProtectedRoute requireAdmin>` para admin)
- **Notificacoes:** Sonner (toast) para feedback ao usuario
- **Dark mode:** Class-based (`dark` no `<html>`)
- **Fontes:** DM Sans (body), Outfit (display), JetBrains Mono (code)
- **Cores custom:** Paleta `cosmos` (indigo, violet, lavender, cyan, emerald, amber, rose, pink) no Tailwind
- **Sombras custom:** `cosmos-sm/md/lg`, `cosmos-glow`, `glow-indigo/cyan/emerald`

### Modelo de Dados (Tabelas Principais)

- `profiles` — Perfil do usuario (full_name, avatar_url, phone)
- `user_roles` — Papeis: `admin` | `client`
- `tenants` — Organizacao/tenant (owner_id, plan, trial)
- `attendants` — Agentes de IA (name, class, model, channels, instructions, persona, temperature)
- `conversations` — Conversas (contact_name, status, channel)
- `messages` — Mensagens individuais
- `whatsapp_instances` — Instancias WhatsApp (qr_code, profile_pic_url)
- `knowledge_base` — Chunks RAG (source_type, content, search_vector com tsvector pt)

RLS (Row-Level Security) habilitado em todas as tabelas. Usuarios so acessam dados do proprio tenant.

### Roteamento

**Publicas:** `/`, `/login`, `/signup`, `/onboarding`, `/contact`, `/privacidade`, `/termos`

**Protegidas (ClientLayout):** `/dashboard`, `/conversations`, `/conversations/:id`, `/agents`, `/agents/detail`, `/attendant/config`, `/attendant/playground`, `/channels`, `/reports`, `/integrations`, `/account`

**Admin (AdminLayout + requireAdmin):** `/admin/dashboard`, `/admin/tenants`, `/admin/attendants`, `/admin/consumption`, `/admin/integrations`

### Multi-Tenancy

- Cada usuario pertence a um tenant (organizacao)
- Tenant possui attendants, conversations, knowledge_base
- RLS garante isolamento de dados
- Planos: "starter" (R$97), "professional" (R$497), "business" (R$997), "enterprise" (R$997+), "trial"
- Cobranca por conversa (nao por mensagem): 100/900/1.800/custom (Scale)

## Origem e Evolucao do Projeto

O MVP foi construido na plataforma Lovable (Lovable Cloud + Lovable AI) em uma sessao intensiva. Documentos de referencia originais estao em `docs/` (git-ignored):
- `docs/plano-inicial-lovablemd` — Sprint 1: fundacao visual, auth, dashboard, conversas
- `docs/historico-lovable.md` — Log cronologico de todas as decisoes e sprints no Lovable

### Jornada do Cliente (Fluxo Completo — Revisado)

1. **Signup** (`/signup`) — Cria conta; trigger auto-cria profile + tenant (trial) + attendant padrao
2. **Verificacao WhatsApp** (`/verify-phone`) — OTP 6 digitos enviado via Evolution API. 3 tentativas, 5min expiracao. Obrigatorio antes do onboarding.
3. **Onboarding conversacional** (`/onboarding`) — IA guia o cliente em conversa natural:
   - Perguntas organicas sobre negocio, servicos, tom de voz
   - Formulario inline de redes sociais (IG, LinkedIn, Facebook, TikTok, YouTube, site)
   - **Web scraping via Apify** dos links fornecidos (timer no front, background no back)
   - Tela de confirmacao: fotos de perfil, thumbnails YT, dados extraidos — usuario confirma/corrige
   - Escolha de template de agente (Vendas, Suporte, etc.) — sistema sugere com base no perfil
   - **Selecao automatica de modelo de IA** pelo sistema (usuario pode sobrescrever)
   - Upload de documentos da empresa (manual, cardapio, catalogo → knowledge base)
   - Suporta audio (AssemblyAI) e upload de docs (PDF, DOC, XLS, CSV, TXT)
   - QR Code WhatsApp no final (se sem celular: pula, destaque no dashboard depois)
3. **Dashboard** — Tutorial guiado dinamico (blur no fundo, destaque nas secoes)
4. **Configuracao do atendente** (`/attendant/config`) — Refinar nome, persona, instrucoes, modelo, canais
5. **Playground** (`/attendant/playground`) — Chat com IA real via OpenRouter
6. **Operacao** — Conversas reais via WhatsApp (Evolution API); agentes sao **reativos apenas**, **texto apenas no MVP** (audio/imagem so se sobrar tempo)

### Dados Seed

O banco possui 6 tenants realistas de setores distintos (saude, imobiliario, food/delivery, fitness, juridico) com atendentes configurados, ~43 conversas e ~172 mensagens para demonstracao.

### Integracao WhatsApp (Evolution API)

- **Evolution API v2.3.6** (`evoapicloud/evolution-api:v2.3.6`) hospedada em Droplet DigitalOcean (nyc3, 2vCPU/4GB)
- **IP:** `165.227.109.64:8080` | Stack: Docker Compose (Evolution API + PostgreSQL 15 + Redis 7)
- **Historico:** v2.2.3 (QR quebrado) → v1.8.7 (funcional, sem LID) → v2.3.6 (funcional, com LID)
- Edge functions: `evolution-api` v16 (gateway), `whatsapp-webhook` v18 (mensagens + LID + tags + takeover)
- **Resolucao LID:** v2.3.6 envia `remoteJidAlt` com numero real; webhook resolve automaticamente e atualiza `contact_phone`
- **Status inteligente:** IA usa tags `[ESCALATE]` e `[RESOLVED]` no final da resposta; webhook parseia, limpa e atualiza status da conversa
- **Human takeover:** Quando escalado, agente para de responder; operador pode enviar mensagens pelo dashboard
- **Payload v2.3.6:** `sendText` usa `{ number, text }` (simples); webhook/set usa `{ webhook: { enabled, url, byEvents, base64, events } }`
- Canvas no Slack `#the-agent` com dados de acesso completos
- Plano de escalabilidade em `docs/plano-escalabilidade.md`

### Modelos de IA e OpenRouter

- **OpenRouter** como gateway unico para todos os modelos LLM
- Billing unificado com dados de consumo por request (alimenta secao de consumo no admin)
- Edge function `chat` sera refatorada para chamar OpenRouter
- **Selecao automatica de modelo:** sistema analisa negocio no onboarding e recomenda; usuario pode sobrescrever
- A lista de modelos nao e restrita — deve incluir todas as opcoes viaveis do OpenRouter, considerando:
  - Versoes mais recentes e anteriores de cada familia
  - Custo-beneficio por caso de uso
  - Humanizacao, velocidade, multimodalidade, raciocinio numerico

**Modelos disponiveis para agentes (apenas Claude e GPT):**

| Modelo | Custo | Velocidade | Forca |
|---|---|---|---|
| `anthropic/claude-sonnet-4-6` | Medio | Media | Humanizacao, empatia, instrucoes complexas |
| `anthropic/claude-haiku-4-5` | Baixo | Rapida | Humanizacao + velocidade |
| `openai/gpt-4.1` | Medio | Media | Versatilidade, dados estruturados |
| `openai/gpt-4.1-mini` | Baixo | Rapida | Custo-beneficio, volume |

**Gemini e usado APENAS internamente** (onboarding-chat, recommend-model decisor). Nunca como modelo do agente do cliente.

Cada modelo tem trade-offs de custo, velocidade e qualidade. A logica de recomendacao considera setor e classe do agente.

### Arquitetura de Prompts — DEFINIDA

**4 camadas logicas compostas em 1 system prompt:**

1. **Identidade + Seguranca** (fixo) — nome, regras inviolaveis, formatacao WhatsApp, anti-alucinacao
2. **Template de especialidade** (da tabela `agent_templates`) — tecnicas de vendas/suporte/agendamento
3. **Personalizacao do negocio** (do onboarding + config) — instrucoes, persona, tom
4. **Contexto dinamico** (injetado em runtime) — knowledge base RAG + memoria + hora do dia

**Humanizacao PT-BR:** Mensagens curtas (1-3 frases), contracoes ("pra", "ta", "ne"), saudacao por horario, emojis moderados. Delimitador `[BREAK]` para message splitting. Typing delay proporcional. Message debounce de 3s para rajadas.

**Anti-alucinacao:** Instrucao explicita + exemplos negativos + resposta padrao "Vou verificar com a equipe". Temperature 0.3-0.5 (fatico) / 0.6-0.7 (vendas).

Ver pesquisa completa em `docs/pesquisa-prompts.md`.

### Memoria do Agente (Add-on Premium)

Os agentes devem manter **persistencia de contexto** entre conversas com o mesmo contato. Mesmo em conversas longas ou retomadas dias depois, o agente deve lembrar do historico e preferencias do cliente.

**Modelo de negocio:** Add-on pago — quem assina pode pagar a mais para habilitar memoria persistente nos agentes.

**Implementacao tecnica (a definir):**
- Tabela `agent_memories` — key-value por contato (contact_phone + attendant_id)
- O agente gera um resumo estruturado ao final de cada conversa (nome, preferencias, ultima compra, problemas anteriores)
- Na proxima conversa, o resumo e injetado no prompt como contexto
- Limite de tokens de memoria por plano (starter: sem memoria, premium: 2k tokens, enterprise: 8k tokens)
- Limpeza/expiracao configuravel pelo tenant

**Tabela planejada:**
```sql
agent_memories (
  id, attendant_id, contact_phone, summary TEXT, 
  key_facts JSONB, last_interaction_at, token_count INT
)
```

### Restricoes MVP

- **Canal:** Apenas WhatsApp (Evolution API, API nao-oficial). Instagram e Webchat no backlog.
- **Agentes:** Reativos apenas — nunca iniciam conversa (exceto follow-up se implementado)
- **Capacidade:** Texto apenas
- **Takeover:** Humano pode assumir conversa (DONE — funcional)
- **Multi-usuario:** Preparar schema, nao implementar no MVP
- **Memoria do agente:** Ultimo item do MVP, add-on pago (R$67/mes)
- **Pagamento Stripe:** MUST para MVP — seguranca maxima, zero hardcoded, server-side only

### Tabelas Existentes (Implementadas)

- `agent_templates` — Templates Vendas e Suporte (DONE)
- `scraping_results` — Resultados do Apify (DONE)
- `system_config` — Config global (DONE)
- `phone_verifications` — OTP WhatsApp (DONE)
- `profiles.phone_verified` — Flag de verificacao (DONE)
- `plans` — Planos centralizados (DONE): starter, professional, business, enterprise. Limites (max_agents, max_conversations, max_docs, max_mb, max_wp_numbers) + features JSONB (memory, channels, reports, support, skill_tiers, dashboard_realtime, etc.)
- `contact_rules` — Whitelist/blacklist de contatos (DONE schema, integracão pendente)

### Tabelas Planejadas (Fase Pagamento — pos-MVP)

- `subscriptions` — subscription_id, stripe_customer_id, plan, status, period
- `addon_subscriptions` — tenant_id, skill_id, stripe_subscription_item_id
- `audit_logs` — Registro de mudancas de plano/assinatura
- `agent_memories` — Memoria persistente por contato (proximo item MVP)

### Tiers de Skills por Plano

| Tier | Plano | Skills |
|------|-------|--------|
| Base | Essencial | auto-reply, faq, escalation, greeting |
| Avancado | Profissional | + lead-capture, sentiment, follow-up |
| Premium | Empresarial/Enterprise | + multi-language, memory (quando implementada) |

## Decisoes Tecnicas (ADRs)

1. **Supabase novo do zero** — Projeto Lovable Cloud descartado. Novo projeto Supabase sera criado manualmente com schema limpo. MCP Supabase conectado e funcional (org: `ndvljaczjesphgrrnwfe`).
2. **Auto-confirm email** — Habilitado para eliminar fricao no signup durante fase de MVP/demo.
3. **Trigger `handle_new_user`** — Auto-cria profile + role client + tenant trial + attendant padrao.
4. **Onboarding conversacional** — Chat com IA ao inves de formularios tradicionais.
5. **Edge Functions Deno** — Nativas do Supabase, sem servidor separado.
6. **AssemblyAI para transcricao** — Audio no onboarding (e futuramente no agente se houver tempo).
7. **Paleta visual "cosmos"** — Design system com gradientes premium; dark/cockpit (admin), light/clean (cliente).
8. **Evolution API v2.3.6 em Droplet DigitalOcean** — IP 165.227.109.64, porta 8080, PostgreSQL 15 + Redis 7. Imagem `evoapicloud/evolution-api:v2.3.6`. Migrada de v1.8.7 (MongoDB) em 2026-04-01 para resolver problema de LID.
9. **OpenRouter como gateway LLM** — Endpoint unico para todos os modelos, billing unificado.
10. **Apify para web scraping** — Substitui edge function generica `scrape-urls`; Actors especificos por plataforma (IG, FB, LinkedIn, TikTok, YT, Site).
11. **DigitalOcean App Platform para testes** — Ambiente acessivel por outras pessoas para validacao; producao em Droplet.
12. **Agentes texto-only no MVP** — Audio/imagem sao nice-to-have, nao bloqueiam lancamento.
13. **Desenvolvimento com Antigravity** — Gemini 3.1 Pro High como dev junior; Claude Code como dev senior/orquestrador. Ver secao "Workflow de Desenvolvimento com Antigravity" acima.
14. **Lista aberta de modelos LLM** — Nao restrita a 3 familias; incluir todas as opcoes viaveis do OpenRouter (versoes anteriores, modelos menores, etc.).
15. **Memoria do agente como add-on premium** — Persistencia de contexto entre conversas. Tabela `agent_memories` com resumo por contato. Monetizado como add-on por plano. Considerar vector database para busca semantica de memorias (pos-MVP).
16. **Modelo unico por agente no MVP** — Cada agente usa 1 modelo (selecionado automaticamente ou pelo usuario). Sem cascata multi-modelo (latencia inaceitavel para WhatsApp). Roteamento condicional e evolucao pos-MVP (classifier barato → modelo especializado por tipo de mensagem).
17. **WhatsApp: dual-provider (Evolution API + Cloud API oficial)** — MVP usa Evolution API (Baileys, nao-oficial, gratis). Pos-MVP, migrar para WhatsApp Business Cloud API (oficial Meta) como opcao premium. Manter ambos como providers selecionaveis por tenant/instancia. Abstracoes: par de edge functions por provider + campo `provider` em `whatsapp_instances`.
18. **Evolution API v2.3.6 com resolucao LID** — Migrada de v1.8.7 (MongoDB, sem LID) para v2.3.6 (PostgreSQL, com LID). Imagem Docker `evoapicloud/evolution-api` (nao `atendai`). Droplet anterior destruido. v2.3.7 evitada por bug em botoes/listas interativas (Issue #2390).
19. **Status inteligente via tags no prompt** — IA usa `[ESCALATE]` e `[RESOLVED]` no final da resposta. Webhook parseia, remove tags antes de salvar/enviar, e atualiza status da conversa automaticamente. Conversas escaladas nao recebem resposta da IA.
20. **Templates MVP limitados a Vendas e Suporte** — Templates Agendamento, Educacional e Recepcao removidos do banco. Onboarding usa `AgentClassSelector` com visual de cards com skills.
21. **Verificacao WhatsApp via OTP** — Edge functions `send-otp` e `verify-otp`. Instancia `otp-verification` na Evolution API. Tabela `phone_verifications` com 3 tentativas e 5min expiracao. Guard no onboarding redireciona se nao verificou.
22. **Tutorial guiado do dashboard** — 7 steps com spotlight SVG mask, Framer Motion, botoes Anterior/Proximo/Pular. localStorage flag `theagent_guided_tour_completed`. `data-tour` attributes em KPIs, graficos, agentes, conversas.
23. **Modelos de agente limitados a Claude e GPT** — Gemini removido das recomendacoes de agente. Usado apenas internamente como decisor (onboarding-chat, recommend-model). Default mudou de Gemini Flash para GPT-4.1 Mini.
24. **Knowledge base limites revisados** — Starter: 10 docs/10MB (era 5/5). Professional: 50/100MB. Business: 200/500MB. Enterprise: ilimitado/2GB.
25. **Cobranca por conversa, nao por mensagem** — 100 (Essencial), 900 (Profissional), 1.800 (Empresarial), custom (Scale — definido caso a caso). Uma conversa = todo o atendimento com 1 contato.
26. **Skills backlog marcados "Em breve"** — Agendamento, Analytics, Email, Acoes Custom com badge `comingSoon` no frontend. Ativacao/desativacao funcional no banco para skills implementados.
27. **Filtro de Contatos (Whitelist/Blacklist) no MVP** — Tabela relacional `contact_rules` (nao JSONB, 3x mais rapido para exact match). Funcao SQL `should_respond_to_contact` STABLE para cache. Tres modos: `open` (blacklist), `closed` (whitelist), `whitelist_only` (lead capture). Numeros normalizados para E.164. Pesquisa completa em `docs/Implementacao de Modo Assistente Pessoal...md`. Plano detalhado em `docs/plano-filtro-contatos.md`.
28. **Assistente Pessoal (Self-Chat) pos-MVP** — Viavel via Baileys (`fromMe` + deduplicacao por message ID), mas complexo: exige tabela `processed_messages`, cleanup cron, e UX dedicada. Risco de loop infinito mitigavel mas nao trivial. Reservado para pos-MVP.
29. **Pipeline RAG com tsvector (substituiu brute-force)** — Retrieval via funcao SQL `search_knowledge()` com `websearch_to_tsquery + ts_rank + source_priority`. Fallback para chunks recentes de alta prioridade. Coluna `source_priority` (document=100, manual=90, website=70, social=10) + `is_archived`. Curadoria do scraper filtra posts de baixo valor. Chunking semantico com overlap 150 chars, tabelas preservadas ate 2000 chars. Progresso em `docs/progresso-rag-mvp.md`.
30. **Grounding check via Haiku** — Apos resposta do modelo principal, regex detecta mencoes a preco/plano/valor. Se detecta, Haiku verifica se a resposta esta suportada pelos chunks de KB. Se "FALHA", substitui por mensagem segura. Non-fatal: se o check der erro, envia resposta original. Custo ~0.1-0.3 centavos por verificacao.
31. **Extracao de PDF client-side** — `pdfjs-dist` no browser extrai texto pagina por pagina. Edge function `process-knowledge` rejeita referencias de arquivo (bug antigo). DOC/DOCX/XLS/XLSX pendente (pede conversao por enquanto).
32. **Skills condicionais no prompt** — [ESCALATE], saudacao personalizada e nome do contato so sao injetados no prompt quando a skill correspondente esta ativa. [RESOLVED] permanece sempre ativo. Corrigiu bug onde skills desativadas continuavam funcionando porque as instrucoes estavam hardcoded na Layer 1.
33. **Vinculo numero-agente** — Coluna `attendant_id` em `whatsapp_instances`. Frontend mostra qual agente usa cada numero. Validacao: nao pode ter mais numeros que agentes. Auto-assign ao criar.
34. **Trigger cleanup on user delete** — Minimo: deleta tenant (CASCADE cuida do resto via FKs), roles e profile. Captura phone antes de deletar profile para limpar phone_verifications. NAO fazer trigger inchado com DELETE manual tabela-por-tabela.

## Proximos Passos (Cronograma MVP)

Ver cronograma detalhado em `docs/cronograma-mvp.md`.

### DONE (Dia 3)
- [x] Verificacao WhatsApp OTP (send-otp, verify-otp, pagina, guard, instancia)
- [x] Tutorial guiado dashboard (7 steps, spotlight, navegacao)
- [x] Modelos de agente: apenas Claude e GPT (Gemini removido de recomendacoes)
- [x] Knowledge base limites revisados (5→10 Starter, etc.)
- [x] Landing page atualizada (conversas, docs, agentes por plano)
- [x] Skills backlog marcados "Em breve" no frontend
- [x] Analise completa do sistema (`docs/analise-sistema-completa.md`)

### DONE (Dia 4 — Skills)
- [x] Utility `buildSkillInstructions` com testes (src/lib/skills.ts)
- [x] Utility `parseAiTags` / `cleanAiResponse` com testes (src/lib/tag-parser.ts)
- [x] Utility `findFaqMatch` com testes (src/lib/faq-matcher.ts)
- [x] Skill Multilingue — prompt injection em whatsapp-webhook e chat
- [x] Skill FAQ — tabela `agent_faqs`, CRUD component, matcher keyword-based
- [x] Skill Analise de Sentimento — tag [SENTIMENT:], parsing, metadata em messages
- [x] Skill Captura de Leads — tag [LEAD:], tabela `agent_leads`, panel UI, upsert no webhook
- [x] Skill Follow-up — passivo via prompt (ativo/cron → backlog)
- [x] Skills adicionadas a edge function chat (Playground)
- [x] 7 skills com instrucoes no skillMap (greeting, escalation, lead-capture, sentiment, follow-up, multi-language, faq)
- [x] 152 testes passando

### DONE (Dia 4 — Tutorial por Aba)
- [x] Refatorar GuidedTour para aceitar steps/tourKey como props
- [x] Criar tour-steps.tsx com definicoes para 9 paginas (26 steps total)
- [x] Adicionar data-tour attributes e montar tours em todas as paginas
- [x] Tours: Dashboard(7), Conversas(4), ConvDetail(3), Agentes(3), AgentDetail(3), Playground(2), Canais(2), Relatorios(3), Integracoes(3), Conta(3)
- [x] 158 testes passando

### TODO (Ordem de Execucao)
1. **Pipeline RAG (Excelencia em Respostas)** — DONE (Sprint 1 + grounding). Progresso em `docs/progresso-rag-mvp.md`. Pendente: suporte DOC/DOCX/XLS/XLSX, integracao observabilidade.
2. **Suporte DOC/DOCX/XLS/XLSX** — Adicionar mammoth.js (DOCX) e SheetJS (XLSX) no frontend para extracao client-side. Hoje aceita no input mas pede conversao.
3. **Memoria do agente** — Tabela `agent_memories`, sumarizacao automatica ao final de conversas, injecao no prompt, TTL configuravel. Aba "Memoria" no AgentDetail ja existe (placeholder). Prompt de pesquisa em `docs/prompt-pesquisa-memoria-agente.md`.
4. **Filtro de Contatos (Whitelist/Blacklist)** — Tabela `contact_rules`, funcao SQL `should_respond_to_contact`, integracao webhook, UI de configuracao. Detalhes em `docs/plano-filtro-contatos.md`
5. **Audit de seguranca completa** — Pesquisa + pentest + correcoes (prompt Perplexity em `docs/cronograma-mvp.md`)

## Backlog (Pos-MVP — "Coming Soon" no Frontend)

### Skills
- [ ] Agendamento Inteligente (Google Calendar)
- [ ] Analytics Avancado (dashboards custom)
- [ ] Integracao Email (SMTP/SendGrid)
- [ ] Acoes Customizadas (webhooks user-defined)

### Canais
- [ ] Instagram DM (chat do agente)
- [ ] Webchat embeddable
- [ ] WhatsApp Business Cloud API (oficial Meta)
- [ ] Abstracoes de canal (interface unica send/receive)

### Pagamento
- [ ] **Pagamento Stripe** — Tabelas (subscriptions, addon_subscriptions, plans, audit_logs), webhooks, checkout, portal, validacao server-side, seguranca. Ate la, planos sao liberados manualmente via banco de dados.

### Funcionalidades
- [ ] Relatorios com dados reais (8 templates ja definidos)
- [ ] Todas as integracoes do marketplace
- [ ] Previews de redes sociais no onboarding
- [ ] Envio de imagens/audio pelo agente
- [ ] Schema multi-usuario por tenant (`tenant_members`)
- [ ] **Modo Assistente Pessoal (Self-Chat)** — Agente responde no proprio numero do usuario. Requer: tabela `processed_messages` para deduplicacao, logica especial no webhook para nao skipar `fromMe` em self-chat, cleanup cron diario, toggle no dashboard. Prevencao de loop via message ID + fromMe + rate limiting. Pesquisa: `docs/Implementacao de Modo Assistente Pessoal...md` secao 1.
- [ ] **Filtro de Contatos avancado** — Suporte a LID (`lid` column em `contact_rules`), modo "Aprendizado" (agente pergunta se e cliente ou pessoal), import CSV, cache Redis para regras frequentes, quick actions (bloquear/permitir) na lista de conversas, export de lista, metricas de filtragem.
- [ ] **Sync Google Contacts** — Importar contatos do Google para popular whitelist/blacklist automaticamente.
- [ ] **Versionamento de configuracao dos agentes** — Historico de alteracoes em instrucoes, persona, skills, modelo. Rollback para versao anterior. Diff visual entre versoes.
- [ ] **Acesso admin ao tenant do cliente** — No painel admin, clicar no nome do cliente para acessar o dashboard/agentes dele. Envia notificacao ao cliente pedindo permissao. So permite acesso e edicao se o cliente aprovar. Sessao de acesso temporaria com log de auditoria (quem acessou, quando, o que alterou).

### Infraestrutura
- [ ] CI/CD pipeline (GitHub Actions → DigitalOcean)
- [ ] Monitoramento (Sentry, logs)
- [ ] Supabase Realtime (substituir polling)
- [ ] Busca hibrida tsvector + pgvector (ou banco vetorial dedicado) para RAG semantico
- [ ] Roteamento condicional multi-modelo
- [ ] n8n para automacoes

## Recursos Externos

| Recurso | Onde encontrar |
|---|---|
| Credenciais Evolution API (IP, API Key, PostgreSQL, Redis) | Canvas "Evolution API v2.3.6" no Slack `#the-agent` |
| Plano de escalabilidade de infraestrutura | `docs/plano-escalabilidade.md` |
| Pesquisa problema LID | `docs/problema-lid-whatsapp.md` + `docs/LID (@lid) no Baileys...md` |
| Pesquisa migracao Evolution v2.3.x | `docs/pesquisa-migracao-evolution-v2.3.md` |
| Pesquisa de prompt engineering | `docs/pesquisa-prompts.md` |
| Plano de arquitetura v2 e cronograma | `docs/plano-arquitetura-v2.md` |
| Anotacoes da reuniao de planejamento | `docs/Projeto novo.txt` |
| Plano inicial (Sprint 1 Lovable) | `docs/plano-inicial-lovablemd` |
| Historico completo de decisoes (Lovable) | `docs/historico-lovable.md` |
| Workspace Slack (Meteora Digital) | `meteoradigital-io.slack.com` |
| Analise completa do sistema (dia 3) | `docs/analise-sistema-completa.md` |
| Cronograma MVP detalhado | `docs/cronograma-mvp.md` |

## Licoes Aprendidas

1. **TDD nao foi seguido no sprint inicial.** Codigo de producao foi escrito sem testes. A partir de agora, NENHUM codigo de producao deve ser escrito antes dos testes correspondentes. Ao receber uma feature: (1) criar testes primeiro, (2) rodar e ver falhar, (3) so entao implementar. Isso vale para componentes React (Testing Library), edge functions (mocks), e logica de negocio.
2. **Documentacao de API nao confiavel.** A referencia da Evolution API v1.8.x estava errada em varios pontos (sendText payload, webhook format). Sempre testar endpoints via curl antes de implementar. Validar contra a API real, nao contra docs.
3. **LID e uma limitacao real do WhatsApp nao-oficial.** ~30-50% dos contatos podem vir como LID. A v2.3.6 resolve via `remoteJidAlt` mas nem sempre. Migrar pra Cloud API oficial e o unico caminho 100% confiavel.
4. **Deploy via MCP > CLI.** O Supabase CLI falha com paths contendo caracteres especiais ("Area de trabalho"). Usar MCP deploy ou API direta. Verificar conteudo deployado (transcrição manual pode introduzir bugs como `{ number, text }` vs `{ number: phone, text }`).
5. **QR Code WhatsApp expira silenciosamente.** O QR code da Evolution API expira em ~30-45 segundos. Sem timer visual e feedback de expiracao, o usuario nao sabe que precisa gerar outro. Sempre exibir countdown e botao de refresh. Alem disso, status "connecting" pode ficar travado indefinidamente se o usuario sair da pagina — implementar auto-expiracao (2min) no polling do frontend e sincronizar com o status real da Evolution API.
6. **Race condition no redirect entre paginas com guards assincronos.** O guard do Onboarding fazia `SELECT phone_verified` e redirecionava para `/verify-phone` antes do UPDATE do `verify-otp` propagar. O componente VerifyPhone remontava com refs resetadas e reenviava OTP. Solucao: (1) VerifyPhone checa `phone_verified` antes de enviar OTP — se ja verificado, redireciona sem reenviar; (2) Onboarding guard faz retry com delay (2x, 1s cada) antes de redirecionar. Regra geral: quando um guard async em pagina B depende de um UPDATE feito em pagina A, adicionar retry com delay ou otimistic state para evitar redirect loop.
7. **useRef nao sobrevive a remontagem de componente.** `sendingOtp.current = true` evita double-fire dentro da mesma montagem, mas quando o componente desmonta (navigate) e remonta (redirect de volta), o ref reseta para `false`. Guards baseados em ref NAO protegem contra redirect loops. Usar verificacao server-side (query ao banco) como guard definitivo.
8. **Preferir ON DELETE CASCADE a triggers de limpeza.** Nunca criar triggers com DELETE manual tabela-por-tabela para simular cascata. Usar FK com ON DELETE CASCADE e deixar o PostgreSQL gerenciar. Triggers so devem existir para o elo que nao aceita FK (ex: `auth.users` → `tenants`, porque o schema auth e externo). Mesmo nesses casos, o trigger deve ser minimo (deletar apenas a tabela raiz e confiar no CASCADE para o resto). Triggers inchados sao frageis, esquecem tabelas novas, e podem ter bugs de ordem de operacao.
9. **RLS de admin nao substitui filtro explicito no frontend.** Policies que dao acesso total a admins (ex: `is_admin() → SELECT *`) criam brecha: qualquer pagina do cliente logado como admin ve dados de TODOS os tenants. Filtrar no frontend resolve a UX, mas NAO resolve a seguranca — um atacante com o JWT do admin pode fazer queries diretas pela API do Supabase e acessar dados de todos os tenants. Solucao correta: RLS com escopo contextual (ex: `current_setting('app.current_tenant')`) ou operacoes admin via edge functions com service_role (nunca expondo a permissao diretamente no client). Documentar e corrigir no audit de seguranca.
10. **Brute-force de knowledge base causa alucinacao.** Jogar 30 chunks mais recentes no prompt sem filtragem por relevancia faz o modelo inventar dados, misturar precos de fontes diferentes, e criar planos inexistentes. O caso Zum Fibra provou: agente inventou "plano 700 Mega por R$96" e errou precos de planos reais. Solucao: retrieval por relevancia (tsvector MVP, pgvector pos-MVP) + prioridade de fontes (documento > site > social) + temperature baixa (0.2) + grounding check.
11. **Extrai conteudo no client, nao no server.** Edge Functions Deno nao suportam libs pesadas de parsing (pdf-parse, mammoth). A extracao de texto de PDFs deve ser feita no browser (pdfjs-dist) e o texto ja extraido enviado ao backend. O backend so faz chunking e armazenamento.
12. **Tabelas de precos devem ser um chunk so.** Chunking que separa nome do plano do preco causa alucinacao (modelo associa plano X com preco de Y). Preservar tabelas inteiras como chunk unico mesmo que exceda o tamanho padrao (ate 2000 chars). Detectar por heuristica: linhas com R$, numeros, alinhamento.
13. **Posts de redes sociais poluem o contexto.** Memes, trends e campanhas antigas competem com documentos oficiais no prompt. Filtrar na ingestao (ratio de texto util < 30% → descartar) e dar source_priority baixo (10) para o que passar.
