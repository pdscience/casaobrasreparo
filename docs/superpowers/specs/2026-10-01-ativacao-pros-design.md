# Ativação de profissionais: trial, indicação, alertas — Design

Aprovado pelo usuário em 2026-10-01 (detalhar 1 e 2; ordem: trial → indicação → PWA/polling → WhatsApp push).

## Decisões

- **Trial 30 dias:** `plan='ouro'` + `plan_status='trialing'` + `plan_expires_at=+30d` + `trial_used` (1 por `auth_id`). Autoativação pelo próprio pro via edge function (cobre concierge e orgânico); expiração por demissão no login + schedule diário de backstop. Sem Stripe no trial (sem cartão, sem cobrança).
- **Indicação:** código próprio por pro (`referral_code`, 8 chars); captura `?ref=` no cadastro; prêmio só no 1º serviço concluído do indicado (antifraude); prêmios em **dias de ouro** (indicador +30d, indicado +7d) — sem mexer no Stripe. Reuso do mecanismo trial (janela ouro/trialing/expires); `trial_used` trava só a autoativação.
- **Alertas fase 1:** PWA instalável (manifest + plugin + banner) + polling 30s no painel com badge no título + toast; toggle liga/desliga (localStorage).
- **Alertas fase 2 (WhatsApp):** Cloud API da Meta (número/token por conta do usuário) + function `notify-pros` via schedule por minuto + log anti-duplicado + respeito ao toggle.
- **Fora do escopo:** cobrança/pagamento dos prêmios; lightbox; exclusão de arquivos no storage.

## Premissas verificadas

- `plan_expires_at`, bucket `service-photos`, `displayPlans` compartilhado, `loadProfessionalProfile`, schedules HTTP e `plan_status='trialing'` (só no tipo) existem.
- Nada de trial/indicação/push existe hoje; broadcasts são pull.
- **Achado de segurança (pré-existente, fora do escopo):** a policy `professionals_update` permite ao dono alterar QUALQUER coluna, incluindo `plan` (auto-upgrade direto pela API). O trial/indicação usam edge functions (service role) e não pioram isso; corrigir a policy é follow-up.
