# Planos sinceros + Fotos + Categorias — Design

Aprovado pelo usuário em 2026-10-01 (modo plan; decisões registradas aqui como autoridade).

## Problema

1. Cards de plano anunciam recursos sem lastro: bronze "Até 5 fotos" (não existe galeria), ouro "Anúncios patrocinados" (feature inexistente), prata "Avaliações" (universal, não diferencial), "Múltiplas categorias" (schema só permite 1).
2. Gratuito anuncia "Perfil público básico" mas `client_visible=false` o esconde do diretório.
3. Profissional não tem como exibir portfólio nem atuar em mais de 1 categoria.

## Decisões aprovadas

- **Fotos do portfólio por plano:** gratuito 0, bronze 1, prata 3, ouro 5. Sem galeria no cadastro (só avatar); galeria na edição de perfil.
- **Categorias por plano:** gratuito 1, bronze 1, prata 3, ouro ilimitado. Cadastro continua com 1 categoria (primária); expansão na edição de perfil.
- **Gratuito visível:** `client_visible=true` (visibilidade como isca de upgrade).
- **Copy:** bronze "Até 5 fotos"→"Até 1 foto"; prata ganha "Até 3 fotos" e "Até 3 categorias", perde "Avaliações"; ouro perde "Anúncios patrocinados", ganha "Até 5 fotos" e "Categorias ilimitadas".
- **Rota completa** para categorias (não só copy): categoria vira lista.

## Arquitetura

- Fonte única no banco (padrão `request_limit`): colunas `max_photos` (0/1/3/5) e `max_categories` (1/1/3/NULL=∞) em `plans`; `categories TEXT[]` + `portfolio_photos TEXT[]` em `professionals` (backfill a partir de `category`).
- `category` (texto) **permanece como primária**: todo código leitor atual continua intacto (filtros, cotação, cards, registro). Salvamento escreve as duas (`category = categories[0] ?? ''`).
- Lógica pura de limites em `src/lib/planLimits.ts` (testável, sem SDK): `null` fotos = 0; `null` categorias = ∞; `undefined` (linha ausente) = 0 fotos / 1 categoria.
- Upload da galeria espelha `uploadProfessionalAvatar` (retry, chave por dono) no bucket `service-photos` (já público). Remoção = só da lista (órfãos no bucket, follow-up documentado).
- Sem lightbox, sem exclusão no storage, sem mudança no fluxo de cadastro além de inicializar os arrays.

## Limites do escopo

- Nada de "Anúncios patrocinados" (removido da copy; feature futura).
- `selectedCategory` do fluxo de cotação continua singular; escolher profissional usa a primária.
- Sem testes de componente (Vitest em modo node, padrão do repo); views cobertas por gates + smoke.
