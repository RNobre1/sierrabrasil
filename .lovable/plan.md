

## Plataforma de Atendentes Inteligentes — Meteora Digital
### Sprint 1: Fundação + Auth + Dashboard + Conversas ✅
### Sprint 2: Evolução Profissional ✅

---

### Sprint 2 — Implementado

#### Bloco 1 — Fixes Visuais ✅
- URLs lowercase em SocialLinksSelector e BusinessOverview
- Logo modo claro (meteora-preta.png) no ClientLayout
- Menu "Agente" → "Agentes" (plural)

#### Bloco 2 — Redesign Sidebar ✅
- Seções agrupadas: Principal, Agentes, Canais, Análise
- Novas rotas: /channels, /agents
- Playground removido do menu (acessível dentro do agente)

#### Bloco 3 — Canais de Conexão ✅
- Página /channels com tabs WhatsApp e Instagram
- WhatsApp: status LED, templates CRUD, métricas, envio em massa
- Instagram: conexão simplificada, métricas básicas
- Upgrade gates em funcionalidades premium

#### Bloco 4 — Sistema de Agentes com Classes ✅
- Coluna `class` adicionada à tabela attendants
- Página /agents com listagem, contador, badges de classe
- Limite por plano + upgrade gate
- Classes: support (Atendimento/Suporte), sales (Vendas/Acompanhamento)

#### Bloco 5 — Trial Timer ✅
- Componente TrialTimer no Dashboard
- Countdown baseado em created_at do tenant + 7 dias
- Botão de upgrade integrado

#### Bloco 6 — Upgrade Gates ✅
- Overlay UpgradeGate reutilizável
- Aplicado em envio em massa e limite de agentes

#### Bloco 7 — AgentClassSelector ✅
- Componente de seleção de classe no onboarding
- Duas opções visuais com skills listadas

#### Bloco 8 — Cleanup ✅
- Seção "Canais" removida do AttendantConfig
- Canais gerenciados exclusivamente em /channels

---

### Próximos Passos (Sprint 3)

- Integrar AgentClassSelector no fluxo de onboarding
- Fluxo "Criar Novo Agente" com leitura de últimas 50 conversas
- Integração real com API do WhatsApp Business
- Stripe checkout nos botões de upgrade
- Página de preços / planos
