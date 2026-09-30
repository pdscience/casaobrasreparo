# Casa Obras e Reparos — Gestão, Orçamentos & Agendamento com IA

Plataforma para prestadores de serviços gerais e clientes com análise de imagem por IA, agendamento de visitas, notificações WhatsApp, recibos digitais e relatórios de faturamento.

## Rodando local

Pré-requisitos: Node.js 20+

1. `npm install`
2. Copie `.env.example` para `.env` e preencha `VITE_INSFORGE_URL` e `VITE_INSFORGE_ANON_KEY`
3. `npm run dev`

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck (vue-tsc) + build de produção
- `npm run typecheck` — verificação de tipos (inclui `.vue`)
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — testes (Vitest)

## Backend

Sem servidor local: auth, banco, storage, pagamentos (Stripe) e functions rodam no InsForge (`functions/`), com migrations em `migrations/`.
