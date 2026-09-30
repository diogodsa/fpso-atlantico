# FPSO Atlântico | Explorador 3D

Código-fonte do explorador interativo de FPSO, com sistema submarino, logística, inspeção visual e navegação multiescala do campo ao sensor.

Exportado da **versão publicada 7**, commit `2355321db7ae5c9db2bb6e03fb51e973ab66ef7e`.

[Abrir a versão hospedada](https://fpso-atlantico.diogodsa.chatgpt.site/)

Os modelos 3D são construídos em tempo de execução com TypeScript e Three.js. Dimensões, arranjos, fluxos e animações são conceituais. As fotografias de demonstração das inspeções são ilustrações geradas por IA.

## Rodar no computador

1. Instale **Node.js 24** com npm e extraia o ZIP.
2. Abra um terminal dentro da pasta `fpso-atlantico`, onde está o `package.json`.
3. Execute:

```sh
npm ci
npm run dev
```

Abra o endereço exibido no terminal, normalmente `http://127.0.0.1:5173`. Para encerrar, pressione `Ctrl+C`.

Os comandos principais não dependem de Bash, `flock` ou GNU `timeout`; podem ser usados no PowerShell, Terminal do macOS ou Linux. A validação deste pacote é registrada em `docs/export-validation.md`; Windows e macOS não foram executados neste ambiente.

A instalação requer acesso ao registro npm. A visualização 3D não exige chave da OpenAI nem chamadas a uma API de IA. Use um navegador com WebGL 2 e aceleração gráfica. Os módulos submarino e multiescala possuem também um renderizador alternativo em Canvas 2D, com desempenho e recursos visuais diferentes.

### Compilar e verificar

```sh
npm run typecheck
npm test
npm start
```

`npm test` compila o projeto e executa a suíte de testes. `npm start` abre uma prévia local do build, normalmente em `http://127.0.0.1:4173`.

| Comando | Função |
| --- | --- |
| `npm ci` | Instala as versões do `package-lock.json`. |
| `npm run dev` | Desenvolvimento com atualização automática. |
| `npm run build` | Gera o cliente e o Worker em `dist/`. |
| `npm start` | Prévia local do build usando o runtime Cloudflare. |
| `npm run typecheck` | Verifica TypeScript sem emitir arquivos. |
| `npm test` | Build, regras, geometria, HTML, componentes e ciclo de inspeções. |
| `npm run test:unit` | Regras de inspeção, modelo submarino e continuidade multiescala. |
| `npm run test:integration` | API com D1/R2 isolados; requer build prévio. |
| `npm run lint` | Análise estática com a configuração original de ESLint. |
| `npm run db:generate` | Gera novas migrações a partir do esquema Drizzle. |

## O que está incluído

| Rota | Conteúdo |
| --- | --- |
| `/` | Casco, módulos de processo, casario, heliponto, utilidades, flare, offloading, sistemas selecionáveis e vista explodida. |
| `/submarino` | Poços, árvores de natal molhadas, manifolds, flowlines, jumpers, risers, umbilicais, distribuição de controle, ancoragem, completação e ROV. |
| `/supply-chain` | Planejamento de recursos para pintura, transporte de pessoas por helicóptero e materiais por embarcação. |
| `/multiescala` | Campo → FPSO → injeção de água → bomba → mancal → acelerômetro; cortes, transparência, separação e leituras simuladas. |
| `/inspecoes` | Equipamentos, fotos, anotações, revisão humana, histórico e pendências de manutenção. |

Os arquivos de `app/*model.ts` geram a geometria. Não são necessários arquivos de modelos 3D para reproduzir as cenas. As imagens de inspeção estão incluídas em `public/inspection/`.

## Enviar ao GitHub preservando o histórico

O pacote de distribuição contém uma pasta de código para leitura e um **Git bundle** com os sete commits originais e um commit de preparação para GitHub. O bundle não contém configuração Git local nem credenciais de autenticação. A árvore atual preserva os arquivos funcionais do aplicativo.

Na pasta onde estão o bundle e a pasta de código, execute com [Git](https://git-scm.com/downloads) e [GitHub CLI](https://cli.github.com/) instalados:

```sh
git clone fpso-atlantico.bundle fpso-atlantico-git
cd fpso-atlantico-git
git remote remove origin
gh auth login
gh repo create fpso-atlantico --private --source=. --remote=origin --push
git push origin sites-v7 github-v7
```

O repositório será criado na conta autenticada pelo GitHub CLI. O nome sugerido é `fpso-atlantico`, com visibilidade privada. Se já existir um repositório com esse nome, use outro nome ou examine o conteúdo antes de conectar esta cópia a ele. Não é necessário fazer um novo `git init` ou reescrever o histórico.

Se preferir GitHub Desktop, primeiro restaure o bundle com `git clone`, remova o remoto local pelo comando acima, adicione a pasta `fpso-atlantico-git` como repositório existente e use **Publish repository**, mantendo a opção de repositório privado.

### Trabalho diário

```sh
git switch -c feature/minha-melhoria
npm ci
npm run dev
```

Depois de editar e validar:

```sh
npm run typecheck
npm test
git add .
git commit -m "Descreve a melhoria realizada"
git push -u origin feature/minha-melhoria
gh pr create --base main --fill
```

Configure sua identidade Git no computador caso ainda não esteja definida. A branch principal é `main`; `sites-v7` marca a versão hospedada original e `github-v7` marca a preparação para GitHub. O último commit de preparação usa a identidade Codex; os autores dos commits originais são mantidos.

O workflow `.github/workflows/ci.yml` verifica tipos, compila e executa os testes em pushes e pull requests. Nenhum segredo é necessário para essa validação. Ele não publica o site. O endereço atual permanece hospedado no Sites e não passa a acompanhar os pushes do GitHub automaticamente.

Referências oficiais: [criar repositório com GitHub CLI](https://cli.github.com/manual/gh_repo_create), [restaurar Git bundles](https://git-scm.com/docs/git-bundle) e [validar projetos Node.js em Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).

## Inspeções, banco e autenticação

Sem login, a interface permite explorar os exemplos e fazer alterações temporárias. Para salvar novas inspeções, fotos e pendências, a aplicação utiliza:

| Dependência | Uso |
| --- | --- |
| Cloudflare D1, binding `DB` | Registros, metadados das fotos, histórico e manutenção. |
| Cloudflare R2, binding `BUCKET` | Arquivos das fotografias enviadas. |
| Autenticação da plataforma Sites | Identidade e isolamento dos dados por usuário. |

O pacote inclui o esquema, a migração e imagens de demonstração. **Não inclui registros privados do banco nem fotos enviadas por usuários em produção.** Esses dados exigem uma migração separada, se você trocar de hospedagem.

O Vite configura emulação local de D1/R2. Os testes de integração aplicam `drizzle/0000_glossy_greymalkin.sql` em uma base isolada automaticamente. Isso não cria um login local nem migra dados de produção.

### Hospedar fora do Sites

Versionar no GitHub é independente de hospedar o aplicativo. O projeto completo usa renderização no servidor e APIs de um Cloudflare Worker; não é uma exportação estática pronta para GitHub Pages.

Para uma nova hospedagem, é necessário:

1. Criar D1 e R2 próprios, mantendo os bindings `DB` e `BUCKET`, e substituir os identificadores locais de exemplo na configuração de deploy.
2. Aplicar as migrações de `drizzle/` no banco de destino antes de habilitar gravações.
3. Integrar um provedor de autenticação e adaptar `app/chatgpt-auth.ts` e `db/inspection-store.ts`.
4. Configurar o deploy do Worker e dos arquivos de `dist/client/` no ambiente escolhido.

O código atual confia nos cabeçalhos `oai-authenticated-user-*` recebidos do gateway autenticado do Sites. Em uma hospedagem própria, a identidade deve ser validada no servidor; não aceite esses cabeçalhos diretamente do navegador. As rotas `/signin-with-chatgpt` e `/signout-with-chatgpt` pertencem à plataforma atual e não são um serviço de login independente incluído no ZIP.

## Mapa do código

| Local | Responsabilidade |
| --- | --- |
| `app/fpso-model.ts`, `app/fpso-scene.ts`, `app/explorer.tsx` | Modelo, animação e interface do FPSO. |
| `app/multiscale-*`, `app/multiescala/` | Navegação contínua, geometria mecânica, montagem do sensor e leituras simuladas. |
| `app/subsea-*` | Geometria, catálogo, conexões, controles e renderização submarina. |
| `app/supply-*` | Logística e planejamento de recursos. |
| `app/inspection-*`, `app/inspecoes/` | Interface, dados de exemplo e regras de inspeção. |
| `app/api/`, `db/`, `drizzle/` | APIs, persistência e migração SQL. |
| `worker/index.ts`, `vite.config.ts` | Entrada do Worker e configuração de build. |
| `public/`, `components/`, `vendor/` | Imagens, componentes e CSS de terceiros. |
| `tests/`, `docs/` | Testes, documentação técnica e capturas de referência. |

Consulte `docs/inspection-module.md` e `docs/subsea-implementation.md` e `docs/multiscale-implementation.md` para conhecer o escopo e as limitações de cada módulo.

## Preparação desta exportação

O código funcional dos modelos, páginas, APIs e banco foi preservado. Os ajustes para distribuição estão listados em `EXPORT_INFO.json`:

- Comandos npm sem dependência dos utilitários exclusivos do ambiente de origem.
- Nome do pacote e lockfile alinhados a `fpso-atlantico`, sem atualização de dependências.
- Remoção da associação ao projeto hospedado de `.openai/hosting.json`; bindings locais mantidos.
- README, `.nvmrc` e workflow de validação para GitHub.
- Teste de HTML adaptado ao runtime Worker e teste de CSS alinhado aos módulos atuais, substituindo expectativas do template inicial.

O README anterior permanece em `docs/README-original-sites.md`, como registro histórico. Os scripts Bash originais em `scripts/` também foram preservados, mas não são necessários para os comandos principais desta exportação. O pacote não contém credenciais, caches, dependências instaladas ou builds.

As verificações executadas estão documentadas em `docs/export-validation.md`. Nenhuma licença nova foi atribuída ao projeto durante a exportação; os avisos de terceiros existentes foram mantidos.
