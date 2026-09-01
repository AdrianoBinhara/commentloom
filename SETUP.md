# Configuração de uma instalação do CommentLoom

O CommentLoom usa o **Instagram API with Instagram Login**. Cada pessoa que fizer um fork deve criar seu próprio aplicativo Meta, usar uma conta profissional Business ou Creator e configurar um domínio HTTPS próprio.[1]

## Variáveis necessárias

Crie `.env` a partir de `environment.example`. Preencha `PUBLIC_BASE_URL` com a URL pública da sua instalação, sem barra final. As credenciais Meta e o token de verificação devem existir somente no backend e no gerenciador de segredos escolhido.

| Variável | Finalidade |
|---|---|
| `META_INSTAGRAM_APP_ID` | Inicia o login oficial do Instagram para o seu aplicativo Meta. |
| `META_INSTAGRAM_APP_SECRET` | Troca o código de autorização e valida a assinatura recebida. |
| `META_WEBHOOK_VERIFY_TOKEN` | Valida a solicitação inicial do endpoint de eventos. |
| `PUBLIC_BASE_URL` | Define a URL pública usada nos retornos de autorização. |

## URLs que você deve registrar

Se `PUBLIC_BASE_URL=https://app.seu-dominio.example`, registre na Meta:

```text
OAuth redirect URI: https://app.seu-dominio.example/api/meta/oauth/callback
Webhook callback URL: https://app.seu-dominio.example/api/meta/webhook
```

Use o mesmo `META_WEBHOOK_VERIFY_TOKEN` no campo de verificação e assine os eventos `comments`, `messages` e `messaging_postbacks`. Não use endereços locais, prévias temporárias nem domínios de outra instalação.[2] [3]

## Política do fluxo

Cada automação precisa estar aprovada e ativa. O sistema envia primeiro um convite privado sem link; o destino é enviado apenas uma vez, após a confirmação da pessoa e dentro das janelas aplicáveis da Meta.[4] [5]

## Referências

[1] [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login)

[2] [Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)

[3] [Instagram Webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks)

[4] [Private Replies](https://developers.facebook.com/documentation/instagram-platform/private-replies)

[5] [Quick Replies](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api/quick-replies)
