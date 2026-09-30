# Inspeção visual por equipamento

A rota `/inspecoes` conecta seis tags conceituais a fotos, observações revisadas por uma pessoa, histórico e pendências internas de manutenção. O Explorer e Supply Chain têm links para a nova área. Marcadores na cena 3D e no mapa do convés selecionam a tag; o mapa permanece disponível quando WebGL não inicia.

## Dados e autenticação

- D1: `inspection_records`, `inspection_photos` e `maintenance_tasks`.
- R2: bytes das fotografias, com metadados e proprietário no D1.
- Toda operação privada utiliza a identidade autenticada recebida da plataforma. Consultas, alterações e leitura de fotos verificam o proprietário. Respostas privadas não são armazenadas em cache.
- Registros existentes usam atualização condicionada à versão, devolvendo 409 em edições concorrentes. Criação de inspeções e manutenção aceita IDs estáveis para repetição segura.
- JPEG, PNG e WebP são permitidos, com validação da assinatura do arquivo e limite de 8 MB. O limite multipart de Vinext é 9 MB para acomodar o envelope; o handler mantém o limite de 8 MB para a fotografia.
- Sem identidade autenticada, somente os exemplos podem ser explorados e alterados temporariamente. A tela informa que essas alterações não são salvas; o upload exige login.

## Demonstração e limitações

As três imagens iniciais foram geradas por IA e estão identificadas como ilustrativas. Tags, condições, prioridades e posições são conceituais. Alterar um exemplo autenticado cria uma cópia privada, mantendo o exemplo original. Não há análise automática de imagem por IA nesta versão. Anotações são manuais e confirmadas ou descartadas por uma pessoa; elas não determinam aptidão operacional.

A manutenção permanece vinculada à inspeção e admite os estados aberta, planejada e concluída. A conclusão exige descrição do resultado. O módulo não envia notificações nem abre ordens em sistemas externos.

## Verificação

- `npx tsc --noEmit`: aprovado.
- Build de produção pelo helper do Sites: aprovado.
- `node --test tests/inspection-rules.test.mjs`: quatro casos aprovados.
- `node --test tests/inspection-api.test.mjs`: ciclo completo contra o Worker compilado, com D1 e R2 locais isolados. Cobre foto PNG de aproximadamente 2,8 MB, rejeição de SVG, autenticação, origem, isolamento entre contas, repetição de criação, revisão pendente, conflito de versão, conclusão da pendência e cópia de exemplo.
- Navegador: navegação de equipamentos, revisão, anotação por coordenadas e por arrasto, histórico, criação/conclusão de manutenção e estado vazio. A sessão de teste não suporta WebGL; foi verificado o mapa alternativo, não a renderização dos novos marcadores 3D.
- Captura da interface: `docs/qa/inspecao-visual.jpg`.

A migração `drizzle/0000_glossy_greymalkin.sql` contém somente o esquema; o fluxo de publicação aplica as migrações. Não alterar migrações já publicadas: gerar uma nova para alterações futuras.
