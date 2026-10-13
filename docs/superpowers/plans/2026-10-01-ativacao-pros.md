# Ativação de profissionais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profissional novo testando ouro em 1 clique, crescendo por indicação e sabendo de pedido novo em <1 min.

**Architecture:** Mecanismo único de janela ouro (`plan/trialing/expires_at`) reusado por trial e prêmios; demissão no login (sem dependência de cron) + schedule de backstop; indicação por trigger (como o rating); PWA + polling antes do push externo.

**Tech Stack:** Vue 3 + TS + Vitest + InsForge (migrations, edge functions Deno, schedules HTTP, storage).

**Spec:** `docs/superpowers/specs/2026-10-01-ativacao-pros-design.md`

## Global Constraints

- UI, comentários, testes e commits em **pt-BR**; commits convencionais.
- Cada task: `npm run typecheck && npm run lint && npm test && npm run build` verdes + commit (exceto verificação final, sem commit vazio).
- Números de linha ref. commit `0f14cce` (+ commits da branch); localizar por identificadores.
- Sem segredos em código; `.env` nunca commitado. Sem testes de componente.
- Functions deployadas entram em produção ao deploy — anunciar cada deploy.

---

## Fase 1 — Trial 30 dias

### Task 1: Migration do trial

**Files:** Create `migrations/<ts>_trial-flags.sql`.

- [ ] Step 1: `npx -y @insforge/cli db migrations new trial-flags`
- [ ] Step 2: SQL exato:
```sql
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;
```
- [ ] Step 3: `npx -y @insforge/cli db migrations up --all` (esperado: 1 aplicado)
- [ ] Step 4: Verificar: `SELECT column_name FROM information_schema.columns WHERE table_name='professionals' AND column_name='trial_used'`
- [ ] Step 5: `git add migrations/ && git commit -m "feat: flag trial_used no profissional"`

### Task 2: Function `activate-trial` + deploy

**Files:** Create `functions/activate-trial.ts`. Padrão: espelhar auth/cors de `change-plan.ts` (linhas 12–31).

- [ ] Step 1: Implementar: valida JWT → lê `professionals` (`plan, trial_used`) pelo `professionalId` do body (+ checa `auth_id` = usuário, como `change-plan.ts:74-79`) → se `trial_used` ou `plan != 'gratuito'`, 409 `{error:'Trial indisponível'}` → senão `update({plan:'ouro', plan_status:'trialing', plan_expires_at: now+30d, trial_used:true})` → 200 `{plan, expires_at}`.
- [ ] Step 2: `npx -y @insforge/cli functions deploy activate-trial --file functions/activate-trial.ts` (esperado: success)
- [ ] Step 3: Verificar nos logs que a function responde (sem invocar com dados reais)
- [ ] Step 4: Commit: `git add functions/activate-trial.ts && git commit -m "feat: function de autoativacao do trial ouro"`

### Task 3: Demissão no login + banner/CTA

**Files:** Modify `src/composables/useAuth.ts` (após `loadProfessionalProfile`, ~linha 89–94), `src/views/pro/PerfilProView.vue` (topo, antes dos cards ~linha 184).

- [ ] Step 1: Em `loadProfessionalProfile`, após carregar: se `pro.plan_status==='trialing'` e `pro.plan_expires_at` passado → `updateProfessional(authId→id, {plan:'gratuito', plan_status:'active', plan_expires_at:null})` + toast info "Seu período de teste terminou." (try/catch silencioso para não quebrar login).
- [ ] Step 2: Banner no PerfilProView quando `proProfile.plan_status==='trialing'`: "Você está testando o OURO grátis até DD/MM" + dias restantes (`Math.ceil((expires-now)/86400000)`) + botão "Continuar no ouro" → `subscribePlan('ouro')`; se `plan==='gratuito' && !trial_used` (precisa expor `trial_used` no tipo Professional + leitura — adicionar `trial_used: boolean` ao tipo e ao select? `select('*')` já traz; só tipar): botão "Ativar 30 dias grátis" → invoke `activate-trial` via nova função em `insforgeService.ts` (`activateTrial(professionalId)`, espelho de `changePlan`) → reload perfil + toast.
- [ ] Step 3: Gates + commit `feat: expiracao do trial no login e banner com CTA`.

### Task 4: Schedule diário de backstop + smoke do trial

**Files:** nenhum (CLI + teste).
- [ ] Step 1: Criar schedule diário chamando function de expiração. Como a demissão é no login, o backstop precisa de endpoint: reutilizar `activate-trial.ts`? Não — criar `functions/expire-trials.ts` (service role? functions rodam com contexto; usar `Deno.env` admin? Padrão do repo: functions usam token do usuário. Para cron sem usuário, checar como `analyze-worker` autentica — ler o arquivo antes; se exigir segredo, documentar e pedir ao usuário). Se inviável sem segredo novo: SKIP com justificativa + demissão no login cobre o fluxo.
- [ ] Step 2: Smoke: conta pro teste → ativar trial → banner com dias → simular expiração (ajustar `plan_expires_at` p/ ontem via db query) → relogar → plano gratuito + toast. Limpar dados de teste.
- [ ] Step 3: Commit se houve código (`fix:`/`feat:`); senão sem commit.

---

## Fase 2 — Indique e Ganhe

### Task 5: Migration indicação

**Files:** Create `migrations/<ts>_referrals.sql`.
- [ ] Step 1: scaffold + SQL:
```sql
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS referred_by TEXT NULL;
UPDATE public.professionals SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) WHERE referral_code IS NULL;
CREATE TABLE IF NOT EXISTS public.referrals (
  id TEXT PRIMARY KEY DEFAULT MD5(RANDOM()::TEXT),
  referrer_pro_id TEXT NOT NULL REFERENCES public.professionals(id),
  referred_pro_id TEXT NOT NULL REFERENCES public.professionals(id),
  status TEXT NOT NULL DEFAULT 'cadastrado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
RLS `referrals`: SELECT próprio (`EXISTS (SELECT 1 FROM professionals WHERE id=referrer_pro_id AND auth_id=auth.uid())`), INSERT autenticado com `WITH CHECK` da mesma condição; sem UPDATE/DELETE por cliente (trigger service-side atualiza status).
```sql
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY referrals_select_own ON public.referrals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = referrals.referrer_pro_id AND p.auth_id = (auth.uid())::text));
CREATE POLICY referrals_insert_own ON public.referrals FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = referrals.referrer_pro_id AND p.auth_id = (auth.uid())::text));
```
- [ ] Step 2: apply + verificar (códigos gerados p/ existentes; policies listadas)
- [ ] Step 3: Commit `feat: referral code e tabela de indicacoes`

### Task 6: Captura `?ref=` + registro + anti-autoindicação

**Files:** Modify `src/views/landing/LandingView.vue` (mount lê `route.query.ref`), `src/composables/useAuth.ts` (register), `src/api/insforgeService.ts` (create referrals row? via db insert direto com RLS — o criador é o indicado, mas a policy exige ser DONO do referrer... o indicado NÃO é dono! INSERT falharia. Logo: criar a linha via edge function service-role OU trigger. Mais simples: function `register-referral`? Ou incluir na `activate-trial`? Não. Decisão: pequena edge function `track-referral` (service role via user token? precisa bypass RLS → usar chave de serviço no backend, padrão a verificar em `analyze-worker.ts`). Alternativa sem function: trigger no INSERT de professionals que lê `referred_by` e cria a linha em referrals (service-side, sem RLS). **Adotar trigger** (menos peça móvel).
- [ ] Step 1: `?ref=` → `localStorage 'casaobra_ref'` (só se formato ^[A-Z0-9]{8}$) no mount da landing.
- [ ] Step 2: No registro pro (`useAuth.ts:159-180`): `referred_by: storedRef ?? null`; bloquear autoindicação comparando com o próprio código? No registro ainda não há código próprio — autoindicação real seria usar o próprio código de OUTRA conta; bloqueio prático: o trigger ignora quando o `auth_id` do indicado já tem outro pro (1 conta pro por login já vale). Documentar.
- [ ] Step 3: Trigger `trg_track_referral` AFTER INSERT em professionals QUANDO `referred_by` não nulo: resolve referrer por `referral_code` → INSERT em referrals (cadastrado) — SECURITY DEFINER, `search_path=public`.
- [ ] Step 4: Tipo `Professional`: `referral_code: string | null`, `referred_by: string | null`. Tipo `Referral` novo em `types.ts`.
- [ ] Step 5: Gates + commit `feat: captura de indicacao no cadastro`

### Task 7: Prêmios no 1º serviço + UI Indique e Ganhe

**Files:** Migration (trigger `trg_referral_reward` AFTER UPDATE em service_requests QUANDO `NEW.status='Concluído'`): se existe referrals(cadastrado) p/ o pro do pedido → estende janela ouro dos DOIS (+30d referrer, +7d referido: `plan='ouro', plan_status='trialing', plan_expires_at = GREATEST(atual, NOW())+intervalo`) + status='premiado'. SECURITY DEFINER.
**Files UI:** Modify `src/views/pro/PerfilProView.vue` (seção após os cards): código com copiar, botão WhatsApp share (`https://wa.me/?text=.../r/CODIGO`), lista de indicações (status), saldos de dias ganhos.
- [ ] Steps: trigger + teste SQL com dados temporários (pro A indica B; pedido de B concluído → janelas estendidas; limpar tudo) → UI → gates → commit `feat: premios de indicacao e painel`

### Task 8: Smoke indicação + limpeza

Sem código (salvo gate-fix). Pedidos de teste A→B de ponta a ponta no browser; limpar dados; commit só se fix.

---

## Fase 3 — PWA + polling

### Task 9: PWA instalável

**Files:** Create `public/manifest.webmanifest`; Modify `index.html` (link + theme já existe), `vite.config.ts` (plugin `vite-plugin-pwa`, nova devDep), `src/main.ts` (register SW), banner de instalação (novo componente ou bloco no AppHeader? usar `beforeinstallprompt` → ToastHost/banner dedicado em `App.vue`).
- [ ] Ícones: reusar `logo_casa.png` (192/512 via `sizes:"any"` + purpose maskable; documentar limitação).
- [ ] Gates + commit `feat: PWA instalavel`

### Task 10: Polling + badge + toggle

**Files:** Modify `src/views/pro/PedidosProView.vue` (intervalo 30s com `onUnmounted` cleanup + `document.hidden` guard), `index.html`? (título dinâmico via `document.title`), `useUi` ou localStorage p/ toggle `proAlerts`.
- [ ] Novo broadcast (id fora do conjunto conhecido) → toast + título `(1) ...` + (opcional) beep WebAudio curto.
- [ ] Toggle "Alertas de pedidos" no painel pro (default on, localStorage).
- [ ] Gates + commit `feat: alerta de pedido novo no painel`

---

## Fase 4 — Push WhatsApp (depende de conta Meta do usuário)

### Task 11: Function `notify-pros` + schedule + preferências

**Pré-requisitos do usuário (antes):** número WhatsApp Business + token Cloud API + template aprovado ("novo pedido: {categoria} em {cidade}"). Sem isso, só até o código + teste seco.
**Files:** Create `functions/notify-pros.ts` (lê broadcasts dos últimos ~2min sem envio — tabela `notification_log` nova via migration — filtra pros elegíveis por categoria/cidade/`receives_broadcasts`/toggle, envia template via Graph API, grava log); schedule `* * * * *` chamando a URL; UI respeita o mesmo toggle da Task 10.
- [ ] Steps: migration log → function → deploy → schedule → teste seco (sem token = 200 com `skipped`) → commit `feat: push de pedido novo via WhatsApp`
- [ ] Smoke real fica com o usuário (credenciais dele).

---

## Verificação final

- [ ] Gates verdes na branch; smoke regressivo (cadastro, planos, filtros, histórico); sem dados de teste restantes.
- [ ] Revisão final + merge (fluxo `finishing-a-development-branch`).

## Self-Review (autor)

1. **Spec coverage:** trial auto+expiração+banner ✓ (T1–T4); indicação código/captura/prêmio/UI ✓ (T5–T8); PWA/polling ✓ (T9–T10); WhatsApp push ✓ (T11); antifraude (trial 1×, prêmio no resultado, sem autoindicação prática) ✓.
2. **Placeholder scan:** sem TBD; SQL e comandos exatos; único ponto condicional documentado (Task 4 expiração via cron depende do padrão de auth de `analyze-worker.ts` — ler antes, com fallback definido).
3. **Type consistency:** `trial_used: boolean`, `referral_code/referred_by: string|null`, `Referral` novo, `categories/portfolio_photos` já existem (T-fase anterior).
