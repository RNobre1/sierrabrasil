


## Plataforma de Atendentes Inteligentes — Meteora Digital
### Sprint 1: Fundação + Auth + Dashboard + Conversas ✅
### Sprint 2: Evolução Profissional ✅
### Sprint 3: Preparação Evento Dominação Digital — Em andamento

---

### Sprint 3 — Ajustes GUIA_AJUSTES (30/03)

#### 1. Onboarding / Ghostwriter
- [x] **[P0] 1.1** Timeout 30s no Apify + fallback graceful (já implementado sprint 2)
- [x] **[P0] 1.2** Botões Pular/Finalizar funcionais (verificado ok)
- [x] **[P0] 1.3** Scraping em paralelo com perguntas do Ghostwriter (já implementado)
- [x] **[P1] 1.4** Indicador de força da senha + regras visíveis
- [ ] **[P1] 1.5** Áudio no Ghostwriter (funcional via AudioRecorder)
- [x] **[P1] 1.6** Upload de documentos no onboarding (drag-and-drop funcional)
- [x] **[P1] 1.7** Texto corrigido na tela de docs ("Envie arquivos que descrevam...")

#### 2. Autenticação
- [ ] **[P1] 2.1** Google SSO (requer config OAuth no Supabase)
- [ ] **[P1] 2.2** OTP WhatsApp (decisão: remover verificação por agora)
- [ ] **[P1] 2.3** Username com validação de unicidade em tempo real

#### 3. Dashboard
- [x] **[P0] 3.1** Guided tour no primeiro acesso (4 passos)
- [x] **[P0] 3.2** Botão "Criar novo agente" sempre visível
- [ ] **[P1] 3.3** CTAs de upgrade contextuais
- [x] **[P1] 3.4** Trial timer funcional (já implementado sprint 2)

#### 4. Conexão WhatsApp
- [x] **[P0] 4.1** Edge Function evolution-api (create, connect, status, list, delete, logout, set_webhook)
- [x] **[P0] 4.2** Webhook message flow: Evolution → identify tenant → AI → reply via sendText
- [x] **[P1] 4.3** Guia passo-a-passo visual no QR Code (3 passos)
- [ ] **[P1] 4.4** Notificação de desconexão

#### 5. Agentes e Skills
- [x] **[P1] 5.3** Campo "modelo de IA" substituído por "Modo de Conversa" (Preciso/Amigável/Formal)
- [ ] **[P1] 5.1** Skills funcionais (FAQ, Saudação, Escalamento, Captura leads)
- [ ] **[P1] 5.4** Playground de teste inline

#### 6. Conversas
- [ ] **[P1] 6.1** Handover para humano (flag human_takeover no webhook)

#### 7. Precificação e Billing
- [x] **[P0] 7.2** Preços atualizados na landing page (97/497/997/Sob consulta)
- [ ] **[P0] 7.1** Integrar Stripe checkout
- [ ] **[P0] 7.3** Oferta evento Dominação Digital

#### 8. Canais — Interface
- [x] **[P1] 8.2** Tela de conexões com guia visual step-by-step

#### 9. Relatórios
- [ ] **[P1] 9.1** Relatório básico com dados reais

#### 13. Landing Page
- [ ] **[P0] 13.1** Nome definitivo do produto
- [ ] **[P1] 13.3** Demo interativa (widget de chat)

---

### Próximos Passos Imediatos
- Stripe checkout integration
- Google SSO
- Oferta Dominação Digital
- Human handover na interface de conversas
- Skills como toggles no agent config
