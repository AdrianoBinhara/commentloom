# Política de segurança

Não publique credenciais em issues, pull requests, capturas de tela ou commits. Isso inclui credenciais Meta, tokens de acesso do Instagram, `JWT_SECRET`, URLs de banco com senha, arquivos `.env`, `deploy/runtime` e o arquivo local `.project-config.json`.

Se você encontrar uma exposição, revogue ou faça a rotação da credencial imediatamente no provedor correspondente e remova o valor do histórico antes de tornar o repositório público. Relate a vulnerabilidade de forma privada ao mantenedor do fork, sem anexar o segredo ao relato.

Antes de abrir um fork, substitua `PUBLIC_BASE_URL` pelo seu domínio HTTPS e registre no aplicativo Meta apenas as URLs de callback pertencentes à sua instalação.
