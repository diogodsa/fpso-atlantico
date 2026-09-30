# Validação da preparação para GitHub

Origem: versão publicada 7, commit `2355321db7ae5c9db2bb6e03fb51e973ab66ef7e`.
Ambiente de validação: Linux, Node.js v24.19.0. Windows e macOS não foram executados.

## Resultado

- `npm ci --no-audit --no-fund`: dependências instaladas a partir do lockfile, sem mudança de versões.
- `npm run typecheck`: aprovado.
- `npm test`: build aprovado; **18 testes passaram, nenhum falhou**.
- As cinco páginas renderizaram com HTTP 200 no runtime Worker: FPSO, submarino, logística, inspeções e multiescala.
- O teste de API verificou persistência de fotos, isolamento entre usuários e rejeição de atualizações concorrentes obsoletas em D1/R2 locais isolados.
- Os testes geométricos verificaram conectividade submarina, explosão/reagrupamento e o ponto de montagem do sensor nos seis níveis.
- A comparação binária dos arquivos de `app`, `components`, `db`, `drizzle`, `public`, `worker`, `vendor`, `hooks` e `lib` com o commit publicado não encontrou diferenças.
- Foram examinados 178 objetos de arquivo do histórico para padrões comuns de credenciais: nenhum desses padrões foi encontrado. Isso é uma verificação por padrões, não uma garantia absoluta de ausência de segredos.
- Não houve leitura ou exportação de dados de produção, bancos, fotos privadas ou variáveis de ambiente do Site.

## Histórico e distribuição

Sete commits originais preservados. Um commit adicional documenta e adapta a distribuição para GitHub. `sites-v7` referencia a origem publicada e `github-v7` a preparação para GitHub.

O Git bundle contém as referências e os objetos versionados. Configuração local de remotos, hooks, credenciais, dependências instaladas, cache, banco local e build não entram no pacote. A restauração do bundle deve resultar em oito commits e na mesma árvore de arquivos da preparação.

## Limites

O GitHub Actions está configurado, mas só poderá executar após o envio a um repositório. A publicação no GitHub depende da conexão com a conta do usuário. Este trabalho não altera a publicação atual nem configura deploy automático. A portabilidade da autenticação e da persistência para outra hospedagem é descrita no README.
