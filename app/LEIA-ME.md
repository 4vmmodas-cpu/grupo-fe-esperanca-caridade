# App – Fé, Esperança e Caridade

App de celular (PWA) para **agenda de giras e estudos**, **lições das entidades**, **membros** e **finanças** do grupo.
Instala direto pelo navegador, sem loja de aplicativos, e funciona em Android e iPhone.
Dados e login ficam no **Supabase** (plano grátis), e a hospedagem no **GitHub Pages**.

## O que tem
| Aba | Todos os membros | Dirigentes / Tesouraria |
|---|---|---|
| **Agenda** | Calendário, casa e endereço (com mapa), lembrete no celular, avisar no WhatsApp | Criar e editar encontros, repetir semanalmente com **rodízio de casas** |
| **Lições** | Ver as lições, marcar **✓ Fiz**, lembrete (pode repetir todo dia até o prazo) | Registrar: gira, entidade, lição, para quem e prazo |
| **Membros** | Lista com WhatsApp e aniversariantes do mês | Cadastrar e editar membros |
| **Finanças** | Resumo: entradas, saídas e saldo | Lançamentos com comprovante (foto/PDF) e **relatório em PDF** para o WhatsApp |
| **Mais** | Perfil, instalar app, trocar senha | **Liberar acessos** de quem se cadastrou |

---

## Passo 1 – Criar o banco no Supabase
1. Em https://supabase.com/dashboard, clique em **New project**. Nome: `fec-grupo`, região: **South America (São Paulo)**. Anote a senha do banco.
2. Quando o projeto estiver pronto, abra **SQL Editor** > **New query**, cole **todo** o arquivo `supabase.sql` e clique em **Run**. A mensagem esperada é "Success. No rows returned".
3. Em **Authentication** > **URL Configuration**:
   - **Site URL:** `https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/app/`
   - **Redirect URLs:** adicione a mesma URL e também `http://localhost:3000/**` (para os testes).
4. Em **Project Settings** > **API** (ou no botão **Connect**), copie a **Project URL** e a chave **anon / publishable**. Cole as duas em `js/supabase-config.js`.
   ⚠️ Nunca use a chave `service_role` / `secret` no app.

## Passo 2 – Primeiro acesso
- **A primeira conta criada vira dirigente automaticamente.** Faça o seu cadastro primeiro.
- O Supabase envia um e-mail de confirmação. Toque no link e depois entre com sua senha.
- As próximas pessoas ficam "aguardando" até você liberar na aba **Mais**, como **Membro** ou **Dirigente / Tesouraria**.

## Passo 3 – Testar no computador (opcional)
```
cd app
npx serve -l 3000 .
```
Abra http://localhost:3000.

## Publicação
O repositório no GitHub publica sozinho pelo GitHub Pages a cada atualização:
- **Site:** `https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/site/`
- **App:** `https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/app/`

**Instalar no celular:**
- Android (Chrome): menu ⋮ > *Instalar app*.
- iPhone (Safari): Compartilhar ⬆️ > *Adicionar à Tela de Início*.

---

## Lembretes
O botão **🔔 Lembrete** salva o encontro ou a lição na agenda do próprio celular, com o aviso escolhido (ex.: 2 horas antes). O celular avisa mesmo com o app fechado.
- **iPhone:** abre direto "Adicionar à Agenda".
- **Android:** abre o arquivo com o app de agenda, ou use **Abrir no Google Agenda**.

## Notificações push (aviso automático antes dos encontros)
Cada pessoa ativa em **Mais > 🔔 Notificações** e escolhe a antecedência: 30 min, 1 h, 2 h, 3 h ou 1 dia.
O Supabase confere a cada 5 minutos e envia o aviso, mesmo com o app fechado.
Lições **para todos** com prazo também avisam às 8h do dia do prazo, para quem ainda não marcou "Fiz".

**Configuração (uma vez só):**
1. **SQL Editor:** rode `supabase-push.sql`.
2. **Edge Functions** > *Deploy a new function* > *Via Editor*. Nome: **`lembretes`**. Cole o conteúdo de `supabase/functions/lembretes/index.ts` e clique em **Deploy**.
3. **Edge Functions** > **Secrets:** adicione `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. A chave pública está em `js/supabase-config.js`. A privada **nunca** vai para o código.
4. **SQL Editor:** rode `supabase-push-agendador.sql`.
5. No app: **Mais > Ativar notificações > Enviar teste**.

> No **iPhone** (iOS 16.4 ou mais novo), as notificações só funcionam com o app **instalado na tela inicial**.

## E-mail ("Esqueci minha senha")
Veja `supabase-emails.md`: envio pelo Gmail do grupo, grátis, com os textos em português.

## Segurança
- Quem não foi liberado não vê nada.
- Membros veem agenda, lições, membros e **apenas os totais** das finanças.
- Lançamentos e comprovantes ficam visíveis só para dirigentes e tesouraria. Os arquivos ficam privados no Supabase Storage.
- As regras ficam no próprio banco (RLS, no arquivo `supabase.sql`). Mesmo que alguém copie o código, não acessa os dados.

## Observação sobre o plano grátis
O Supabase **pausa projetos grátis depois de 7 dias sem nenhum acesso**. Com o uso semanal do grupo isso não deve acontecer. Se acontecer, basta clicar em **Restore** no painel, e nenhum dado se perde.
