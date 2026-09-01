# Auto-hospedagem com Docker Compose

Esta configuração inicia a aplicação e um MySQL dedicado. O arquivo `deploy/runtime` é criado apenas no servidor e é ignorado pelo Git. Nunca o envie para um repositório, serviço de chat ou armazenamento público.

## Configuração

No servidor, execute o assistente em um terminal interativo. Ele solicita o e-mail administrativo, a URL pública da instalação e as credenciais Meta; os valores sensíveis não são exibidos e o arquivo resultante recebe permissões restritivas.

```bash
docker run --rm -it --user "$(id -u):$(id -g)" \
  -v "$PWD":/app -w /app node:22-bookworm-slim \
  node scripts/configure-vps.mjs
docker compose -f deploy/compose.yaml up -d --build
docker compose -f deploy/compose.yaml run --rm app pnpm drizzle-kit migrate
```

Crie previamente a rede externa que será usada pelo seu proxy reverso e informe seu nome por `EDGE_NETWORK`. Use `deploy/Caddyfile.example` como modelo, substituindo `app.seu-dominio.example` pelo domínio desta instalação. Em seguida, registre na Meta as URLs derivadas de `PUBLIC_BASE_URL` conforme [SETUP.md](../SETUP.md).
