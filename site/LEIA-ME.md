# Site – Fé, Esperança e Caridade

Site simples, sem custo de hospedagem. Para ver no computador, basta dar dois cliques em `index.html`.

## 1. Trocar os dados do grupo
| O que | Onde |
|---|---|
| Nome, endereço, WhatsApp, e-mail, Instagram, mapa | `js/config.js` |
| Agenda de giras, campanhas e fotos da galeria | `js/dados.js` |
| História do grupo | `quem-somos.html` (seção "Nossa história") |
| Logo | Substitua o arquivo `assets/logo.jpg` |
| Fotos | Coloque em `assets/fotos/` e liste em `js/dados.js` |

Para editar, abra os arquivos no Bloco de Notas ou no VS Code e altere **somente o que está entre aspas**.

## 2. Ligar o formulário à planilha Google (uma vez só)
1. Crie uma planilha nova em https://sheets.google.com (ex.: "Doações – Site").
2. Abra **Extensões > Apps Script**, apague o conteúdo e cole o arquivo `apps-script/Code.gs`. Salve.
3. Clique em **Implantar > Nova implantação**, escolha o tipo **App da Web**.
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. Autorize o acesso (o Google mostra um aviso porque o app é seu: clique em "Avançado" e depois em "Acessar").
5. Copie a **URL do app da Web** (termina em `/exec`) e cole em `js/config.js`, no campo `urlFormulario`.
6. Faça um cadastro de teste no site. Vai aparecer a aba **Doações** na planilha com a linha nova.

A coluna **Status** tem uma lista (Pendente, Contato feito, Agendado, Retirado, Cancelado) para a equipe controlar as retiradas. Para ser avisado de cada cadastro, use **Ferramentas > Regras de notificação** na planilha.

> Enquanto `urlFormulario` estiver vazio, o formulário funciona em **modo de teste**: ele mostra a mensagem de sucesso mas não grava nada.

## 3. Publicação (GitHub Pages)
O site é publicado automaticamente pelo GitHub Pages em:
https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/site/

Para atualizar, salve as alterações e envie para o GitHub (`git push`). Em cerca de 1 minuto o site já está atualizado.
Dá para ligar um domínio próprio (ex.: `.org.br`) em **Settings > Pages > Custom domain** no repositório.
