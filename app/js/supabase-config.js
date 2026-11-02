/* Dados do projeto Supabase (veja LEIA-ME.md, passo 1).
   - url:     Project URL
   - anonKey: chave "anon" / "publishable" — é pública, pode ficar no código
              (a segurança está nas regras do banco: supabase.sql).
   NUNCA cole aqui a chave "service_role" / "secret". */
export const supabaseConfig = {
  url: "https://bbkwxuczioronhwggnep.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJia3d4dWN6aW9yb25od2dnbmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDgzNjIsImV4cCI6MjEwOTIyNDM2Mn0.s3YX-hfVzHdYUMGjQrDkf7UMHuxdMCQkmIdY_dDv2zM",
  // Chave PÚBLICA das notificações push (a privada fica só nos Secrets do Supabase)
  vapidPublicKey: "BBUcd6aWzIKA5dVqRwI_r8NrocC-KF8G8auDHrS1tyo7ODF6jSZOu42ffy_LaobTzvUWbgwxhAq4pvZOCUD5FAg"
};
