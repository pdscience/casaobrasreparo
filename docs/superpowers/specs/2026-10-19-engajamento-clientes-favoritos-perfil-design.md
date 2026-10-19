# Engajamento de clientes: favoritos, compartilhamento e perfil público

**Data:** 2026-10-19
**Status:** Aprovado no brainstorming; aguardando revisão do spec

## Objetivo

Criar um ciclo de retorno e boca a boca para o cliente:

1. **Favoritar** profissionais no diretório (sem login, por dispositivo).
2. **Compartilhar** um profissional por link direto (WhatsApp/Instagram/nativo).
3. **Ver o perfil público** com nota, avaliações reais e portfólio.
4. **Agir** a partir do perfil: pedir orçamento, favoritar, compartilhar.

Não muda o modelo de negócio nem o schema das tabelas existentes.

## Não-objetivos

- Sincronizar favoritos entre dispositivos (exigiria tabela + login).
- Paginação/infinite scroll de avaliações (limite de 10 neste ciclo).
- Página pública dedicada por rota (`#/pro/:id`) — fica como evolução.
- Corrigir a RLS pública de `service_requests` — registrado como risco separado.
- SEO/SSR das páginas públicas.

## Contexto atual

- `ProfessionalCard.vue` exibe nome, plano, categorias, localidade, bio, bairros, portfólio, nota e nº de avaliações. Não há perfil público nem compartilhamento.
- `DirectoryView.vue` filtra por categoria/UF/cidade/bairro via `useProfessionals`.
- Avaliações são gravadas em `service_requests.rating` (jsonb: `stars`, `comment`, `date`) pelo `RateModal`; `professionals.rating/reviews_count` são sincronizados por trigger.
- `service_requests` tem `SELECT using (true)` — qualquer visitante lê a tabela inteira (inclui PII de clientes). **Não vamos expor mais nada além de nota/comentário/data.**
- `useUi.ts` centraliza estado de modais; `App.vue` monta os modais globais.
- Router é hash-based (`src/router/index.ts`); o diretório é a rota `#/profissionais`.
- i18n pt/en/es com teste de paridade de chaves; `Intl` é usado para país e moeda.

## Decisões

1. **Favoritos em localStorage**, com ref de módulo (`useFavorites`), porque não exigem login e funcionam para visitante anônimo.
2. **Perfil em modal global** (`useUi.profileModalPro`) em vez de nova rota: reusa o diretório já carregado e o padrão de modais existente.
3. **Deep link por query**: `#/profissionais?pro=<id>`. O `DirectoryView` resolve o id na lista carregada e abre o modal; fechar remove o parâmetro com `router.replace`.
4. **Avaliações via RPC `SECURITY DEFINER`**, retornando apenas `stars`, `comment`, `review_date`. Evita depender do `SELECT true` e não expõe PII.
5. **Compartilhamento progressivo**: `navigator.share` → clipboard → link `wa.me`.

## Arquitetura e componentes

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/composables/useFavorites.ts` | Estado reativo dos ids favoritos, persistência e API (`isFavorite`, `toggleFavorite`, `favoriteIds`, `favoritesCount`). |
| `src/lib/share.ts` | `professionalShareUrl(id)` e `shareProfessional(pro, lang)` com fallbacks; retorna o modo usado. |
| `src/components/ProfessionalProfileModal.vue` | Perfil público + avaliações + ações. |
| `src/lib/favorites.test.ts` | Testes do composable com storage injetável. |
| `src/lib/share.test.ts` | Testes de URL e seleção de fallback. |
| `migrations/20261019140000_add-professional-reviews-rpc.sql` | Função `get_professional_reviews(uuid)` + grants. |

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/composables/useUi.ts` | `profileModalPro: Ref<Professional \| null>`. |
| `src/App.vue` | Monta `ProfessionalProfileModal`. |
| `src/components/ProfessionalCard.vue` | Botão de favorito (coração) e de compartilhar; botão "Ver perfil" que emite `view`. |
| `src/views/professionals/DirectoryView.vue` | Chip "Favoritos (n)", filtro combinado, deep link `?pro=`, abertura do modal, limpeza da query ao fechar. |
| `src/views/client/SolicitarView.vue` | Recebe `view` do card e abre o mesmo modal. |
| `src/api/insforgeService.ts` | `getProfessionalReviews(id)`. |
| `src/i18n/pt.ts` / `en.ts` / `es.ts` | Chaves novas. |
| `src/i18n/i18n.test.ts` | Nenhuma mudança estrutural; paridade já cobre. |

## Fluxo de dados

### Favoritos

```
localStorage["casaobra_favorites"]  (JSON: string[])
        │ leitura tolerante a erro/JSON inválido
        ▼
useFavorites (ref<Set<string>> singleton)
        ├── isFavorite(id)  → card (coração preenchido)
        ├── toggleFavorite(id) → grava e atualiza todos os cards
        └── favoritesCount  → chip do diretório
```

- Chave inválida/JSON corrompido → trata como lista vazia e regrava na próxima ação.
- `localStorage` indisponível (modo privado/SSR) → funciona só em memória.
- Ids que não existem mais são ignorados pelo filtro.

### Compartilhar

```
professionalShareUrl(id)
  = `${origin}/#/profissionais?pro=${encodeURIComponent(id)}`

shareProfessional(pro, lang)
  navigator.share disponível? → share({ title, text, url })
  senão navigator.clipboard    → copia e retorna "clipboard"
  senão                        → window.open(wa.me/?text=...)
```

- Texto: `"{name} — {categoria} em {cidade} · {país}"` localizado.
- Toast: sucesso ao copiar, erro ao falhar; cancelamento do share nativo não é erro.

### Perfil público

```
card "Ver perfil" ──► emit("view", pro) ──► useUi.profileModalPro = pro
deep link ?pro=id ──► DirectoryView resolve em professionals ──► mesmo ref
                                 │
                                 ▼
ProfessionalProfileModal
  ├── dados do Professional (já em memória)
  ├── getProfessionalReviews(id) na abertura
  └── ações: favoritar, compartilhar, escolher/pedir orçamento
```

- O modal só abre quando o `Professional` está em memória; se o id do deep link não existir (link antigo), nada acontece e a query é removida.
- Fechar: `Escape`, botão X, clique no overlay e `router.replace` sem `pro`.

### Reviews

RPC:

```sql
create or replace function public.get_professional_reviews(p_id uuid)
returns table (stars int, comment text, review_date date)
language sql
security definer
set search_path = public
as $$
  select
    coalesce((rating->>'stars')::int, 0),
    coalesce(rating->>'comment', ''),
    nullif(rating->>'date', '')::date
  from public.service_requests
  where professional_id = p_id
    and rating is not null
    and (rating->>'stars') is not null
  order by nullif(rating->>'date', '')::date desc nulls last
  limit 10;
$$;

grant execute on function public.get_professional_reviews(uuid) to anon, authenticated;
```

- Cliente: `insforge.database.rpc('get_professional_reviews', { p_id: id })`.
- Erro na RPC → modal mostra estado "avaliações indisponíveis" e mantém nota agregada do card.
- Datas formatadas com `Intl.DateTimeFormat(lang, { dateStyle: 'medium' })`; se a data for inválida, omite.

## i18n

Chaves novas (mesmo conjunto nos três idiomas):

- `profile.title`, `profile.viewProfile`, `profile.reviews`, `profile.noReviews`, `profile.reviewsUnavailable`
- `profile.share`, `profile.favorite`, `profile.unfavorite`, `profile.shareCopied`, `profile.shareError`
- `profile.chooseAndRequest`, `profile.close`
- `directory.favorites`, `directory.favoritesOnly`, `directory.noFavoritesTitle`, `directory.noFavoritesDesc`
- `card.viewProfile`, `card.favorite`, `card.unfavorite`, `card.share`

## Erros e edge cases

- Favoritar/desfavoritar deve ser instantâneo e reversível; nunca bloqueia o clique do card (`@click.stop`).
- Filtro "Favoritos" ligado + nenhum favorito → estado vazio específico, com CTA para desligar o filtro.
- Deep link com id inexistente → remove a query silenciosamente.
- Reviews com `stars` fora de 1–5 → clampa em 1–5 na renderização.
- `comment` vazio → mostra texto genérico localizado.
- Perfil de profissional oculto por plano: o deep link só resolve sobre `professionals` carregados (inclui ocultos? usar `filteredProfessionals` ou a lista completa — decisão: lista completa `professionals` para não quebrar links, mas o modal exibe o mesmo conteúdo do card).

## Testes

### Unitários

- `favorites.test.ts`: toggle adiciona/remove, persiste, lê storage corrompido como vazio, storage indisponível não lança.
- `share.test.ts`: URL correta (hash + encoding), escolha de `share`/`clipboard`/`whatsapp` conforme disponibilidade, cancelamento (`AbortError`) não vira erro.
- Paridade de i18n já coberta.

### E2E (Playwright, produção/local)

1. Abrir diretório, favoritar um card, recarregar → coração continua ativo.
2. Ligar filtro "Favoritos" → só o favoritado aparece; desligar → lista volta.
3. Abrir perfil pelo card → modal com nota e reviews.
4. Abrir `#/profissionais?pro=<id>` direto → modal abre.
5. Fechar modal → query `pro` some da URL.
6. Compartilhar com clipboard mockado → toast de copiado.

## Segurança

- A RPC expõe somente nota/comentário/data, com `security definer` e `search_path` fixo.
- Nenhuma coluna de cliente (nome/telefone/endereço) é retornada.
- O furo existente de `service_requests SELECT true` **permanece** e deve ser tratado em ciclo próprio (proposta: restringir SELECT a dono/profissional/broadcast e migrar reviews para a RPC).

## Riscos e evolução

- Favoritos por dispositivo: limpar o navegador perde a lista. Evolução: tabela `favorites` + login.
- Link compartilhado aponta para o diretório com modal; uma rota `#/pro/:id` melhoraria SEO/experiência.
- Limite de 10 reviews; paginação futura.
