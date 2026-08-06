# Design — Redesign da Página de Apresentação (Hero Cinemático com Fachada)

Data: 2026-08-05

## Objetivo

Tornar a página `boas_vindas` (Apresentação) mais moderna e chamativa, destacando a imagem `loja.png` (fachada da loja de materiais). Redesign completo da página mantendo todo o conteúdo textual atual e sem alterar lógica/navegação.

## Direção visual

Dark vibrante: fundo `slate-950`, acentos âmbar, orbes de brilho, movimento sutil e hover effects em todos os blocos.

## Seções

### 1. Hero (banner principal)

- Fundo `bg-slate-950` com camadas de gradiente âmbar/vinho, orbes de brilho `blur-3xl` pulsando (keyframes `pulse-slow`), grid pattern sutil.
- Imagem `loja.png` em moldura de vidro: wrapper `p-1` com borda gradiente âmbar, `rounded-3xl`, sombra dupla, inclinação leve `rotate-2` com hover `rotate-0`, overlay gradiente inferior.
- Badges flutuantes sobre a imagem (`animate-float`):
  - chip superior esquerdo "✨ IA Integrada"
  - chip inferior direito "⚡ WhatsApp Rápido"
  - selo circular "4.9★"
- Lado texto: badge de anúncio, título com gradiente âmbar, parágrafo, CTAs duplos (Cliente / Prestador).
- Faixa de estatísticas abaixo do hero: 4 métricas com números em gradiente ("+200 profissionais", "4.9★ avaliação média", "24h resposta média", "100% digital").

### 2. Como Funciona (jornadas)

- Duas colunas (cliente / prestador), cada uma como timeline vertical: ícone circular numerado em gradiente, linha conectora com dots, título + descrição em stagger (`animate-in` com delays).
- Headers com ícone + gradiente de texto.

### 3. Recursos Principais

- Grid 3 colunas mantido (6 cards).
- Número de canto grande em outline (`text-6xl font-black text-transparent` com stroke via `-webkit-text-stroke`).
- Hover: border âmbar + `translate-y-[-4px]` + glow shadow + ícone `scale-110 rotate-3`.
- Ícone em chip gradiente.

### 4. Detalhes técnicos

- Sem mudança de lógica/navegação; tudo dentro de `activeTab === 'boas_vindas'`.
- Adicionar keyframes `float`, `pulse-slow`, `spin-slow` em `src/style.css`.
- Manter todos os textos/conteúdo atuais.
