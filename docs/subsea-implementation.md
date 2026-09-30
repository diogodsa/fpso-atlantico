# FPSO Atlântico — sistema submarino

Nova rota: `/submarino`. Modelo procedural em Three.js / TypeScript, integrado ao explorador principal e à navegação de Inspeções e Supply chain.

## Escopo do arranjo conceitual

- Quatro produtores e dois injetores de água, com árvores de natal molhadas e módulos de controle identificados individualmente.
- Manifold de produção, manifold de injeção, terminações PLET, jumpers e flowlines.
- Risers flexíveis em configuração ilustrativa lazy-wave, módulos de flutuação distribuída, hang-off, bend stiffeners e zona de touchdown.
- Umbilical eletro-hidráulico, SUTA, SDU e flying leads para os seis SCMs e manifolds.
- Oito linhas de ancoragem distribuída e oito âncoras de sucção individualizadas. Exposição opcional da parte enterrada.
- Completação didática em corte: revestimentos, cimento, coluna de produção, tubing hanger, packer e SCSSV.
- ROV com seis propulsores, manipuladores, câmeras, iluminação e tether; TMS com tambor e umbilical de lançamento.
- 54 fichas navegáveis. As fontes primárias ficam em `app/subsea-data.ts` e são apresentadas nas fichas e no glossário.

As posições e dimensões são escolhas ilustrativas. Não foi reproduzida uma unidade real. A animação não calcula dinâmica, vazão, pressão, geotecnia ou integridade. Não representa procedimento operacional ou projeto executivo. Não há circuito de gas lift, reinjeção de gás, exportação de gás, BOP de perfuração ou equipamentos de workover instalados neste cenário.

## Arquitetura e interfaces

`subsea-model.ts` constrói as geometrias e mantém grupos selecionáveis por identificação. Elementos repetidos usam InstancedMesh. Rotas independentes determinam a direção das partículas de produção, injeção e controle. O spline dos trechos apoiados respeita o leito marinho. As linhas de ancoragem podem penetrar até o olhal enterrado da fundação.

`subsea-scene.ts` gerencia câmeras, seleção por raycasting, rótulos, camadas, pausa e liberação dos recursos. O campo submarino permanece independente do movimento do casco no explorador principal.

Quando WebGL2 não está disponível, uma projeção Canvas2D usa as mesmas geometrias submarinas e câmeras. Nesse modo, o FPSO de contexto é simplificado e a taxa de atualização é menor. Não há dependências externas de modelo 3D nem imagens de equipamento carregadas de terceiros.

## Verificação realizada em 27/09/2026

- TypeScript: `npx tsc --noEmit` aprovado.
- `node --test tests/subsea-model.test.mjs`: quatro cenários aprovados (continuidade dos circuitos; interfaces e curvas acima do leito; identidade geométrica e referências; explosão/reagrupamento e estabilidade numérica das partículas).
- Browser preview: navegação por câmeras; busca; seleção de SCM-P02 e AS-08; tabs de detalhes; controle de separação pelo teclado; glossário; opções de visualização; seleção de circuito.
- Layout móvel verificado em iframe de 390 × 844; conteúdo sem overflow horizontal, catálogo e painel operáveis.
- O navegador de verificação não disponibilizou WebGL2. A inspeção visual foi feita no renderizador de compatibilidade. O caminho WebGL foi verificado por compilação e pelas geometrias, sem medição de FPS em GPU.
- Nenhuma alteração de esquema, API ou dados de inspeções/manutenção.
