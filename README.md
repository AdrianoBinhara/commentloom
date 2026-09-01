# CommentLoom

**Automação open source para comentários em Reels do Instagram.** O CommentLoom responde a comentários elegíveis, envia um convite privado **sem link** e só entrega o destino após a confirmação explícita da pessoa.

## Quer configurar usando IA?

**Comece por aqui:** abra o arquivo abaixo, copie todo o texto e cole na IA de sua preferência. Ele conduz a configuração passo a passo e impede o envio de segredos no chat, no código ou no Git.

### [COPIAR ROTEIRO PARA CONFIGURAR COM IA →](docs/PROMPT_PARA_IA.md)

Não precisa entender a árvore de arquivos para começar. A IA vai usar o roteiro e este repositório como referência.

> Use apenas contas profissionais do Instagram e as APIs oficiais da Meta. Cada instalação é independente: você usa o seu domínio, o seu aplicativo Meta, o seu banco e as suas credenciais.

## O que o fluxo faz

1. Uma pessoa comenta no Reel selecionado.
2. O CommentLoom verifica a automação, a palavra-chave opcional e as palavras proibidas.
3. Ele publica uma resposta opcional no comentário e envia um convite privado sem link.
4. A pessoa confirma que quer receber o material.
5. O link é enviado uma única vez, respeitando as regras e janelas aplicáveis da Meta.

## Início rápido

| Etapa | O que você precisa fazer |
|---|---|
| 1. Criar sua cópia | Faça um fork deste repositório e clone-o para sua máquina ou servidor. |
| 2. Instalar | Execute `pnpm install`. |
| 3. Configurar ambiente | Copie `environment.example` para `.env` e preencha apenas os valores da **sua** instalação. |
| 4. Preparar infraestrutura | Disponibilize um domínio HTTPS público e um banco MySQL próprios. |
| 5. Configurar Instagram | Crie seu aplicativo no painel Meta e cadastre as URLs de retorno e webhook do seu domínio. |
| 6. Executar | Rode `pnpm dev` no desenvolvimento ou faça o deploy no seu provedor. |
| 7. Conectar e testar | Entre no painel, conecte uma conta Business ou Creator, crie uma automação, aprove-a e faça um teste controlado. |

```bash
git clone https://github.com/SEU-USUARIO/commentloom.git
cd commentloom
pnpm install
cp environment.example .env
pnpm dev
```

## Configure o Instagram passo a passo

O guia completo explica, em linguagem direta, como configurar o domínio HTTPS, banco, aplicativo Meta, retorno de login, webhook, eventos e teste do fluxo:

**[Abrir o guia completo de configuração](docs/CONFIGURAR_META.md)**

Se preferir configurar com auxílio de uma IA, copie o texto abaixo para a ferramenta de sua escolha. Ele foi feito para pedir confirmação em cada etapa e para não colocar nenhuma credencial em código, Git ou conversa:

**[Abrir o roteiro seguro para IA](docs/PROMPT_PARA_IA.md)**

## Variáveis e segurança

O arquivo [`environment.example`](environment.example) lista as variáveis necessárias sem qualquer valor real. Guarde segredos apenas no `.env` local ou no gerenciador de segredos da sua hospedagem.

**Nunca** envie ao Git, a uma issue, a uma pull request ou a um chat público: Instagram App Secret, tokens de acesso, `JWT_SECRET`, senha de banco, `DATABASE_URL` completa, token de verificação de webhook, arquivos `.env`, `deploy/runtime`, backups ou dados reais de pessoas.

Leia [SECURITY.md](SECURITY.md) se encontrar uma exposição de segurança.

## Desenvolvimento e validação

```bash
pnpm test
pnpm check
```

Antes de aplicar qualquer alteração no banco, gere a migração com Drizzle e aplique-a somente no banco da sua própria instalação.

## Contribuições

Você pode fazer fork, criar uma branch e abrir uma pull request. As contribuições passam pela validação automática de testes e tipos. Leia **[CONTRIBUTING.md](CONTRIBUTING.md)** para o fluxo de contribuição e a lista de cuidados de segurança.

## Licença

Distribuído sob a licença [MIT](LICENSE).
