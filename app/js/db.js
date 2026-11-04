/* Camada de dados: tudo que fala com o Supabase passa por aqui. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { supabaseConfig } from "./supabase-config.js";

export const configurado = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
export const sb = configurado
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

/* ---------- Conversão de nomes: anfitriaoId (app) <-> anfitriao_id (banco) ---------- */
const NULOS = new Set(["nascimento", "prazo", "anfitriaoId", "eventoId", "serieId", "hora", "bibliotecaId"]);
const snake = (k) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const camel = (k) => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function paraBanco(o) {
  const r = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    r[snake(k)] = v === "" && NULOS.has(k) ? null : v;
  }
  return r;
}
function doBanco(o) { const r = {}; for (const [k, v] of Object.entries(o)) r[camel(k)] = v; return r; }

function checar({ data, error }) {
  if (error) {
    const e = new Error(error.message);
    e.code = error.code === "42501" || /row-level security|permission|permiss/i.test(error.message) ? "permission-denied" : error.code || error.name;
    throw e;
  }
  return data;
}
const semPermissao = () => Object.assign(new Error("Sem permissão"), { code: "permission-denied" });
const urlApp = () => location.origin + location.pathname.replace(/index\.html$/, "");

/* ---------- Login ---------- */
export async function entrar(email, senha) { checar(await sb.auth.signInWithPassword({ email, password: senha })); }
/* extras (whatsapp, nascimento) vão junto com o cadastro e preenchem a ficha de Membro na liberação */
export async function cadastrar(nome, email, senha, extras = {}) {
  const d = checar(await sb.auth.signUp({ email, password: senha, options: { data: { nome, ...extras }, emailRedirectTo: urlApp() } }));
  return { precisaConfirmar: !d.session };
}
export async function recuperarSenha(email) { checar(await sb.auth.resetPasswordForEmail(email, { redirectTo: urlApp() })); }
export async function definirSenha(senha) { checar(await sb.auth.updateUser({ password: senha })); }
export async function sair() { await sb.auth.signOut(); }
/* cb(evento, usuario) — evento "PASSWORD_RECOVERY" quando a pessoa volta pelo link de nova senha */
export function aoMudarSessao(cb) {
  sb.auth.onAuthStateChange((evento, sessao) => setTimeout(() => cb(evento, sessao?.user || null), 0));
}

/* ---------- Leitura com atualização em tempo real ---------- */
let canalSeq = 0;
export function ouvirTabela(tabela, cb, { filtro } = {}) {
  let vivo = true, timer = null;
  const carregar = async () => {
    let q = sb.from(tabela).select("*");
    if (filtro) q = q.eq(filtro[0], filtro[1]);
    const { data, error } = await q;
    if (!vivo) return;
    if (error) return console.warn("Leitura de", tabela, error.message);
    cb(data.map(doBanco));
  };
  const agendar = () => { clearTimeout(timer); timer = setTimeout(carregar, 200); };
  carregar();
  const canal = sb.channel(`rt-${tabela}-${++canalSeq}`)
    .on("postgres_changes", { event: "*", schema: "public", table: tabela, ...(filtro ? { filter: `${filtro[0]}=eq.${filtro[1]}` } : {}) }, agendar)
    .subscribe();
  const aoVoltar = () => { if (document.visibilityState === "visible") agendar(); };
  document.addEventListener("visibilitychange", aoVoltar);
  return () => { vivo = false; clearTimeout(timer); sb.removeChannel(canal); document.removeEventListener("visibilitychange", aoVoltar); };
}

/* Totais por mês: { "2026-11": { entradas, saidas } } */
export async function carregarResumos() {
  const linhas = checar(await sb.from("resumos_mensais").select("*"));
  const r = {};
  linhas.forEach((l) => (r[l.mes] = { entradas: Number(l.entradas), saidas: Number(l.saidas) }));
  return r;
}

/* ---------- Gravação ---------- */
export async function inserir(tabela, dados) {
  const lista = (Array.isArray(dados) ? dados : [dados]).map(paraBanco);
  return checar(await sb.from(tabela).insert(lista).select()).map(doBanco);
}
export async function salvar(tabela, dados) {   // insere ou atualiza pelo id
  return checar(await sb.from(tabela).upsert(paraBanco(dados)).select()).map(doBanco)[0];
}
export async function atualizar(tabela, id, dados) {
  const r = checar(await sb.from(tabela).update(paraBanco(dados)).eq("id", id).select("id"));
  if (!r.length) throw semPermissao();
}
export async function excluir(tabela, ids) {
  const lista = [].concat(ids);
  if (!lista.length) return;
  const r = checar(await sb.from(tabela).delete().in("id", lista).select("id"));
  if (!r.length) throw semPermissao();
}
export async function curtirEstudo(id, curtir) { checar(await sb.rpc("curtir_estudo", { p_id: id, p_curtir: curtir })); }
export async function marcarLicao(id, feito) { checar(await sb.rpc("marcar_licao", { p_id: id, p_feito: feito })); }

/* ---------- Comprovantes (arquivos privados) ---------- */
const BUCKET = "comprovantes";
export async function enviarComprovante(lancId, blob, nome) {
  const limpo = nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-60);
  const caminho = `${lancId}/${Date.now()}-${limpo}`;
  checar(await sb.storage.from(BUCKET).upload(caminho, blob, { contentType: blob.type, upsert: true }));
  return caminho;
}
export async function removerComprovante(caminho) { if (caminho) await sb.storage.from(BUCKET).remove([caminho]); }
export async function baixarComprovante(caminho) { return checar(await sb.storage.from(BUCKET).download(caminho)); }

/* ---------- Biblioteca (PDFs privados; só membros liberados abrem) ---------- */
const BIBLIO = "biblioteca";
/* Envia com barra de progresso: aoProgresso(0..1) */
export async function enviarPDF(caminho, arquivo, aoProgresso) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw semPermissao();
  const url = `${supabaseConfig.url}/storage/v1/object/${BIBLIO}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
  await new Promise((ok, falha) => {
    const x = new XMLHttpRequest();
    x.open("POST", url);
    x.setRequestHeader("Authorization", "Bearer " + session.access_token);
    x.setRequestHeader("apikey", supabaseConfig.anonKey);
    x.setRequestHeader("x-upsert", "false");
    x.setRequestHeader("Content-Type", "application/pdf");
    x.upload.onprogress = (e) => e.lengthComputable && aoProgresso?.(e.loaded / e.total);
    x.onload = () => {
      if (x.status < 300) return ok();
      let msg = x.responseText;
      try { msg = JSON.parse(x.responseText).message || msg; } catch {}
      const e = new Error(msg);
      if (x.status === 413 || /exceeded|too large|maximum allowed size/i.test(msg)) e.code = "grande-demais";
      else if (x.status === 401 || x.status === 403 || /row-level|policy|unauthorized/i.test(msg)) e.code = "permission-denied";
      falha(e);
    };
    x.onerror = () => falha(Object.assign(new Error("Falha de rede"), { code: "rede" }));
    x.send(arquivo);
  });
  return caminho;
}
export async function removerPDF(caminho) { if (caminho) await sb.storage.from(BIBLIO).remove([caminho]); }
/* Links temporários (1 hora) para ler; o de baixar ganha "&download=nome.pdf" */
export async function linksPDF(caminhos) {
  if (!caminhos.length) return {};
  const lista = checar(await sb.storage.from(BIBLIO).createSignedUrls(caminhos, 3600));
  const r = {};
  lista.forEach((l) => { if (l.signedUrl) r[l.path] = l.signedUrl; });
  return r;
}
