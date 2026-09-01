# Credenciais Meta para instalações do CommentLoom

Crie um aplicativo próprio em [Meta for Developers](https://developers.facebook.com/apps/) e inclua **Instagram API with Instagram Login**. Em **Business login settings**, use o **Instagram App ID** e o **Instagram App Secret** da sua própria aplicação. Armazene ambos exclusivamente em seu gerenciador de segredos ou arquivo `.env` local; nunca os copie para o código, navegador, chat, issue ou repositório.[1]

| Variável | Origem |
|---|---|
| `META_INSTAGRAM_APP_ID` | Instagram App ID do seu aplicativo Meta. |
| `META_INSTAGRAM_APP_SECRET` | Instagram App Secret do seu aplicativo Meta. |
| `META_WEBHOOK_VERIFY_TOKEN` | Frase longa, aleatória e exclusiva que você gera. |

Defina uma URL HTTPS própria em `PUBLIC_BASE_URL`. Com base nela, registre `/api/meta/oauth/callback` como URI de retorno e `/api/meta/webhook` como URL de webhook. Assine `comments`, `messages` e `messaging_postbacks` para que o convite e a confirmação funcionem.[2] [3]

## Referências

[1] [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)

[2] [Instagram Webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks)

[3] [Quick Replies](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api/quick-replies)
