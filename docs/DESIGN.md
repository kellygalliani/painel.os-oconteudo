# Design · OS oconteudo

## Identidade
A mesma do app oconteudo. **Ponto de partida obrigatório:** copiar os tokens de `../../app.oconteudo/src/app/globals.css` (blocos `@theme inline`, `:root` e `.dark`) e as fontes de `../../app.oconteudo/src/app/layout.tsx`.

- **Fontes:** Instrument Sans na interface; Newsreader só nos títulos grandes de página, como "Hoje" e "Agenda". As duas vêm de `next/font/google`.
- **Cores da marca:** laranja `#ff7139`, rosa `#ff2f73`, violeta `#5b2cff`, ciano `#18e5e8`, tinta `#090909`, branco `#fffefa`, papel `#efede8` e noite `#251050`.
- **Tema claro:** fundo `#fffefa`. **Tema escuro:** fundo `#14081f`, igual ao app. As duas versões são obrigatórias em toda tela.
- **Logo:** copiar de `../../app.oconteudo/public/brand/` para `public/brand/`.

## Cores com significado
Ficam em tokens próprios em `globals.css`, nos dois temas.

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--area-soc` | Sociedade | violeta `#5b2cff` | `#9479ff` |
| `--area-ven` | Vendas | laranja `#e8551c` | `#ff8a5c` |
| `--area-pro` | Produto | rosa `#e8195f` | `#ff5f92` |
| `--area-fin` | Financeiro | ciano escuro `#0a8f95` | `#18e5e8` |
| `--tipo-geral` | NAIE Geral | `--area-soc` | |
| `--tipo-nicho` | NAIE Nicho | ciano | |
| `--tipo-venda` | NAIE Venda | laranja | |
| `--carga-ok` / `--carga-alta` | barra de carga do dia | tinta / âmbar `#b86e00` | branco / `#f0b04a` |

Cor de área aparece como **ponto, chip ou quadradinho de marcar**, nunca como texto corrido. Em tema claro, ciano nunca é usado em texto.

## Peças compartilhadas (`src/components/shared/`)
Criar só quando a primeira tela precisar.

| Peça | O que faz |
|---|---|
| `ChipArea` / `ChipTipo` | ponto ou chip com a cor da área ou do tipo de NAIE |
| `Marcar` | quadradinho na cor da área; marcado fica cheio com ✓ |
| `BarraCarga` | barra fina com minutos/capacidade; acima do limite fica âmbar |
| `BlocoCopiavel` | título pequeno + texto + botão **Copiar**, com o aviso "Copiado" por 2 s; se o navegador recusar, seleciona o texto |
| `Kpi` | rótulo, número grande, comparação ("de 65") e estado sem dado |
| `SeletorDona` | Kelly, Anne, Ambas, sem dona |
| `Vazio` | estado vazio com frase e próxima ação |
| `Secao` | título de seção + conteúdo, espaçamento padrão |
| `AvisoDesfazer` | toast com "Desfazer" (usar `sonner` do shadcn) |

## Regras de tela
- **Celular primeiro.** Toda tela funciona com 360 px de largura, sem rolagem lateral.
- **Calendário no celular:** células com número, pontos coloridos e barra de carga; tocar abre o dia embaixo. No computador, as células mostram até 4 títulos e "+N".
- **Leitura de NAIE:** texto com no máximo cerca de 70 caracteres por linha, `leading-relaxed`, PT e EN lado a lado no computador e em abas no celular. O modo gravação usa letra de 28 a 36 px.
- **Estados obrigatórios** em toda lista: carregando, vazio, erro com "Tentar de novo". Número ausente aparece como "sem dado".
- **Acessibilidade:** todo botão tem nome, foco visível e funciona pelo teclado. Diálogos fecham com Esc. As animações respeitam `prefers-reduced-motion`.
- **Sem enfeite:** nada de emoji como ícone de seção (usar lucide), nada de gradiente em toda parte. O gradiente da marca aparece só no logo e no topo da página Hoje.

## Cores quentes (E11, 04/11/2026)

A base é quente e a marca fica no laranja, âmbar e rosa; **violeta e ciano saíram** da interface (continuam só na logo). O escuro é marrom-café, não azul.

| Papel | Claro | Escuro |
|---|---|---|
| Fundo | `#fffaf4` | `#16100c` |
| Cartão | `#ffffff` | `#211913` |
| Faixa suave (muted) | `#f7ece0` | `#2d221a` |
| Texto apagado | `#7d6a5b` | `#b5a394` |
| Borda | `#eee1d3` | `#3a2d23` |
| Destaque (primary) | `#f2602b` | `#ff7139` |
| Palavra-chave (`kw`) | `#d6245f` | `#ff6b93` |
| Certo (`ok`) / Aviso (`aviso`) | `#2f7d32` / `#b8640a` | `#7ad99a` / `#ffc55c` |

Áreas: Social `#9a6b4f`, Vendas `#e8551c`, Produto `#d6245f`, Finanças `#5f7d2a`. Sombras `shadow-sombra` e `shadow-sombra-alta`. Palavra-chave aparece como `ChipPalavra` (rosa suave, letra de máquina). Quadros de arrastar usam `components/shared/Quadro.tsx` (dnd-kit: mouse, toque com 200 ms de espera, teclado).
