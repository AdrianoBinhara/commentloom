# Variáveis de produção

Use `node scripts/configure-vps.mjs` em um servidor interativo para criar `deploy/runtime` com permissões restritivas. O arquivo é local e nunca deve ser adicionado ao Git.

```dotenv
NODE_ENV=production
PORT=3000
PUBLIC_BASE_URL=https://app.seu-dominio.example
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=GERADO_PELO_ASSISTENTE
JWT_SECRET=SEQUENCIA_ALEATORIA_DE_32_OU_MAIS_CARACTERES
MYSQL_DATABASE=commentloom
MYSQL_USER=commentloom
MYSQL_PASSWORD=SENHA_ALEATORIA_EXCLUSIVA
MYSQL_ROOT_PASSWORD=OUTRA_SENHA_ALEATORIA_EXCLUSIVA
DATABASE_URL=mysql://commentloom:SENHA_ALEATORIA_EXCLUSIVA@commentloom-db:3306/commentloom
META_INSTAGRAM_APP_ID=SEU_INSTAGRAM_APP_ID
META_INSTAGRAM_APP_SECRET=SEU_INSTAGRAM_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN=SEU_TOKEN_DE_VERIFICACAO
META_GRAPH_API_VERSION=v25.0
EDGE_NETWORK=nome-da-rede-do-seu-proxy
```
