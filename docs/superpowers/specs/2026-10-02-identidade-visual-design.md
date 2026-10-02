# Nova identidade visual — Pomo Sul

## Contexto

O app usa hoje uma foto aérea enevoada/granulada (`public/images/hero-fazenda.jpg`) como imagem de destaque na tela de login e no topo do dashboard. O usuário quer substituí-la por uma foto própria, mais nítida, e aproveitar para dar um acabamento visual mais profissional ao resto do app — sem mudar paleta de cores, tipografia ou fluxo de nenhuma tela.

O app é construído com Next.js + Tailwind, sem biblioteca de componentes própria: botões, cards e badges são classes Tailwind repetidas inline em cada arquivo.

## Objetivo

1. Trocar a foto de destaque (login + dashboard) por uma foto fornecida pelo usuário.
2. Extrair os padrões visuais repetidos (card, botão, badge) em componentes reutilizáveis, com um acabamento ligeiramente mais refinado (sombra sutil, transições, foco consistente).
3. Migrar as telas existentes para usar esses componentes.
4. Trocar o texto "POMO SUL" do menu lateral pela logo oficial.

Fora de escopo: paleta de cores, tipografia, layout/fluxo de qualquer tela, novas funcionalidades.

## 1. Foto de destaque

**Origem:** `~/Downloads/IMG_5473.HEIC` (foto fornecida pelo usuário — maçãs na árvore, close-up, com poste/arame de espaldeira e o carreador do pomar se afunilando ao fundo, dando perspectiva).

**Já decidido e produzido nesta sessão de brainstorming** (via uma ferramenta de enquadramento interativa que o usuário mesmo ajustou):
- Convertida de HEIC para JPEG, já recortada no enquadramento aprovado pelo usuário (zoom ~130% centrado em ~43%/43% da foto original) e salva em `public/images/hero-pomar.jpg` (923×1231, ~330KB — peso similar ao arquivo atual de 870KB, mais a foto já vem pré-recortada no enquadramento certo).
- O arquivo final já está no lugar — a implementação só precisa trocar as referências, não reprocessar a foto.

**Implementação:**
- Trocar `src="/images/hero-fazenda.jpg"` por `src="/images/hero-pomar.jpg"` em:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(app)/page.tsx`
- Remover `public/images/hero-fazenda.jpg` (não fica mais referenciado).
- Como o enquadramento já foi recortado no arquivo, usar `object-position: 50% 50%` (centralizado) nos dois lugares, no lugar do `[object-position:50%_75%]` atual.

**Ajustes de contraste:**
- Reavaliar a opacidade do gradiente escuro sobreposto (`from-green-900/80 ...` no login, `from-black/45` / `from-black/75` no dashboard) para o texto branco continuar com bom contraste em cima da nova foto (mais escura/detalhada que a aérea atual) — ajustar só se necessário, a estrutura do gradiente já existente tende a bastar.
- Critério de aceite: conferir em mobile (375px) e desktop (1440px) nas duas telas — texto legível, maçãs visíveis, sem corte estranho (ex.: poste cortando no meio do texto).

## 2. Componentes visuais padronizados

Três componentes novos em `src/components/ui/`:

### `Card` (`src/components/ui/card.tsx`)
Substitui o padrão repetido `rounded-xl border border-neutral-200 bg-white p-4` (e variantes de padding/col-span) encontrado em ~32 arquivos.
- Props: `children`, `className` (para overrides pontuais como `col-span-2`), `padding` (`"none" | "sm" | "md"`, default `"md"` = `p-4`).
- Visual: borda atual + `shadow-sm` (sombra sutil nova, para dar profundidade sem pesar).
- Implementado como `<div>` simples — sem necessidade de variantes de interatividade além do que já existe (ex.: o card clicável de seleção de propriedade mantém suas próprias classes de `active:` via `className`).

### `Button` (`src/components/ui/button.tsx`)
Substitui os dois padrões hoje usados:
- Primário: `rounded-lg bg-green-700 ... text-white active:bg-green-800 disabled:opacity-60`
- Secundário: `rounded-lg border border-neutral-300 ... text-neutral-700`

Props: `variant` (`"primary" | "secondary"`, default `"primary"`), `size` (`"sm" | "md" | "lg"`, mapeando para os tamanhos de padding/texto já usados hoje), mais todas as props nativas de `<button>` (`type`, `disabled`, `onClick`, etc. via `ButtonHTMLAttributes`).
- Acrescenta `transition-colors` e `focus-visible:ring-2 focus-visible:ring-green-600/50 focus-visible:ring-offset-1` em ambas as variantes — hoje não há estado de foco visível customizado.
- `disabled:opacity-60` passa a ser padrão do componente (hoje só alguns botões têm isso).

### `Badge` (`src/components/ui/badge.tsx`)
Centraliza o estilo de badge/tag usado por `cultura-tag.tsx` e qualquer outro texto em "pílula" (ex.: o nome da propriedade no cabeçalho do app, `bg-green-50 ... rounded-full`).
- Props: `children`, `className`, `color` (`"green" | "neutral"`, default `"green"`).
- `cultura-tag.tsx` passa a usar `Badge` internamente mantendo sua própria API pública (`CulturaDot`, `corBarraCultura` continuam como estão — são cor de barra/dot, não badge).

### Migração

Os ~32 arquivos que hoje usam o padrão de card inline, os ~15 arquivos com botões inline, e os usos de badge/pílula passam a importar e usar os três componentes acima. A migração é mecânica (trocar `<div className="rounded-xl border ...">` por `<Card>`, etc.) — nenhuma lógica de tela muda. Casos com classes extras no mesmo elemento (ex.: `col-span-2`, `active:bg-neutral-50`) mantêm essas classes via prop `className`.

## 3. Marca no menu lateral

`src/components/nav/side-nav.tsx`: o texto `"POMO SUL"` (div `text-lg font-semibold`) é substituído pela logo `public/images/logo-pomosul-transparente.png` renderizada com `next/image`, altura ~32px (`h-8 w-auto`). Mesma logo já usada no login/dashboard — nenhum asset novo.

O cabeçalho mobile (`app-shell.tsx`, span "POMO SUL" que só aparece em telas pequenas) e a `BottomNav` não mudam — a logo já aparece no hero de cada tela em mobile, então repeti-la no cabeçalho seria redundante.

## Testes e verificação

- Não há lógica nova — os componentes `Card`/`Button`/`Badge` são apresentacionais, sem necessidade de testes unitários novos.
- `npm run lint` e `npm run build` devem passar sem erros após a migração.
- `npm run test` (vitest) não deve ser afetado — nenhuma função em `src/lib` muda.
- Verificação visual manual via browser preview: tela de login, dashboard, e pelo menos duas telas de lista/formulário que usam Card/Button (ex.: talhões, operações) — em mobile e desktop — para confirmar que a migração não quebrou nenhum layout.
