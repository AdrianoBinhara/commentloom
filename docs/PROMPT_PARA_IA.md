# Roteiro para configurar com uma IA

Copie o texto abaixo para a IA que ajudará a configurar **a sua própria instalação**. Substitua somente os campos entre colchetes. O roteiro foi escrito para impedir que a IA registre ou exponha credenciais.

```text
Quero configurar uma instalação própria do CommentLoom a partir deste repositório.

Meu domínio HTTPS público é: [https://app.seu-dominio.example]
Meu ambiente de hospedagem é: [descreva o provedor ou servidor]
Vou configurar as credenciais Meta diretamente no gerenciador de segredos do ambiente.

Conduza o processo passo a passo e pare após cada etapa para eu confirmar o resultado. Siga estas regras obrigatórias:

1. Nunca me peça para colar Instagram App Secret, access token, JWT_SECRET, senha de banco, DATABASE_URL completa, token de verificação de webhook ou qualquer credencial no chat, em um arquivo de código, Git, issue, pull request ou captura de tela.
2. Oriente-me a cadastrar esses valores somente no gerenciador de segredos do meu provedor ou em um arquivo .env local que não será versionado.
3. Não use domínios, callbacks, tokens, contas ou dados de outra instalação. Use meu domínio público como PUBLIC_BASE_URL, sem barra final.
4. Configure o Instagram API with Instagram Login no meu próprio aplicativo Meta. A URI de retorno deve ser [DOMINIO]/api/meta/oauth/callback e o webhook deve ser [DOMINIO]/api/meta/webhook.
5. Oriente-me a assinar os eventos comments, messages e messaging_postbacks e a usar a mesma variável META_WEBHOOK_VERIFY_TOKEN no campo de verificação da Meta.
6. Confirme que a conta Instagram é profissional Business ou Creator e, se o aplicativo estiver em desenvolvimento, oriente-me a adicionar a conta como testadora.
7. Antes de alterar ou aplicar qualquer configuração, mostre exatamente o que será feito e espere minha confirmação. Não envie formulários, publique configurações ou compartilhe dados externamente sem eu aprovar.
8. Execute pnpm test e pnpm check antes de concluir. Depois me guie em um teste com comentário, convite privado sem link, confirmação e entrega única do link.
9. Se houver Invalid redirect_uri, confira se PUBLIC_BASE_URL, domínio HTTPS e /api/meta/oauth/callback são idênticos ao que está no painel Meta.
10. Ao final, faça um checklist que confirme que não há arquivos .env, deploy/runtime, .project-config.json, tokens, senhas ou dados pessoais prontos para commit.

Use como referência o arquivo docs/CONFIGURAR_META.md deste repositório. Dê instruções simples, em português, e explique por que cada etapa é necessária.
```

> Não envie a um modelo de IA valores que você não aceitaria tornar públicos. A IA pode orientar o processo, mas a inserção de segredos deve ocorrer diretamente no painel seguro do seu provedor.
