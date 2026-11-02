// Função "lembretes" (Supabase Edge Function)
// - Chamada a cada 5 min pelo agendador (pg_cron): envia os avisos que estão na hora.
// - Chamada pelo app com { teste: true }: envia uma notificação de teste para quem pediu.
//
// Segredos necessários (Edge Functions > Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(
  "https://4vmmodas-cpu.github.io/grupo-fe-esperanca-caridade/app/",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resposta = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Insc = { endpoint: string; p256dh: string; auth: string };

/* Envia; se o aparelho não existe mais (404/410), apaga a inscrição. */
async function enviar(s: Insc, msg: { titulo: string; corpo?: string; url?: string; tag?: string }) {
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify({ titulo: msg.titulo, corpo: msg.corpo ?? "", url: msg.url ?? "./", tag: msg.tag }),
      { TTL: 60 * 60, urgency: "high" },
    );
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await sb.from("push_inscricoes").delete().eq("endpoint", s.endpoint);
      return "removido";
    }
    console.error("Falha no envio", code, (e as Error).message);
    return "erro";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const corpo = await req.json().catch(() => ({}));

  // ---- Teste pedido pelo app: envia só para os aparelhos de quem chamou ----
  if (corpo?.teste) {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return resposta({ erro: "não autenticado" }, 401);
    const { data: subs } = await sb.from("push_inscricoes").select("endpoint,p256dh,auth").eq("user_id", user.id);
    if (!subs?.length) return resposta({ enviados: 0, aviso: "nenhum aparelho inscrito" });
    const r = await Promise.all(subs.map((s) => enviar(s, {
      titulo: "🔔 Notificações ativadas!",
      corpo: "Você vai receber os avisos das giras e estudos do grupo Fé, Esperança e Caridade.",
      tag: "teste",
    })));
    return resposta({ enviados: r.filter((x) => x === "ok").length, resultado: r });
  }

  // ---- Rodada do agendador ----
  const { data: pendentes, error } = await sb.rpc("lembretes_pendentes");
  if (error) return resposta({ erro: error.message }, 500);

  let ok = 0;
  for (const p of pendentes ?? []) {
    const r = await enviar(p, { titulo: p.titulo, corpo: p.corpo, url: p.url, tag: p.chave.split(":").slice(0, 2).join(":") });
    // marca como enviado mesmo se o aparelho sumiu, para não tentar de novo
    if (r !== "erro") await sb.from("push_enviados").upsert({ chave: p.chave });
    if (r === "ok") ok++;
  }
  // limpeza ocasional
  if (new Date().getUTCMinutes() < 5) await sb.rpc("limpar_push_enviados");
  return resposta({ pendentes: pendentes?.length ?? 0, enviados: ok });
});
