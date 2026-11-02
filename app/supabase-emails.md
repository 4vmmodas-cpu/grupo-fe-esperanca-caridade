# E-mails do app (Supabase + Gmail)

O e-mail padrão do Supabase só entrega para a equipe do projeto. Para o **"Esqueci minha senha"** funcionar para todos os membros, ligamos o envio pelo Gmail do grupo. É grátis, até 500 e-mails por dia.

## 1. Criar a "senha de app" no Gmail
1. Use a conta Gmail que vai enviar os e-mails (de preferência uma do grupo).
2. Ative a **Verificação em duas etapas**: https://myaccount.google.com/signinoptions/two-step-verification
3. Crie uma **senha de app**: https://myaccount.google.com/apppasswords
   Nome: `App FEC`. O Google mostra 16 letras (ex.: `abcd efgh ijkl mnop`). Copie **sem os espaços**.

## 2. Configurar no Supabase
https://supabase.com/dashboard/project/bbkwxuczioronhwggnep/auth/smtp

Ligue **Enable custom SMTP** e preencha:

| Campo | Valor |
|---|---|
| Sender email | o Gmail do passo 1 |
| Sender name | `Fé, Esperança e Caridade` |
| Host | `smtp.gmail.com` |
| Port number | `465` |
| Username | o Gmail do passo 1 |
| Password | a senha de app (16 letras, sem espaços) |

Clique em **Save**.

## 3. Textos em português
https://supabase.com/dashboard/project/bbkwxuczioronhwggnep/auth/templates

### Reset Password (redefinir senha)
**Subject:** `Redefinir sua senha – Fé, Esperança e Caridade`

**Body:**
```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
  <h2 style="color:#c1272d">Fé, Esperança e Caridade</h2>
  <p>Olá! Recebemos um pedido para criar uma nova senha no app do grupo.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#c1272d;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
  <p style="color:#666;font-size:13px">Se não foi você, pode ignorar este e-mail. Sua senha atual continua valendo.</p>
  <p>Axé! 🙏</p>
</div>
```

### Confirm signup (só se um dia religar a confirmação de e-mail)
**Subject:** `Confirme seu cadastro – Fé, Esperança e Caridade`

**Body:**
```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
  <h2 style="color:#c1272d">Fé, Esperança e Caridade</h2>
  <p>Seja bem-vindo(a) ao app do grupo!</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#c1272d;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p>
  <p style="color:#666;font-size:13px">Depois da confirmação, um dirigente libera seu acesso.</p>
</div>
```

## 4. Testar
No app, saia da conta e toque em **Esqueci minha senha** com o seu e-mail. O e-mail deve chegar em até 1 minuto (confira o spam). O link abre o app na tela **Nova senha**.
