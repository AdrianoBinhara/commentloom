# CommentLoom

CommentLoom é uma automação para contas profissionais do Instagram. Ele pode responder a comentários elegíveis em Reels, enviar um convite privado sem link e entregar o link somente após uma confirmação explícita.

## Antes de começar

Você precisa de uma conta profissional do Instagram, um aplicativo próprio na Meta configurado para **Instagram API with Instagram Login**, um domínio HTTPS público e um banco MySQL. Cada instalação deve usar as próprias credenciais; **nunca** publique valores de `.env`, tokens de acesso, backups ou dados reais de clientes.

Copie `environment.example` para `.env`, preencha apenas os valores da sua instalação e siga o guia em [SETUP.md](SETUP.md). O arquivo `.env` e os dados de execução são ignorados pelo Git.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Para validar o projeto, execute `pnpm test` e `pnpm check`. Para alterações no banco, gere a migração com Drizzle e aplique-a apenas no banco da sua instalação.

## Segurança

Consulte [SECURITY.md](SECURITY.md) antes de publicar forks ou abrir issues. A configuração de produção deve usar um gerenciador de segredos e uma URL pública própria definida em `PUBLIC_BASE_URL`.

## Licença

Este repositório está configurado como MIT no pacote. Adicione um arquivo `LICENSE` com o texto da licença escolhida antes de tornar o repositório público.
