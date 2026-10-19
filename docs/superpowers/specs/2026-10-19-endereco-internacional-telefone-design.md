# Endereço internacional + telefone com DDI — Design

Aprovado pelo usuário em 2026-10-19 (modo plan; decisões registradas aqui como autoridade).

## Problema

1. O endereço é **100% brasileiro**: `cidade` (texto livre), `uf` (2 letras), `bairro`. Não há `country`, `state`, `municipality` nem CEP em nenhuma tabela.
2. **Não existe telefone no cadastro** — nem para cliente, nem para profissional. O `users` nem tem coluna `phone`.
3. O telefone do profissional é validado como "10 ou 11 dígitos com DDD" e o DDI `55` é prefixado cegamente em 3 lugares (`src/lib/whatsapp.ts:3`, `functions/notify-pros.ts:15`, `functions/notify-pros-sms.ts:15`).
4. O endereço digitado no cadastro **nunca é copiado para `professionals`**: o profissional nasce com `cidade: ''`, `uf: ''`, `phone: ''` (`src/composables/useAuth.ts:197-205`) e precisa refazer tudo no modal de perfil.
5. Contexto: o app já é multilíngue (pt/en/es), mas o modelo de dados ainda é brasileiro.

## Decisões aprovadas

- **Dados geográficos estáticos no bundle**, sem API externa. Países/estados/municípios gerados por script a partir de `country-state-city` (devDependency).
- **Telefone gravado em E.164** (`+5511987654321`) na coluna `phone`, com `phone_country_code` separado (`'55'`) para exibição e máscara.
- **Campos novos entram no cadastro e na edição de perfil**, para cliente e profissional.
- **`uf` e `cidade` permanecem** e passam a ser preenchidos em sincronia com o novo trio — é o que mantém os filtros do diretório funcionando sem reescrita (migração gradual).

## Schema do banco

Nova migration `migrations/<timestamp>_add-international-address-phone.sql`.

### `users`

| coluna | tipo | default | nota |
|---|---|---|---|
| `country_code` | TEXT | `'BR'` | ISO 3166-1 alpha-2 |
| `state` | TEXT | `''` | nome do estado/província |
| `municipality` | TEXT | `''` | nome do município/cidade |
| `phone` | TEXT | `''` | E.164 com `+` (coluna nova) |
| `phone_country_code` | TEXT | `'55'` | DDI só com dígitos |

### `professionals`

| coluna | tipo | default | nota |
|---|---|---|---|
| `country_code` | TEXT | `'BR'` | ISO 3166-1 alpha-2 |
| `state` | TEXT | `''` | nome do estado/província |
| `municipality` | TEXT | `''` | nome do município/cidade |
| `phone_country_code` | TEXT | `'55'` | DDI só com dígitos |

`professionals.phone` **já existe** — muda apenas a convenção do conteúdo (passa a guardar E.164).

**`state_code` não é coluna.** É campo de formulário (sigla do estado vinda do dataset, ex. `SP`) que alimenta a coluna legada `uf`. A coluna nova `state` guarda o **nome** do estado (`São Paulo`).

`professionals` **não** ganha `address`/`bairro`: o endereço residencial do profissional continua só em `users`, como hoje. Para o profissional, o trio novo é a **localização de atendimento**.

### Backfill

```sql
UPDATE public.professionals SET state = upper(uf)        WHERE state = '' AND uf <> '';
UPDATE public.professionals SET municipality = cidade     WHERE municipality = '' AND cidade <> '';
UPDATE public.professionals SET phone = '+55' || phone     WHERE phone <> '' AND phone NOT LIKE '+%';
UPDATE public.professionals SET phone_country_code = '55' WHERE phone_country_code = '';
-- mesma sequência para public.users
```

`country_code` nasce `'BR'` por default — não precisa de UPDATE.

## Dados geográficos

**Gerador:** `scripts/build-geo-data.mjs` (roda uma vez, saída versionada no repo).

- `src/data/geo/countries.json` — 250 países: `{ code, dial, flag }`. ~15 KB, sempre no bundle.
- `src/data/geo/regions/<CC>.json` — `{ states: [{ code, name }], cities: { <stateCode>: [nome, ...] } }`. **Carregado sob demanda** via `import.meta.glob` (BR ≈ 100 KB, baixado só quando o usuário escolhe o país).

Fonte: `country-state-city@3.2.1` (250 países, 197 com estados, 148.038 municípios). Cidades do BR vêm em português nativo (IBGE). Estados/cidades usam o **nome nativo** — um usuário em inglês vê "São Paulo", não "Sao Paulo".

**Nome localizado do país sem dependência:** `Intl.DisplayNames` do idioma corrente da app (`pt` → "Brasil", `en` → "Brazil", `es` → "Brasil"). Bandeira derivada do código ISO por emoji de indicador regional.

**Países sem lista de estados** (53: territórios, `CW`, `SX`, `PS`, …): o campo Estado/Província vira input de texto livre.

## Componentes novos

### `src/components/AddressFields.vue`

Props com `v-model`: `countryCode`, `stateCode`, `stateName`, `municipality`, `street`, `neighborhood`.

- **País** — `<select>` com os 250 países, ordenados pelo nome localizado, rótulo `🇧🇷 Brasil (+55)`.
- **Estado / Província** — `<select>` quando o país tem lista; `<input>` de texto quando não tem. Ao trocar de país, o estado/município são **limpos** (evita estado de outro país).
- **Município** — `<input>` com `<datalist>` populado pelos municípios do estado selecionado (ou do país inteiro quando não há estados). Aceita digitação livre.
- Variante sem `street`/`neighborhood` para o profissional (local de atendimento).

### `src/components/PhoneInput.vue`

Props com `v-model`: `phone` (E.164), `phoneCountryCode`.

- `<select>` de DDI com os 250 países + `+<dial>`.
- Input com máscara por país via `AsYouType` do `libphonenumber-js` (BR → `(11) 98765-4321`, US → `(201) 555-0123`, ES → `612 34 56 78`).
- Ao montar, o DDI é sincronizado com o país do endereço (editável pelo usuário).
- Validação: `parsePhoneNumberFromString` → precisa ser *possible*; erro exibido em texto abaixo do campo.

### Bibliotecas

- **runtime:** `libphonenumber-js@1.13.15` — `AsYouType` (máscara), `parsePhoneNumberFromString` (validação), `getCountryCallingCode`. Metadata `min` = 84 KB (~25 KB gzip).
- **dev:** `country-state-city@3.2.1` — só para gerar os dados; não vai para o bundle.

## Libs

- `src/lib/geo.ts` — `COUNTRIES`, `countryName(code, lang)`, `flagOf(code)`, `dialOf(code)`, `loadRegions(cc)` (dynamic import + cache em `Map`), `statesFor(cc)`, `citiesFor(cc, stateCode)`.
- `src/lib/phone.ts` — `formatNational(cc, value)`, `toE164(countryCode, national)`, `validatePhone(countryCode, national)`, `nationalFromE164(e164, countryCode)`, `legacyToE164(phone)`.

## Fluxos

### Cadastro (`AuthModal.vue` + `useAuth.ts`)

`registerForm` ganha: `phone`, `phone_country_code`, `country_code`, `state`, `state_code`, `municipality`.

- Telefone com DDI aparece para **cliente e profissional** (hoje não existe).
- O bloco de endereço ganha País / Estado-Província / Município (mais rua e bairro, que já existem).
- No insert de `users` (`useAuth.ts:171-182`) as 5 colunas novas são gravadas, com `uf`/`cidade` em sincronia (`uf` = `state_code` em maiúsculas, ou `''`; `cidade` = `municipality`).
- No insert de `professionals` (`useAuth.ts:189-214`) passam a ser gravados `country_code`, `state`, `municipality`, `phone`, `phone_country_code` — hoje nascem todos vazios. `uf`/`cidade` também em sincronia, **corrigindo a lacuna** de o endereço do cadastro não chegar ao profissional.
- O `uf`/`cidade` do cadastro passam a ser normalizados com `trim().toUpperCase()` como já acontece no modal de perfil (hoje o cadastro grava cru).

### Edição de perfil (`ProfileEditModal.vue`)

- **Profissional** (`role === 'pro'`): o par "Cidade de atendimento / UF" é **substituído** pelo trio País / Estado-Província / Município. `professionals` recebe as colunas novas + `uf`/`cidade` em sincronia. O telefone existente passa a usar o `PhoneInput` (E.164 + DDI).
- **Cliente** (`role === 'client'`): o par "Cidade / UF" é substituído pelo trio; rua e bairro permanecem. O `users` passa a ter telefone (o cliente não tinha) via `PhoneInput`.
- A validação de telefone existente (`ProfileEditModal.vue:194-198` e `:247-251`, 10-11 dígitos) é **substituída** pela validação do `lib/phone.ts`.

### Telefone no resto do app

Sem isso, o telefone gravado quebra o contato:

- `src/lib/whatsapp.ts` — `formatWhatsAppPhone`: se o valor começa com `+`, devolve só os dígitos; senão prefixa `55` (fallback legado).
- `functions/notify-pros.ts` e `functions/notify-pros-sms.ts` — `onlyDigits`: mesma regra.
- `src/lib/quoteFlow.ts` — a validação do WhatsApp do cliente relaxa de "10-11 dígitos" para aceitar E.164 (8-15 dígitos com `+` opcional); o valor salvo em `service_requests.client_phone` é normalizado para E.164 (`+55` + dígitos quando não vier com `+`).
- `src/lib/analytics.ts` e `src/composables/usePlans.ts` não tocam telefone.

## i18n

Chaves novas em `src/i18n/pt.ts`, `en.ts`, `es.ts`.

**Compartilhadas** (usadas pelo `AddressFields.vue` e pelo `PhoneInput.vue`, reutilizados em cadastro e perfil):

`common.pais`, `common.estadoProvincia`, `common.municipio`, `common.telefone`, `common.codigoPais`, `common.selecionePais`, `common.selecioneEstado`, `common.selecioneMunicipio`, `common.digiteOuSelecione`, `common.errTelefoneInvalido`.

**Específicas de formulário:**

`auth.telefone` (rótulo no cadastro), `auth.selecionePais` (placeholder do select de país no cadastro), `profile.telefone` (rótulo no perfil).

Rótulo de estado é **"Estado / Província"** nos três idiomas (PT: "Estado / Província", EN: "State / Province", ES: "Estado / Provincia").

## Testes

- `src/lib/phone.test.ts` — máscara BR/US/ES, geração de E.164, validação (número impossível, número curto, número válido), `legacyToE164` (sem `+` → `+55`; com `+` → preserva).
- `src/lib/geo.test.ts` — `countryName` nos 3 idiomas, `flagOf`, `dialOf`, `loadRegions` cacheado.
- `src/lib/quoteFlow.test.ts` — o caso existente de "5 dígitos" segue inválido; novos casos E.164.
- `npm run typecheck`, `npm run lint`, `npm test`.

## Limites do escopo

- `uf` e `cidade` **não** são renomeados; os filtros do diretório (`availableUfs`, `availableCidades`) continuam lendo as colunas antigas.
- O label do filtro "UF" no diretório não é migrado para "Estado" (migração gradual, follow-up).
- `service_requests` **não** ganha colunas de país/estado/município — o endereço do pedido continua sendo um texto livre.
- A tela de pedido (`SolicitarView`) **não** troca o input de telefone pelo `PhoneInput` — apenas a validação relaxa e o valor é normalizado. Upgrade de UI é follow-up.
- Sem CEP/postal code em nenhuma tabela.
- `professionals` não ganha `address`/`bairro`.
- Sem testes de componente (Vitest em modo node, padrão do repo).

## Riscos

- `libphonenumber-js` entra no bundle principal (84 KB de metadata, ~25 KB gzip). Aceito: o cadastro sempre exibe o campo de telefone.
- 250 arquivos em `src/data/geo/regions/` geram 250 chunks no build (Vite). Cada um é baixado apenas se o país for selecionado.
- A máscara por país depende do `countryCode` estar correto; se o usuário trocar o país depois de digitar, o número é reformatado.
- Registros legados com telefone em formato inesperado (sinal, espaços) são normalizados só pelo `legacyToE164` no momento do uso, não no backfill.
