# Como contribuir

Contribuições são bem-vindas por meio de **forks e pull requests**. Para manter o projeto seguro, não envie diretamente credenciais, URLs de banco com senha, arquivos `.env`, `deploy/runtime`, dados reais de usuários ou capturas que revelem configurações privadas.

## Fluxo de contribuição

1. Faça um fork do repositório e crie uma branch descritiva, como `fix/reel-selector-overflow`.
2. Entre em `app/`, instale as dependências com `pnpm install` e confirme que `pnpm test` e `pnpm check` passam antes de começar.
3. Mantenha a alteração pequena e focada. Inclua testes quando modificar regras de processamento, integração ou validação.
4. Atualize a documentação quando a alteração afetar instalação, segurança ou o comportamento de uma automação.
5. Abra um pull request usando o modelo do repositório. Explique o problema, a solução e como ela foi testada.

## Regras de segurança

Use apenas valores fictícios em exemplos, testes e imagens. Se encontrar um segredo exposto, não abra uma issue pública com o valor: siga as orientações de [SECURITY.md](SECURITY.md). Pull requests que incluam segredos, dados pessoais ou arquivos de execução local serão recusados.

## Licença

Ao enviar uma contribuição, você concorda que ela será distribuída sob a licença [MIT](LICENSE).
