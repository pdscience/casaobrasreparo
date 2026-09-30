# Design: Fundação — Refatoração do App.vue (Sub-projeto 1 de 6)

**Data:** 2026-09-29
**Status:** Aprovado (decisões tomadas em sessão de brainstorming)
**Contexto:** primeiro sub-projeto do plano de mercado (`orçamentos → notificações → avaliações → pagamento/comissão → admin → refatoração` — ordem ajustada por decisão do usuário para **Fundação → Avaliações → Orçamentos → Notificações → Pagamento → Admin**). Ponto de retorno: commit `3535565`.

## Problema

`src/App.vue` tem 4.979 linhas e concentra roteamento (`activeTab` + `v-if`), estado (~80 refs), auth, 12 views e ~773 linhas mortas (páginas desativadas com `v-if="false"`). Não há vue-router, não há testes, e `npm run build` não type-checka arquivos `.vue`. A duplicação esconde bugs (badges divergentes, métrica de faturamento falsa). Cada feature futura (orçamentos, notificações, admin) custará 2-3× mais nessa estrutura.

## Objetivos

1. Aplicar vue-router com guards por role (cliente/pro) e deep-links em toda página.
2. Mover estado para composables e views para arquivos próprios; App.vue vira shell (<400 linhas).
3. Deletar código morto e unificar duplicações (sub-tabs, editores de perfil, builders de WhatsApp).
4. Corrigir os bugs de comportamento expostos pela duplicação.
5. Adicionar rede de segurança: `vue-tsc` no build/typecheck + Vitest para a lógica extraída.

## Não faz parte (escopo explícito)

- Correções de RLS/segurança (SELECT de PII aberto, `service_analyses` com RLS aberto, hole de claim de broadcast) — endereçadas no sub-projeto de Orçamentos/segurança.
- Estatísticas de marketing hardcoded na landing (`data-count`) — mantidas como estão.
- Novas features de marketplace (orçamentos, notificações, admin, pagamentos de serviço).
- Mudanças de UI/visual além das correções listadas; nenhum redesign.
- Migração de history mode (`/rota`); usamos hash history (`#/rota`).

## Decisões (aprovadas)

| Tema | Decisão |
|---|---|
| Páginas mortas (contato legado, como funciona, para profissionais, blog) | Deletar todas (~773 linhas) |
| Roteamento | Adotar `vue-router` com guards por role |
| Estado/componentes | Composables com refs em módulo + views em arquivos próprios (sem Pinia) |
| Verificação | `vue-tsc` no typecheck/build + Vitest para lógica extraída |
| Bugs | Refatorar **e** corrigir bugs óbvios encontrados no caminho |
| Abordagem | Migração incremental view-a-view (Abordagem A); app funcional a cada etapa; 1 commit por etapa |

## Estrutura de diretórios alvo

```
src/
├── App.vue                    ← shell: <AppHeader/>, <AuthModal/>, <router-view/>, <AppFooter/>
├── main.ts                    ← createApp + router
├── router/index.ts            ← rotas + guards por role
├── types.ts, style.css
├── api/insforgeService.ts     (contrato público inalterado; exports mortos removidos)
├── lib/
│   ├── insforge.ts, analytics.ts, quoteFlow.ts
│   └── whatsapp.ts            ← builder único de links wa.me (substitui 3 duplicados)
├── composables/
│   ├── useAuth.ts             ← authUser, userProfile, userMode, hydrate, login/register/logout
│   ├── useRequests.ts         ← service_requests, myRequests, proRequests, CRUD + status
│   ├── useProfessionals.ts    ← profissionais, filtros do diretório, visibleProfessionals
│   ├── usePlans.ts            ← plans, displayPlans, planFeatures, subscribe/portal (fonte única do banco)
│   └── useUi.ts               ← modais globais (agendar, avaliar, recibo, onboarding) + toasts
├── components/
│   ├── layout/                ← AppHeader, AppFooter, ClientSubTabs (1), ProSubTabs (1)
│   ├── auth/AuthModal.vue     ← modal login/cadastro extraído
│   ├── ProfessionalCard.vue   (existente, mantido)
│   └── ProfileEditModal.vue   (existente; editor inline duplicado do App.vue é deletado)
└── views/
    ├── landing/LandingView.vue
    ├── professionals/DirectoryView.vue
    ├── client/   SolicitarView, MeusPedidosView, RecibosView, HistoricoView
    ├── pro/      PedidosProView, FaturamentoView, PerfilProView, HistoricoProView
    └── NotFoundView.vue
```

## Rotas e guards

| Rota | View | Guard |
|---|---|---|
| `/` | LandingView | público |
| `/profissionais` | DirectoryView | público (compat com links `#/profissionais` existentes) |
| `/cliente/solicitar` | SolicitarView | `requiresAuth + role: client` |
| `/cliente/pedidos` | MeusPedidosView | idem |
| `/cliente/recibos` | RecibosView | idem |
| `/cliente/historico` | HistoricoView (cliente) | idem |
| `/pro/pedidos` | PedidosProView | `requiresAuth + role: pro` |
| `/pro/faturamento` | FaturamentoView | idem (gating de plano ouro permanece na view) |
| `/pro/perfil` | PerfilProView | idem |
| `/pro/historico` | HistoricoView (pro) | idem |
| `/:pathMatch(.*)*` | NotFoundView | público |

**`router.beforeEach`:**
1. Visitante em rota protegida → redirect para `/` + abrir AuthModal com parâmetro `redirect`; após login bem-sucedido, `router.push(redirect)`.
2. Logado acessando rota de outra role → redirect para a home da própria role.
3. Home por role: cliente → `/cliente/solicitar`; pro → `/pro/pedidos`; visitante → `/`.

**Histórico:** `createWebHashHistory` — funciona em host estático do `dist/` sem fallback de servidor e preserva links `#/profissionais`.

**Estado perdido na navegação:** o watcher de `pushState`/`popstate` atual é removido (substituído pelo router).

## Bugs a corrigir

1. **Badges das sub-tabs:** 4 cópias do bar do cliente usam `requests.length` (global), `myRequests.length` ou nada. Componente único `ClientSubTabs` usa contagens corretas (`myRequests.length` para "Meus Pedidos"; badge só onde faz sentido).
2. **Faturamento falso:** `totalRevenueMonth` soma todos os pedidos concluídos de sempre, exibido como "Faturamento (Julho) (Acumulado)" com "+18.4% em relação ao mês anterior" hardcoded e "Média de 1.1 serviços/dia" fixa → total real do mês corrente, variação real vs mês anterior (sem dado → ocultar o chip), média real = serviços concluídos no mês ÷ dias já decorridos do mês.
3. **Tooltip do gráfico** inteiro → formato monetário com centavos.
4. **12 `alert()` nativos** → sistema de toast/erro inline unificado via `useUi`.
5. **Falha de IA silenciosa:** fallback com `suggestedMinPrice: 0` agora exibe aviso visível ao usuário (fallback segue permitido).
6. **Upload de foto falho engolido:** mostra erro e não cria pedido silenciosamente sem foto/válido.
7. **Editor de perfil duplicado:** deletar o form inline do App.vue; usar somente `ProfileEditModal`.

## Código morto a deletar

- Páginas `v-if="false"`: contato legado (`App.vue:2015-2131`), como funciona (`:2133-2353`), para profissionais (`:2355-2621`), blog (`:2623-2786`).
- Exports sem uso: `getServiceRequest`, `deleteServiceRequest`, `getAnalysisResult`, `updateProfessionalPlan`, `incrementRequestCount`, `canCreateRequest`, `getSubscriptionStatus` (`src/api/insforgeService.ts`), `isQuoteFormValid`, `filterProfessionalsByCategory` (`src/lib/quoteFlow.ts`).
- Constantes `PLANS`/`PLAN_PRICES` estáticas duplicadas → fonte única `usePlans` (banco). Constantes estáticas só são mantidas como fallback exibido durante o estado de carregamento; assim que o banco responde, os dados do banco são a única fonte de verdade.
- 3 builders de WhatsApp (`src/lib/analytics.ts:45`, `src/App.vue:1119`, `src/components/ProfessionalCard.vue:25` + URL inline `:931`) → `src/lib/whatsapp.ts`.
- Watcher `pushState`/`popstate` e `syncTabFromRoute`.

## Etapas incrementais (1 commit por etapa, verde sempre)

1. **Deletar código morto** — páginas `v-if="false"` + exports sem uso; App.vue ~4.200 linhas.
2. **Tooling** — `vue-tsc` nos scripts `typecheck` e antes de `build`; Vitest instalado (`test`, `test:watch`).
3. **Router + shell** — `vue-router` (hash history), `main.ts`, `router/index.ts` com guards, `AuthModal.vue` extraído; App.vue vira shell. Views ainda extraídas sem alterar lógica interna.
4. **Composables** — `useAuth`, `useRequests`, `useProfessionals`, `usePlans`, `useUi`; refs saem do App.vue.
5. **Migração das views** — uma por vez: landing → diretório → 4 do cliente → 4 do pro; `ClientSubTabs`/`ProSubTabs` unificados (elimina as 8 duplicatas).
6. **Bugs + dedupe** — Seção "Bugs a corrigir" completa.
7. **Verificação final** — typecheck + lint + test + smoke manual.

## Testes (Vitest — lógica, não templates)

- `quoteFlow`: validação e payload do formulário.
- Filtros do diretório: categoria/UF/cidade/bairro/plano + paginação.
- Guards do router: visitante → redirect + modal; role errada → home da role.
- Cálculos de faturamento: mês corrente vs anterior; ocultar variação sem dado.
- `useRequests`: transições de status, agrupamentos de histórico, badges.

## Critérios de pronto

- `npm run typecheck && npm run lint && npm run test` verdes.
- Smoke manual: login/cadastro (ambas as roles), solicitar serviço, painel do pro, faturamento, diretório público, deep-link `#/profissionais`.
- `src/App.vue` < 400 linhas (shell puro).
- Nenhum `alert()` nativo; nenhum `v-if="false"`; nenhuma view duplicada de sub-tabs.

## Riscos e mitigações

- **Regressão silenciosa em template:** `vue-tsc` no build passa a capturar erros de `<script setup>`; smoke manual dos 6 fluxos por etapa.
- **Estado compartilhado quebrado entre views:** composables com refs em módulo preservam o comportamento de "tudo junto" do App.vue; mesma ordem de dependência das refs originais.
- **Escopo crescendo:** qualquer descoberta fora desta lista (ex.: segurança/RLS) vira item de spec de outro sub-projeto — não entra aqui.
