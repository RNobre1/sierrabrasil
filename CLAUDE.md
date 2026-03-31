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
- Planos: "starter", "enterprise" com trial timer

## Origem e Evolucao do Projeto

O MVP foi construido na plataforma Lovable (Lovable Cloud + Lovable AI) em uma sessao intensiva. Documentos de referencia originais estao em `docs/` (git-ignored):
- `docs/plano-inicial-lovablemd` — Sprint 1: fundacao visual, auth, dashboard, conversas
- `docs/historico-lovable.md` — Log cronologico de todas as decisoes e sprints no Lovable

### Jornada do Cliente (Fluxo Completo — Revisado)

1. **Signup** (`/signup`) — Cria conta; trigger auto-cria profile + tenant (trial) + attendant padrao
2. **Onboarding conversacional** (`/onboarding`) — IA guia o cliente em conversa natural:
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

- **Evolution API v2.2.3** como bridge para WhatsApp, hospedada em Droplet DigitalOcean (nyc3, 2vCPU/4GB)
- Stack: Docker Compose (Evolution API + PostgreSQL 16 + Redis 7) em `/opt/evolution-api/`
- Dados de acesso completos em `docs/srcdoc.pdf` e canvas no Slack (#devs-geral)
- Edge functions: `evolution-api` (conexao/gerenciamento), `whatsapp-webhook` (mensagens + typing + [BREAK] splitting)
- Tabela `whatsapp_instances` armazena QR code e profile_pic_url
- Fluxo: conectar instancia → escanear QR → receber/enviar mensagens
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

**Modelos candidatos (lista aberta, expandir conforme necessario):**

| Familia | Modelos | Forca |
|---|---|---|
| Claude (Anthropic) | Opus 4.6, Sonnet 4.6, Haiku 4.5 | Humanizacao, nuance, instrucoes complexas |
| GPT (OpenAI) | GPT-5, GPT-5 Mini, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano | Versatilidade, dados estruturados, raciocinio |
| Gemini (Google) | 2.5 Pro, 2.5 Flash, 2.0 Flash | Velocidade, custo baixo, multimodal, contexto longo |
| Llama (Meta) | Llama 4 Scout, Llama 4 Maverick | Open-source, custo muito baixo |
| DeepSeek | DeepSeek-V3, DeepSeek-R1 | Raciocinio, codigo, custo baixo |
| Mistral | Mistral Large, Mistral Medium | Multilingual, europeu, bom em PT-BR |

Cada modelo tem trade-offs de custo, velocidade e qualidade. A logica de recomendacao deve considerar todos esses fatores.

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

- **Canal:** Apenas WhatsApp (Evolution API, API nao-oficial)
- **Agentes:** Reativos apenas — nunca iniciam conversa
- **Capacidade:** Texto apenas (audio/imagem so se sobrar tempo)
- **Takeover:** Humano pode assumir conversa (funcionalidade a investigar)
- **Multi-usuario:** Preparar schema, nao implementar no MVP
- **Memoria do agente:** Preparar schema, implementar como add-on pago pos-MVP

### Tabelas Novas (Planejadas)

- `agent_templates` — Templates pre-definidos (Vendas, Suporte, Agendamento)
- `scraping_results` — Resultados do Apify (status, raw_data, confirmed_data, profile_pic_url)
- `system_config` — Config global (prompt geral, modelo default)

### Alteracoes Planejadas em Tabelas Existentes

- `attendants`: + `template_id`, `recommended_model`, `model_selection_reason`
- `conversations`: + `is_human_takeover`, `takeover_by`, `takeover_at`

## Decisoes Tecnicas (ADRs)

1. **Supabase novo do zero** — Projeto Lovable Cloud descartado. Novo projeto Supabase sera criado manualmente com schema limpo. MCP Supabase conectado e funcional (org: `ndvljaczjesphgrrnwfe`).
2. **Auto-confirm email** — Habilitado para eliminar fricao no signup durante fase de MVP/demo.
3. **Trigger `handle_new_user`** — Auto-cria profile + role client + tenant trial + attendant padrao.
4. **Onboarding conversacional** — Chat com IA ao inves de formularios tradicionais.
5. **Edge Functions Deno** — Nativas do Supabase, sem servidor separado.
6. **AssemblyAI para transcricao** — Audio no onboarding (e futuramente no agente se houver tempo).
7. **Paleta visual "cosmos"** — Design system com gradientes premium; dark/cockpit (admin), light/clean (cliente).
8. **Evolution API em Droplet DigitalOcean** — WhatsApp na porta 8080, PostgreSQL + Redis locais.
9. **OpenRouter como gateway LLM** — Endpoint unico para todos os modelos, billing unificado.
10. **Apify para web scraping** — Substitui edge function generica `scrape-urls`; Actors especificos por plataforma (IG, FB, LinkedIn, TikTok, YT, Site).
11. **DigitalOcean App Platform para testes** — Ambiente acessivel por outras pessoas para validacao; producao em Droplet.
12. **Agentes texto-only no MVP** — Audio/imagem sao nice-to-have, nao bloqueiam lancamento.
13. **Desenvolvimento com Antigravity** — Gemini 3.1 Pro High como dev junior; Claude Code como dev senior/orquestrador. Ver secao "Workflow de Desenvolvimento com Antigravity" acima.
14. **Lista aberta de modelos LLM** — Nao restrita a 3 familias; incluir todas as opcoes viaveis do OpenRouter (versoes anteriores, modelos menores, etc.).
15. **Memoria do agente como add-on premium** — Persistencia de contexto entre conversas. Tabela `agent_memories` com resumo por contato. Monetizado como add-on por plano. Considerar vector database para busca semantica de memorias (pos-MVP).
16. **Modelo unico por agente no MVP** — Cada agente usa 1 modelo (selecionado automaticamente ou pelo usuario). Sem cascata multi-modelo (latencia inaceitavel para WhatsApp). Roteamento condicional e evolucao pos-MVP (classifier barato → modelo especializado por tipo de mensagem).
17. **WhatsApp: dual-provider (Evolution API + Cloud API oficial)** — MVP usa Evolution API (Baileys, nao-oficial, gratis). Pos-MVP, migrar para WhatsApp Business Cloud API (oficial Meta) como opcao premium. Manter ambos como providers selecionaveis por tenant/instancia. Abstracoes: par de edge functions por provider + campo `provider` em `whatsapp_instances`.

## Backlog (Pos-Sprint de 4 Dias)

- [ ] **Previews de redes sociais no onboarding** — Mostrar prints/screenshots das home pages das redes sociais (ja funciona parcial, melhorar)
- [ ] **Envio de imagens pelo agente** — Nova funcionalidade pra agentes enviarem fotos/catalogo via WhatsApp
- [ ] **Audit de seguranca da codebase Lovable** — .env exposto, secrets hardcoded, validacao de inputs, codigo morto
- [ ] Manter dados mockados/seed por enquanto (uteis para demo)
- [ ] Schema multi-usuario por tenant (`tenant_members`)
- [ ] Integracao Stripe/gateway de pagamento
- [ ] Canal Instagram
- [ ] Canal Web Chat embeddable
- [ ] n8n para automacoes (quando houver caso de uso claro)
- [ ] CI/CD pipeline (GitHub Actions → DigitalOcean)
- [ ] Monitoramento/observabilidade (Sentry, logs)
- [ ] Benchmark de tempo de scraping por plataforma
- [ ] Agente com audio (transcricao de mensagens de voz recebidas)
- [ ] Agente com imagem (processamento multimodal)
- [ ] Roteamento condicional multi-modelo (classifier + modelo especializado por intencao)
- [ ] Vector database (pgvector) para knowledge base e memoria semantica
- [ ] **Escalonamento WhatsApp: migrar para API oficial Meta** — Criar provider WhatsApp Business Cloud API (oficial) como alternativa ao Evolution API. Passos: (1) Abstrair camada de provider com interface comum (send, receive, connect, status). (2) Criar edge functions `whatsapp-cloud-api` e `whatsapp-cloud-webhook`. (3) Adicionar campo `provider` em `whatsapp_instances` ("evolution" | "cloud_api"). (4) Integrar com Meta Business Manager (verificacao de conta, templates de mensagem). (5) Repassar custo por conversa ao cliente no plano premium/enterprise. Beneficios: sem risco de ban, SLA oficial, sem droplet proprio, multi-numero nativo.
- [ ] **Abstracoes de canal** — Generalizar interface de messaging para suportar multiplos providers (Evolution, Cloud API, Instagram, Web Chat) com contrato unico de send/receive

## Recursos Externos

| Recurso | Onde encontrar |
|---|---|
| Credenciais Evolution API (IP, API Key, PostgreSQL, Redis) | `docs/srcdoc.pdf` + Canvas no Slack `#devs-geral` |
| Plano de escalabilidade de infraestrutura | `docs/plano-escalabilidade.md` |
| Referencia pratica da Evolution API | `docs/referencia-evolution-api.md` |
| Pesquisa de prompt engineering | `docs/pesquisa-prompts.md` |
| Plano de arquitetura v2 e cronograma | `docs/plano-arquitetura-v2.md` |
| Anotacoes da reuniao de planejamento | `docs/Projeto novo.txt` |
| Plano inicial (Sprint 1 Lovable) | `docs/plano-inicial-lovablemd` |
| Historico completo de decisoes (Lovable) | `docs/historico-lovable.md` |
| Workspace Slack (Meteora Digital) | `meteoradigital-io.slack.com` |

## Licoes Aprendidas

1. **TDD nao foi seguido no sprint inicial.** Codigo de producao foi escrito sem testes. A partir de agora, NENHUM codigo de producao deve ser escrito antes dos testes correspondentes. Ao receber uma feature: (1) criar testes primeiro, (2) rodar e ver falhar, (3) so entao implementar. Isso vale para componentes React (Testing Library), edge functions (mocks), e logica de negocio.
