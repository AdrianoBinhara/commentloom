# Configuração completa da Meta e do Instagram

Este guia é para quem fez um fork e quer operar a **própria instalação** do CommentLoom. Cada instalação exige um aplicativo Meta, domínio HTTPS, banco de dados e credenciais próprios. Não reutilize valores de outro projeto.

> **Regra de segurança:** nenhuma credencial deve ir para Git, pull request, issue, chat público ou código do navegador. Mantenha os valores no arquivo `.env` local ou no gerenciador de segredos do seu provedor.

## 1. Prepare a instalação

| Item | O que fazer |
|---|---|
| Código | Faça fork, clone o repositório e execute `pnpm install`. |
| Ambiente | Copie `environment.example` para `.env` e substitua todos os valores de exemplo. |
| Banco | Crie um banco MySQL exclusivo e defina `DATABASE_URL`. |
| Domínio | Configure um domínio público com HTTPS. Use essa origem, sem barra final, em `PUBLIC_BASE_URL`. |
| Validação | Execute `pnpm test` e `pnpm check`; aplique as migrações no banco desta instalação. |

Por exemplo, para uma instalação em `https://app.exemplo.com`, use `PUBLIC_BASE_URL=https://app.exemplo.com`. Nunca use endereço local, URL de preview ou domínio de outra pessoa para o fluxo real.

## 2. Crie o aplicativo no painel Meta

Abra o [Meta for Developers](https://developers.facebook.com/apps/), crie um aplicativo destinado à sua própria empresa ou uso e adicione o produto **Instagram API with Instagram Login**. O fluxo é destinado a contas profissionais **Business** ou **Creator**.[1]

Na área **API setup with Instagram login** ou **Business login settings**, copie os valores abaixo para o seu gerenciador de segredos. O `Instagram App Secret` é o segredo específico da integração de Instagram, não um segredo copiado de outro produto do aplicativo.

| Variável | Origem |
|---|---|
| `META_INSTAGRAM_APP_ID` | Instagram App ID do aplicativo que você acabou de criar. |
| `META_INSTAGRAM_APP_SECRET` | Instagram App Secret da configuração de Instagram Login. |
| `META_WEBHOOK_VERIFY_TOKEN` | Frase longa e aleatória criada por você exclusivamente para esta instalação. |
| `META_GRAPH_API_VERSION` | Versão da API suportada pelo projeto; mantenha o exemplo do arquivo de ambiente, salvo atualização documentada. |

## 3. Registre as URLs de retorno

Com `PUBLIC_BASE_URL=https://app.exemplo.com`, registre exatamente as seguintes URLs no aplicativo Meta:

```text
OAuth redirect URI: https://app.exemplo.com/api/meta/oauth/callback
Webhook callback URL: https://app.exemplo.com/api/meta/webhook
```

O caminho de login do painel é diferente da URL acima e não deve ser cadastrado como retorno do Instagram. A URL de autorização do Instagram é sempre `/api/meta/oauth/callback`. A origem deve usar HTTPS, não deve conter barra final e precisa corresponder ao domínio configurado em `PUBLIC_BASE_URL`.[2]

## 4. Configure os eventos

Na área de webhooks do aplicativo, informe a URL de callback e o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` no campo de verificação. Assine os seguintes campos:

| Evento | Finalidade no CommentLoom |
|---|---|
| `comments` | Recebe comentários em Reels e identifica automações elegíveis. |
| `messages` | Recebe a confirmação dada pela pessoa no convite privado. |
| `messaging_postbacks` | Recebe confirmações no formato de postback, quando aplicável. |

O servidor verifica a assinatura HMAC dos eventos recebidos. Por isso, não substitua o tratamento bruto do corpo da rota de webhook por um parser que altere os bytes antes da validação.[3]

## 5. Configure acesso e permissões

O projeto solicita `instagram_business_basic`, `instagram_business_manage_comments` e `instagram_business_manage_messages`. Em modo de desenvolvimento, adicione a conta profissional que fará os testes como pessoa com função no aplicativo Meta. Para operar com contas que não pertencem aos administradores do aplicativo, siga o processo de revisão e liberação exigido pela Meta.[1] [2]

Depois, entre na área **Sua conta** do CommentLoom e conecte uma conta profissional. Ao concluir, crie uma automação, escolha um Reel, aprove o fluxo e só então ative-o.

## 6. Teste o fluxo completo

Faça o teste com uma segunda conta do Instagram quando possível. Publique um comentário novo no Reel configurado, respeitando o filtro de palavra-chave da automação. O comportamento esperado é: resposta pública opcional, convite privado sem link, confirmação explícita da pessoa e envio único do link após a confirmação. Comentários com palavras proibidas devem ser ignorados.

As respostas privadas a comentários e as mensagens de acompanhamento obedecem a janelas e limites definidos pela Meta. Não altere o fluxo para enviar o link antes da confirmação.[4] [5]

## Problemas frequentes

| Sintoma | Verificação recomendada |
|---|---|
| `Invalid redirect_uri` | Confira se `PUBLIC_BASE_URL` é o domínio HTTPS público correto e se a URI cadastrada termina exatamente em `/api/meta/oauth/callback`. |
| Não chegam comentários | Confira a assinatura de `comments`, se a automação está aprovada/ativa e se o Reel selecionado pertence à conta conectada. |
| A confirmação não envia o link | Confira as assinaturas `messages` e `messaging_postbacks`, além do botão de confirmação da automação. |
| Falha de assinatura do webhook | Confirme que o app usa o App Secret da integração Instagram e que o corpo bruto do webhook não é alterado antes da validação. |
| A conta não conecta | Verifique se é Business ou Creator e se está autorizada para testar o aplicativo no modo de desenvolvimento. |

## Referências

[1] [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login)

[2] [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)

[3] [Instagram Webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks)

[4] [Private Replies](https://developers.facebook.com/documentation/instagram-platform/private-replies)

[5] [Messaging API and Quick Replies](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api/quick-replies)
