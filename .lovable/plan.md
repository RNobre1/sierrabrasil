

# Plano de Evolução — Meteora Platform

## Visão Geral

Este plano cobre todas as solicitações organizadas em blocos de execução sequencial. A ideia central: transformar o dashboard do cliente numa experiência profissional com canais de conexão dedicados (WhatsApp/Instagram), sistema de agentes com classes, trial timer, upgrade gates, e fluxo de criação de novos agentes inteligente.

---

## Bloco 1 — Correções Rápidas e Visuais

1. **URLs lowercase** — No `SocialLinksSelector` e `BusinessOverview`, normalizar todas as URLs exibidas para lowercase (`.toLowerCase()` nos valores renderizados).

2. **Logo modo claro no ClientLayout** — Importar `meteora-preta.png` e usar condicionalmente. Como o projeto é dark-first, verificar se existe classe `dark` no root e alternar entre `meteora-branca.png` e `meteora-preta.png`.

3. **Menu "Agente" → "Agentes" (plural)** — No `ClientLayout`, renomear o label do nav item.

---

## Bloco 2 — Reestruturação do Menu Lateral do Cliente

Redesign completo do sidebar para ficar premium e profissional:

- Seções agrupadas com labels discretos: **"Principal"** (Início, Conversas), **"Agentes"** (link para listagem de agentes), **"Canais"** (Canais de Conexão), **"Análise"** (Relatórios)
- Estilo: items com border-radius sutil, hover com bg-accent/5, ícones de 16px, tipografia mais refinada
- Remover Playground do menu principal (mover para dentro da página do agente)
- Adicionar item **"Canais de Conexão"** com ícone de `Link2` ou `Radio`

Novas rotas:
- `/channels` → Página de Canais de Conexão (WhatsApp + Instagram tabs)
- `/agents` → Listagem de agentes do tenant
- `/agents/:id/config` → Configuração individual do agente

---

## Bloco 3 — Página de Canais de Conexão (`/channels`)

Nova página com **duas tabs elegantes**: WhatsApp e Instagram.

### Tab WhatsApp
Seções:
1. **Status da Conexão** — LED verde/vermelho, status da API, botão refresh manual, auto-refresh 5min. Campos: Phone Number ID, Business Account ID, API Token (mascarado).
2. **Templates de Mensagem** — Tabela com: nome do template, status (aprovado/pendente/rejeitado com badges coloridos), categoria, idioma, contadores (envios, entregas, leituras, % leitura).
3. **Criar Novo Template** — Form com nome, categoria, corpo da mensagem (com variáveis `{{1}}`), botão "Enviar para Aprovação".
4. **Excluir Template** — Botão com confirmação.
5. **Envio em Massa** — Seletor de template, campo de mensagem com variáveis `{nome}`, upload de planilha CSV/XLSX de leads, agendamento de envio (date/time picker), botão enviar.

### Tab Instagram
- Versão simplificada: status de conexão, configurações básicas, sem API oficial complexa.

### Upgrade Gates
- Envio em massa e templates avançados bloqueados com overlay: "Para usar essa função, faça upgrade do seu plano" + botão de upgrade.

---

## Bloco 4 — Sistema de Agentes com Classes

### Database Migration
```sql
-- Adicionar coluna 'class' na tabela attendants
ALTER TABLE public.attendants ADD COLUMN IF NOT EXISTS class text DEFAULT 'support';
```

### Classes de Agente
- **Atendimento / Suporte** — Skills: FAQ, resolução de problemas, escalonamento, coleta de feedback
- **Vendas / Acompanhamento** — Skills: qualificação de leads, follow-up, envio de propostas, fechamento

Cada classe gera um `.md` de system prompt com habilidades específicas que é injetado automaticamente.

### Página de Agentes (`/agents`)
- Header: "Seus Agentes" + contador (ex: "1 de 1 agente")
- Cards dos agentes com: nome, classe (badge), status (LED), canais, botão configurar
- Botão **"Criar Novo Agente"** — Se plano básico e já tem 1 agente: overlay "Faça upgrade para criar mais agentes"
- Ao clicar "Criar Novo Agente" (se permitido): abre fluxo de criação que começa perguntando a classe do agente, depois vai para o onboarding flow (sem boas-vindas, direto ao ponto, lendo as últimas 50 conversas para sugerir tipo de agente)

---

## Bloco 5 — Trial Timer no Dashboard

- Componente elegante no topo do dashboard ou sidebar
- Texto: "Seu período de testes termina em X dias, X horas"
- Contagem regressiva em tempo real
- Design: borda sutil, gradiente discreto, ícone de relógio
- Baseado no `created_at` do tenant + 7 dias
- Botão "Fazer Upgrade" ao lado

---

## Bloco 6 — Upgrade Gates Espalhados

Adicionar 2-3 CTAs de upgrade estratégicos:
1. No dashboard (banner lateral ou card)
2. Na página de canais (funcionalidades bloqueadas)
3. Na página de agentes (limite de agentes)

---

## Bloco 7 — Onboarding: Seleção de Classe do Agente

No fluxo de onboarding, **antes** de começar a conversa com a IA:
- Tela de seleção: "Qual tipo de agente você gostaria de criar?"
- Duas opções visuais elegantes: **Atendimento / Suporte** e **Vendas / Acompanhamento**
- A escolha determina as skills e o system prompt base do agente
- Isso fica salvo no campo `class` do attendant

### Fluxo "Criar Novo Agente" (cliente existente)
- Sem boas-vindas
- Edge function lê últimas 50 conversas do tenant
- IA sugere: "Com base nos seus atendimentos, que tal criar um agente de Vendas?"
- Depois segue o flow normal de configuração

---

## Bloco 8 — Remover Canais da Config do Agente

- Remover a seção "Canais" do `AttendantConfig.tsx`
- Canais agora são gerenciados exclusivamente na página `/channels`

---

## Arquivos Impactados

| Arquivo | Ação |
|---------|------|
| `src/components/layouts/ClientLayout.tsx` | Redesign menu, logo, novas rotas |
| `src/App.tsx` | Novas rotas `/channels`, `/agents`, `/agents/:id/config` |
| `src/pages/Channels.tsx` | **Novo** — Página de canais WhatsApp/Instagram |
| `src/pages/Agents.tsx` | **Novo** — Listagem de agentes |
| `src/pages/AttendantConfig.tsx` | Remover seção canais, adicionar classe |
| `src/pages/Dashboard.tsx` | Trial timer, upgrade CTA |
| `src/pages/Onboarding.tsx` | Adicionar seleção de classe |
| `src/components/onboarding/AgentClassSelector.tsx` | **Novo** — Seletor de classe |
| `src/components/channels/WhatsAppTab.tsx` | **Novo** — Tab WhatsApp completa |
| `src/components/channels/InstagramTab.tsx` | **Novo** — Tab Instagram |
| `src/components/TrialTimer.tsx` | **Novo** — Countdown elegante |
| `src/components/UpgradeGate.tsx` | **Novo** — Overlay de upgrade |
| `src/components/onboarding/SocialLinksSelector.tsx` | Fix URLs lowercase |
| `src/components/onboarding/BusinessOverview.tsx` | Fix URLs lowercase |
| `supabase/migrations/` | Adicionar coluna `class` em `attendants` |
| `supabase/functions/onboarding-chat/index.ts` | Ajustar prompt para fluxo de novo agente |

---

## Ordem de Execução Sugerida

1. Bloco 1 (fixes rápidos)
2. Bloco 4 (migration + classes)
3. Bloco 7 (onboarding com classe)
4. Bloco 2 (menu redesign)
5. Bloco 3 (canais de conexão)
6. Bloco 8 (remover canais do config)
7. Bloco 5 + 6 (trial timer + upgrade gates)

