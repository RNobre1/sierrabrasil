

## Plataforma de Atendentes Inteligentes — Meteora Digital
### Sprint 1: Fundação + Auth + Dashboard + Conversas

---

### 1. Design System (Fundação Visual)

**Fontes:** Outfit (display/KPIs), DM Sans (body), JetBrains Mono (dados técnicos) via Google Fonts.

**Tokens CSS:** Implementar todas as variáveis do systemDesign.md:
- Paleta do Cliente (light mode): superfícies (#FAFAFA, #FFFFFF), textos (#18181B, #52525B), acento azul Meteora (#1A93FE), semânticas (success, warning, danger)
- Paleta Admin (dark mode): superfícies (#161618, #383739), textos (#DADADA, #ACACAC)
- Espaçamento (base 4px), border-radius (mínimo 6px), sombras, escala tipográfica

**Tailwind config:** Estender com todas as cores customizadas, fontes, e tokens do design system.

---

### 2. Estrutura de Rotas

```
/login                    → Página de login
/signup                   → Página de cadastro
/dashboard                → Dashboard do cliente
/conversations            → Lista de conversas
/conversations/:id        → Detalhe da conversa
/attendant/config          → Configuração do atendente
/attendant/playground      → Playground de teste
/reports                  → Relatórios
/account                  → Minha conta
/admin/dashboard           → Dashboard admin Meteora
/admin/tenants             → Gestão de tenants
/admin/attendants          → Gestão de atendentes
/admin/consumption         → Consumo de IA
```

---

### 3. Autenticação (Lovable Cloud)

- Login com email + senha
- Proteção de rotas (redirecionar para /login se não autenticado)
- Separação de rotas admin vs cliente
- Tabela `profiles` com dados do usuário
- Tabela `user_roles` para roles (admin, client) — seguindo as melhores práticas de segurança

---

### 4. Layouts

**Layout Cliente (Light Mode):**
- Sidebar 220px fixa no desktop (branca, borda sutil)
- 5 itens de navegação: Início, Conversas, Atendente, Relatórios, Minha Conta
- Item ativo com fundo azul sutil + texto azul Meteora
- Bottom navigation no mobile (< 768px) com 5 ícones
- Content area com max-width 1200px, fundo #FAFAFA

**Layout Admin (Dark Mode):**
- Sidebar dark mode com cores MCC Design System
- Itens: Dashboard, Clientes, Atendentes, Consumo IA, Financeiro, Configurações
- Estilo cockpit/mission control

---

### 5. Dashboard do Cliente

**KPI Cards** (4 cards no topo):
- Conversas hoje
- Vendas realizadas
- Agendamentos
- Satisfação média
- Cada card com valor grande (Outfit light 40px), label, e delta (variação %)

**Card Hero do Atendente:**
- Status dot com animação pulse (🟢 Online)
- Nome do atendente + canais ativos
- Botões: Testar, Pausar, Configurar, Ver conversas

**Insights do Explorer** (seção inferior):
- Cards com insights mockados e botão "Aceitar"

**Últimas Conversas:**
- Lista das conversas mais recentes com nome, ação e horário

---

### 6. Tela de Conversas

**Lista de conversas:**
- Filtros por status (ativa, resolvida, escalada)
- Busca por nome/telefone
- Card de cada conversa: nome do contato, última mensagem, status badge, timestamp
- Responsivo: cards empilhados no mobile

**Detalhe da conversa:**
- Chat view com mensagens do contato e do atendente
- Bolhas de chat estilizadas (contato à esquerda, atendente à direita)
- Metadata: canal, duração, ações executadas

---

### 7. Dashboard Admin (básico)

- KPIs globais: MRR, clientes ativos, agentes rodando, consumo IA
- Lista de tenants recentes
- Estilo dark mode com dados densos

---

### 8. Database (Lovable Cloud)

Tabelas iniciais com RLS:
- `profiles` (vinculada a auth.users)
- `user_roles` (admin, client)
- `tenants` (empresa do cliente, plano, status)
- `attendants` (atendente IA, nome, status, config)
- `conversations` (conversas com contatos)
- `messages` (mensagens de cada conversa)

Todas com RLS habilitado e policies de tenant isolation.

---

### Dados Mockados Iniciais

Para a demonstração funcionar sem integrações externas (WhatsApp, Stripe), o dashboard e conversas usarão dados seed no banco para visualização.

