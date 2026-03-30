

# Plano de Execucao — Todos os Itens Pendentes (exceto Item 2)

Itens excluidos: 2.1 Google SSO, 2.2 OTP WhatsApp, 2.3 Username unicidade.

---

## Bloco A — Correcoes Imediatas (rapidas)

### A1. Remover "Modelo de IA" do AgentConfigTab — substituir por "Modo de Conversa"
- **Arquivo**: `src/components/agents/AgentConfigTab.tsx`
- Remover o card "Modelo de IA" (linhas 94-122) com Select de modelo e Slider de temperatura
- Adicionar card "Modo de Conversa" com 3 opcoes visuais: Preciso, Amigavel, Formal
- Cada modo mapeia internamente para model + temperature (ex: Preciso = gemini-2.5-pro + 0.3, Amigavel = gemini-3-flash + 0.7, Formal = gpt-5-mini + 0.4)
- Salvar model/temperature no banco conforme modo selecionado

### A2. Fix CSS tag de canal cortando texto
- **Arquivo**: `src/pages/Agents.tsx` (componente `ChBadge`)
- Adicionar `whitespace-nowrap` e ajustar padding para evitar corte

### A3. Guided Tour — fix trigger para primeiro acesso
- **Arquivo**: `src/components/GuidedTour.tsx`
- Problema: usa localStorage/sessionStorage, mas no primeiro acesso apos signup pode nao triggar
- Solucao: adicionar prop `isFirstLogin` vindo do Dashboard (checar se tenant.created_at < 5min ou se nao tem conversas e nao tem tour completed)
- **Arquivo**: `src/pages/Dashboard.tsx` — passar logica de deteccao de primeiro acesso

---

## Bloco B — Skills Funcionais

### B1. Skills injetam instrucoes reais no system prompt
- **Arquivo**: `src/components/agents/AgentSkillsTab.tsx`
- Ao toggle on/off, salvar lista de skills ativas no banco (campo `settings` jsonb do attendant, ou nova coluna `active_skills text[]`)
- **Migracao**: adicionar coluna `active_skills text[] default '{}'` na tabela `attendants`
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`
- Ao montar system prompt, consultar `active_skills` e injetar instrucoes especificas (FAQ: "Responda perguntas frequentes diretamente...", Escalamento: "Se o cliente pedir humano, responda X...", Lead Capture: "Colete nome, email, telefone...", Saudacao: "Inicie com saudacao personalizada...")

---

## Bloco C — Handover Humano

### C1. Botoes "Assumir conversa" / "Devolver para IA" na tela de conversa
- **Arquivo**: `src/pages/ConversationDetail.tsx`
- Adicionar header com botao toggle: "Assumir conversa" (seta human_takeover=true no metadata da conversa) e "Devolver para IA" (seta false)
- Badge visual mostrando se esta com IA ou com humano
- **Migracao**: adicionar coluna `human_takeover boolean default false` na tabela `conversations`
- O webhook (`whatsapp-webhook`) ja tem logica para checar `human_takeover` — confirmar que esta funcional

---

## Bloco D — Stripe Checkout

### D1. Criar produtos no Stripe
- Usar ferramentas Stripe para criar 3 produtos:
  - Essencial: R$97/mes (9700 centavos BRL)
  - Profissional: R$497/mes (49700 centavos BRL)
  - Empresarial: R$997/mes (99700 centavos BRL)

### D2. Edge Function `create-checkout-session`
- Cria Stripe Checkout Session com price_id, customer_email, metadata (tenant_id)
- Retorna URL do checkout

### D3. Edge Function `stripe-webhook`
- Recebe eventos `checkout.session.completed` e `customer.subscription.updated/deleted`
- Atualiza `tenants.plan` e `tenants.status` conforme evento

### D4. UI de Upgrade
- Botoes de upgrade na landing page e no modal de limite de agentes apontam para checkout

---

## Bloco E — Oferta Evento Dominacao Digital

### E1. Criar cupom no Stripe
- Cupom "DOMINACAO2026" com desconto especifico (ex: primeiro mes gratis = 100% off, duration once)
- Ou Profissional pelo preco do Essencial nos 3 primeiros meses

### E2. Landing page com banner de oferta
- **Arquivo**: `src/pages/Index.tsx` — adicionar banner/secao destacando oferta do evento

---

## Bloco F — Notificacao de Desconexao (4.3)

### F1. Webhook connection.update → notificar usuario
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`
- Quando status muda para "disconnected", enviar notificacao (inserir registro em tabela `notifications` ou enviar email)
- UI: badge/alerta no Dashboard e na pagina de Canais quando instancia desconectada

---

## Bloco G — Relatorio Basico com Dados Reais (9.1)

### G1. Ja implementado parcialmente
- `src/pages/Reports.tsx` ja consulta dados reais (conversations, messages)
- Verificar se os graficos estao renderizando corretamente com dados existentes
- Garantir que filtro por agente funciona

---

## Bloco H — CTAs de Upgrade Contextuais (3.3)

### H1. Componente UpgradeCTA reutilizavel
- Inserir CTAs em pontos estrategicos: Dashboard (quando proximo do limite), Agentes (ja feito com modal), Skills (ja tem cadeado), Relatorios (ja tem UpgradeGate)

---

## Bloco I — Termos e Privacidade (15.1, 15.2)

### I1. Ja implementado
- `src/pages/Terms.tsx` e `src/pages/Privacy.tsx` ja tem conteudo real completo com LGPD
- Status: DONE

---

## Resumo de Ordem de Execucao

1. **A1** — Modo de Conversa no AgentConfigTab (correcao critica que o usuario pediu varias vezes)
2. **A2** — Fix CSS tag canal
3. **A3** — Fix Guided Tour trigger
4. **B1** — Skills funcionais (migracao + webhook + UI save)
5. **C1** — Handover humano (migracao + UI + webhook check)
6. **D1-D4** — Stripe checkout (produtos + edge functions + UI) — vou precisar de confirmacao dos precos e se ja tem Stripe conectado
7. **E1-E2** — Oferta evento
8. **F1** — Notificacao desconexao
9. **G1** — Validar relatorios
10. **H1** — CTAs upgrade

**Dependencias externas (vou parar e pedir)**:
- Stripe: confirmar se o connector ja esta linkado e pronto para criar produtos
- Oferta Dominacao: confirmar detalhes exatos do cupom/desconto

