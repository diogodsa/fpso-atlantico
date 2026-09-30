# Explorador 3D multiescala

Rota: `/multiescala`. Integrada à navegação de FPSO, submarino, inspeções e supply chain.

## Percurso entregue

Campo Atlântico → FPSO Atlântico → SI-4100 (injeção de água) → P-4101A (bomba centrífuga horizontal de seis estágios) → BRG-P-4101A-DE (mancal do lado do acionamento) → ACC-4101A-DE (acelerômetro radial).

O catálogo também permite inspecionar carcaça, eixo, seis impulsores, difusores e canais de retorno, selos mecânicos, mancal NDE, acoplamento/proteção e representação externa do motor. Somente o mancal DE possui um sensor detalhado neste percurso. A interface informa isso e conduz os outros componentes de volta ao mancal instrumentado.

## Continuidade espacial

- Toda geometria é procedural Three.js. Nenhum modelo 3D externo é carregado.
- Campo, módulo, bomba, mancal e sensor compartilham a mesma hierarquia de transformações, em metros. O sensor é filho da carcaça estacionária do mancal e mantém seu ponto de instalação.
- A câmera interpola a distância em escala logarítmica, ajusta os planos de recorte e guarda a última vista de cada nível. As escolhas também ficam na URL.
- O detalhamento mecânico só é construído quando necessário. O FPSO e a malha submarina existentes formam o contexto inicial. A profundidade do campo é comprimida, como sinalizado na interface.
- Ao entrar no sistema ou componente, o contexto é isolado para evitar obstruções. O controle **Mostrar contexto** permite recuperá-lo com transparência. No sensor, o contexto é a própria superfície de montagem.

## Interações

Seleção por geometria, destaques, navegação por níveis, seletor de componentes, órbita/zoom, reenquadramento e tela cheia. Corte, transparência, vista explodida e animação aparecem conforme a geometria disponível. A separação da bomba, do mancal DE e do sensor é reversível. Os difusores não giram com os impulsores.

Em telas pequenas, o percurso fica acima da cena e o painel **Detalhes** reúne informações e controles. As preferências de movimento reduzido são respeitadas.

## Instrumentação e escopo

O acelerômetro tem fixação por prisioneiro, base, carcaça, conector/cabo, elemento piezoelétrico, massa sísmica, anel de pré-carga e representação da eletrônica de condicionamento. A leitura RMS em g e a forma de onda são **simuladas**, sem aquisição real, diagnóstico ou limite operacional.

Tags, dimensões, componentes e arranjo são conceituais. Não correspondem a um equipamento de fabricante específico, a um dimensionamento industrial ou a todos os sistemas de um FPSO. As referências técnicas estão disponíveis em **Sobre o modelo** e em `app/multiscale-data.ts`.

## Validação

- TypeScript: `npx tsc --noEmit`.
- Testes: `node --test tests/multiscale-model.test.mjs tests/subsea-model.test.mjs tests/inspection-rules.test.mjs` — 12 testes aprovados.
- Invariantes verificadas: montagem do sensor em coordenadas globais; ausência de deriva após explosão/reagrupamento; seis estágios rotativos com difusores estacionários; isolamento; identificadores e referências.
- Navegação dos seis níveis, corte, separação, órbita/zoom, sinal simulado e painel móvel verificados no navegador de preview.
- Viewport móvel de 390 × 844: conteúdo sem transbordamento horizontal. O navegador de revisão utilizou a projeção CPU da mesma geometria, pois WebGL não estava disponível. O caminho WebGL passou pela verificação de tipos e build, mas não teve inspeção visual nesse ambiente.
- Evidência visual: `docs/qa/multiscale-equipment.jpg`.

## Arquivos principais

`app/multiscale-data.ts`: catálogo e estado. `app/multiscale-model.ts`: geometria e hierarquia. `app/multiscale-scene.ts`: câmera, seleção e renderização. `app/multiscale-explorer.tsx`: interface. `app/multiscale.css`: layout responsivo.

O backend de inspeções, os bindings D1/R2, a autenticação e o público do Site permanecem preservados.
