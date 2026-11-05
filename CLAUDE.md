# CLAUDE.md – Grupo "Fé, Esperança e Caridade" (Umbanda)

Memória do projeto: o que existe, como funciona e as regras para mexer.
**Atualize este arquivo sempre que criar ou mudar uma funcionalidade.**

- **Responsável:** o dirigente que criou o projeto (primeira conta do app = admin).
- **Idioma:** tudo em português do Brasil (código, textos, commits).
- **Repositório:** https://github.com/4vmmodas-cpu/grupo-fe-esperanca-caridade (público, branch `main`, conta gh `4vmmodas-cpu`).
- **Publicação:** GitHub Pages, automática a cada push.
  - Site: https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/site/
  - App: https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/app/
- **Supabase:** projeto `bbkwxuczioronhwggnep` (plano grátis, região São Paulo).

---

## 1. Estrutura

```
index.html          → redireciona para site/
site/               → site público de apresentação (estático)
app/                → PWA dos membros (estático + Supabase)
  js/               → módulos ES (sem build)
  supabase*.sql     → scripts do banco (o responsável cola no SQL Editor)
  supabase/functions/lembretes/index.ts → Edge Function de notificações
```

Não há build, bundler nem npm no projeto: são HTML, CSS e JS puros, com módulos ES. Bibliotecas vêm de CDN com versão fixa:
- supabase-js 2.45.4 (jsDelivr ESM)
- jsPDF 2.5.1 e jspdf-autotable 3.8.2 (cdnjs)

---

## 2. Site (`site/`)
- **Páginas:** index (hero com as palavras Fé/Esperança/Caridade passando ao fundo e o logo entrando aos 3,6 s), quem-somos, doutrina, agenda, campanhas, galeria, doacoes.
- **`js/config.js`:** dados do grupo. `urlFormulario: ""` deixa o formulário em modo teste.
- **`js/dados.js`:** AGENDA, CAMPANHAS e GALERIA.
- **`js/main.js`:** cabeçalho e rodapé, ViaCEP e envio do formulário.
- **Doações:** o formulário (mantimentos, roupas, cobertores, retirada em casa) vai para o Google Sheets via `apps-script/Code.gs` (doPost, fetch no-cors).
- **Pendente (adiado pelo responsável):** endereço, mapa, dias das giras e a URL do Apps Script.

---

## 3. App (`app/`)

### Módulos
| Arquivo | Papel |
|---|---|
| `app.js` | Login e cadastro, telas (pendente/bloqueado/nova senha), 6 abas, assinaturas em tempo real, `ctx`, auto-atualização do SW, `?aba=` vindo de notificação |
| `db.js` | Única camada que fala com o Supabase. Converte camelCase ↔ snake_case (`paraBanco`/`doBanco`); o conjunto `NULOS` transforma "" em null nas datas e ids opcionais |
| `ui.js` | Helpers: `esc`, datas (`hojeISO`, `dataBR`, `somaDias`…), moeda em centavos, `abrirModal`, `confirmar`, `salvando`, `toast`, `copiar`, ICS/lembretes, `compartilharArquivo` |
| `agenda.js` | Calendário; lista por **Semana/Mês**; repetir **toda semana** (rodízio de casas) ou **todo ano**; Avisar no WhatsApp; + Lição (giras); 📚 + Resumo (estudos) |
| `licoes.js` | Lições das entidades: ✓ Fiz (RPC `marcar_licao`), lembrete, WhatsApp/Copiar |
| `estudos.js` | Aba Estudos com seletor **📚 Estudos / 📖 Biblioteca / 🎵 Músicas**. Livros → registros do dia (capítulos, resumo, presentes), curtidas, comentários, relatório PDF |
| `biblioteca.js` | PDFs no Storage (bucket privado `biblioteca`, 50 MB por arquivo); envio com barra de progresso (XHR); links assinados de 1 h |
| `musicas.js` | Caderno de pontos cantados: letra livre, linha/Orixá, link para ouvir, busca por trecho |
| `membros.js` | Lista, aniversariantes, ficha (só dirigentes editam; função só dirigente define) |
| `financeiro.js` | Lançamentos com comprovante (só dirigentes); membros veem só o resumo |
| `relatorio.js` | `gerarRelatorio` (financeiro) e `gerarRelatorioEstudos` (jsPDF) |
| `mais.js` | Perfil, Meus dados, instalar, 🔔 Notificações, liberar acessos (admin), 🔄 Atualizar app, versão |
| `push.js` | Inscrição Web Push (VAPID), antecedência e teste |
| `sw.js` | Cache (`VERSAO = "fec-vN"`), push e notificationclick (postMessage para a aba) |

Padrões de código:
- `ctx = { state, admin, db, atualizar, irPara, recarregarResumos }`.
- Cada aba exporta `render(el, ctx)`. Os redesenhos dentro de Estudos usam `ctx.atualizar()` por causa do seletor do topo.
- `db.ouvirTabela` faz a leitura completa, assina realtime e lê de novo com debounce de 200 ms. O resultado vai para `state.<tabela>`.

### Permissões (regras ficam no banco via RLS)
- **pendente/bloqueado:** não vê nada. **membro:** vê tudo, menos lançamentos e comprovantes. **admin** (Dirigente/Tesouraria): tudo.
- A primeira conta criada vira admin (trigger `novo_usuario`). As demais entram como pendente até a liberação em Mais.
- **Lições, Estudos (livros e registros), Biblioteca, Músicas, Comentários:** todo membro cria. O autor edita e exclui o que é seu, e o admin modera.
  - Exceção: **excluir um livro de Estudos** é só admin, porque apaga todos os resumos dele em cascata.
- **Curtidas:** só via RPC `curtir_estudo`. A trigger `protege_estudo` impede mexer em `curtidas` por update comum.
- **Membros:** cada pessoa edita a própria ficha (`perfil_id`), mas `funcao` e `perfil_id` só admin muda (trigger `protege_membro`).
- O responsável recusou separar Dirigente de Tesouraria "por enquanto".

### Banco: scripts SQL (todos já rodados até 2026-11-04)
Ordem: `supabase.sql` → `supabase-membros-v2.sql` → `supabase-licoes-v2.sql` → `supabase-push.sql` → `supabase-push-agendador.sql` → `supabase-estudos.sql` → `supabase-estudos-v2.sql` → `supabase-biblioteca.sql` → `supabase-musicas.sql`.

Tabelas:
- **Base:** `perfis`, `membros`, `eventos`, `licoes`, `lancamentos`, a view `resumos_mensais`.
- **Notificações:** `push_inscricoes`, `push_enviados`.
- **Estudos:** `livros`, `estudos`, `estudo_comentarios`.
- **Conteúdo:** `biblioteca`, `musicas`.

Storage: `comprovantes` (só admin) e `biblioteca` (membros leem e enviam; apaga o dono ou o admin).

Regras para SQL novo:
- Todo script deve poder rodar de novo: `if not exists`, `drop policy if exists`, `create or replace`.
- Adicione a tabela nova à publicação `supabase_realtime`.
- Depois que o responsável disser "feito", confira via REST com a anon key. Esperado: `HTTP 200 []` sem login, e insert anônimo recusado com 42501.

### Notificações push
- **Fluxo:** a Edge Function `lembretes` (Deno, `npm:web-push@3.6.7`) lê `lembretes_pendentes()`, envia e registra em `push_enviados`. As inscrições que respondem 404/410 são apagadas.
- **Quem chama a função:**
  - o pg_cron `fec-lembretes`, a cada 5 min;
  - os gatilhos `avisar_estudo` e `avisar_comentario` (pg_net), para o envio sair na hora;
  - o app com `{teste:true}`, que manda o aviso só para quem pediu.
- **Tipos de aviso** (prefixo da chave):
  - `E:` encontro, X minutos antes;
  - `L:` prazo de lição, às 8h;
  - `S:` novo estudo, vai para todos menos o autor;
  - `C:` comentário, vai para o autor do resumo.
- **Secrets no Supabase:** `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. A chave pública também está em `js/supabase-config.js`.
- **iPhone:** só funciona com o app instalado na Tela de Início (iOS 16.4+).

### Segurança (obrigatório)
- **Nunca** colocar a chave `service_role`/secret no app.
- **Nunca** escrever a chave privada VAPID em código, commit ou chat. Ela fica só nos Secrets do Supabase. O responsável guarda uma cópia.
- A anon key é pública por natureza: fica no app e no SQL do agendador.
- Escape todo texto de usuário com `esc()` antes de colocar no HTML. Links digitados precisam começar com `http(s)://`.

---

## 4. Como publicar uma mudança no app
1. Edite os arquivos e confira a sintaxe: `npx -y esbuild app/js/<arquivo>.js --format=esm --log-level=error > /dev/null`.
2. Se criar um arquivo JS novo, coloque-o na lista `BASE` de `sw.js`.
3. **Suba a versão:** `VERSAO` em `sw.js` (`fec-vN`) **e** o texto `app vX.Y` em `mais.js`. Hoje estão em `fec-v11` e v1.6.
4. Commit em português e `git push` (o Pages publica em 1 a 3 minutos).
5. Avise o responsável. No iPhone, basta tocar em **Mais → 🔄 Atualizar app**. O app também recarrega sozinho quando o SW novo assume.
6. Se precisar de SQL, crie `app/supabase-<assunto>.sql` e peça para o responsável rodar.

Observação: Python não está instalado. Use `node` para scripts. No Git Bash, heredoc com aspas simples dentro de `node -e '...'` quebra, então grave o script num arquivo `.cjs` temporário.

---

## 5. Pendências
- [ ] Site: endereço, mapa, dias das giras, URL do Apps Script da planilha de doações.
- [ ] E-mail: configurar o SMTP do Gmail (`app/supabase-emails.md`) ou confirmar que "Confirm email" está desligado.
- [ ] Apagar as Edge Functions que sobraram: `quick-api` e `quick-handler`.
- [ ] Testar no celular o relatório PDF de Estudos e o envio e leitura de PDF da Biblioteca.
- Ideias oferecidas e ainda não pedidas: impedir curtir o próprio resumo; caderno de músicas em PDF.

## 6. Histórico resumido
- **2026-11-02:** site com 7 páginas e animação no hero; app PWA (Agenda com rodízio, Lições, Membros, Finanças com PDF); migração para Supabase e GitHub Pages; "Meus dados"; todos registram lições.
- **2026-11-03:** push funcionando (Edge Function, VAPID, cron); aba Estudos (livros, resumo do dia, presentes, relatório PDF); botão Atualizar app; curtidas e comentários; notificações de novo estudo e de comentário.
- **2026-11-04:** Biblioteca de PDFs (todos enviam, cada um gerencia o seu); repetir encontro todo ano; caderno de Músicas; lista da Agenda por semana ou mês.
