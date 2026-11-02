/* Notificações push: ativar, desativar e testar neste aparelho. */
import { sb } from "./db.js";
import { supabaseConfig } from "./supabase-config.js";

export const ANTECEDENCIAS = [[30, "30 minutos antes"], [60, "1 hora antes"], [120, "2 horas antes"], [180, "3 horas antes"], [1440, "1 dia antes"]];

const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

/* "ok" | "sem-suporte" | "instalar-ios" (iPhone só recebe com o app na tela inicial) | "negado" */
export function suporte() {
  if (!("serviceWorker" in navigator) || !supabaseConfig.vapidPublicKey) return "sem-suporte";
  if (ios && !instalado()) return "instalar-ios";
  if (!("PushManager" in window) || !("Notification" in window)) return "sem-suporte";
  if (Notification.permission === "denied") return "negado";
  return "ok";
}

async function registro() { return navigator.serviceWorker.ready; }

/* Retorna { ativo, antecedencia } deste aparelho */
export async function estado() {
  if (suporte() !== "ok") return { ativo: false };
  const sub = await (await registro()).pushManager.getSubscription();
  if (!sub) return { ativo: false };
  const { data } = await sb.from("push_inscricoes").select("antecedencia").eq("endpoint", sub.endpoint).maybeSingle();
  if (!data) return { ativo: false, orfa: true };
  return { ativo: true, antecedencia: data.antecedencia };
}

function chaveBytes(base64) {
  const p = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/* Precisa ser chamado a partir de um toque do usuário (exigência dos navegadores) */
export async function ativar(antecedencia = 120) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw Object.assign(new Error("permissão negada"), { code: "negado" });
  const reg = await registro();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(supabaseConfig.vapidPublicKey) });
  const j = sub.toJSON();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("push_inscricoes").upsert({
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: user.id,
    antecedencia, aparelho: navigator.userAgent.slice(0, 180)
  });
  if (error) throw error;
}

export async function mudarAntecedencia(antecedencia) {
  const sub = await (await registro()).pushManager.getSubscription();
  if (!sub) return;
  const { error } = await sb.from("push_inscricoes").update({ antecedencia }).eq("endpoint", sub.endpoint);
  if (error) throw error;
}

export async function desativar() {
  const sub = await (await registro()).pushManager.getSubscription();
  if (!sub) return;
  await sb.from("push_inscricoes").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function testar() {
  const { data, error } = await sb.functions.invoke("lembretes", { body: { teste: true } });
  if (error) throw error;
  return data;
}
