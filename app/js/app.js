import * as db from "./db.js";
import { esc, toast, GRUPO, mascaraTelefone, soDigitos } from "./ui.js";
import * as agenda from "./agenda.js";
import * as membros from "./membros.js";
import * as financeiro from "./financeiro.js";
import * as mais from "./mais.js";
import * as licoes from "./licoes.js";
import * as estudos from "./estudos.js";

const raiz = document.getElementById("app");
const VIEWS = { agenda, licoes, estudos, membros, financeiro, mais };
const ABAS = [
  ["agenda", "Agenda", '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>'],
  ["licoes", "Lições", '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM9 7h7M9 11h5"/>'],
  ["estudos", "Estudos", '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>'],
  ["membros", "Membros", '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'],
  ["financeiro", "Finanças", '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'],
  ["mais", "Mais", '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>']
];

export const state = {
  user: undefined,          // undefined = carregando, null = deslogado
  perfil: null,
  membros: [], eventos: [], licoes: [], livros: [], estudos: [], lancamentos: [], resumos: {}, usuarios: [],
  aba: lerAba()
};
let assinaturas = [];
let recuperandoSenha = false;

function lerAba() { try { return localStorage.getItem("aba") || "agenda"; } catch { return "agenda"; } }
function gravarAba(a) { try { localStorage.setItem("aba", a); } catch {} }
const ehAdmin = () => state.perfil?.papel === "admin";
const ctx = () => ({ state, admin: ehAdmin(), db, atualizar: renderView, irPara, recarregarResumos });
function irPara(aba) { state.aba = aba; gravarAba(aba); window.scrollTo(0, 0); renderView(); }

/* ================= Telas ================= */
function render() {
  if (!db.configurado) return telaConfig();
  if (recuperandoSenha) return telaNovaSenha();
  if (state.user === undefined || (state.user && !state.perfil)) return telaCarregando();
  if (!state.user) return telaLogin();
  if (!["membro", "admin"].includes(state.perfil.papel)) return telaPendente();
  telaApp();
}

function telaCarregando() {
  raiz.innerHTML = `<div class="tela-centro"><img src="assets/logo.jpg" alt="" class="logo-splash"><div class="carregando"></div></div>`;
}

function telaConfig() {
  raiz.innerHTML = `<div class="tela-centro"><div class="cartao-login">
    <img src="assets/logo.jpg" alt="" class="logo-login"><h1>Quase lá!</h1>
    <p>O app ainda não está ligado ao Supabase. Siga o passo 1 do arquivo <b>LEIA-ME.md</b> e cole a URL e a chave em <code>js/supabase-config.js</code>.</p></div></div>`;
}

function cartaoMensagem(titulo, texto, botao = "Voltar ao login") {
  raiz.innerHTML = `<div class="tela-centro"><div class="cartao-login">
    <img src="assets/logo.jpg" alt="" class="logo-login"><h1>${titulo}</h1><p>${texto}</p>
    <button class="btn btn-claro btn-largo" data-voltar>${botao}</button></div></div>`;
  raiz.querySelector("[data-voltar]").onclick = () => telaLogin();
}

function telaLogin(modo = "entrar") {
  const cadastro = modo === "cadastro";
  raiz.innerHTML = `<div class="tela-centro"><form class="cartao-login" novalidate>
    <img src="assets/logo.jpg" alt="Logo ${esc(GRUPO)}" class="logo-login">
    <h1>${cadastro ? "Criar conta" : "Bem-vindo(a)"}</h1>
    <p class="suave">${cadastro ? "Depois do cadastro, um dirigente libera seu acesso." : "Agenda, lições, membros e finanças do grupo."}</p>
    ${cadastro ? `<label>Nome completo<input name="nome" autocomplete="name" required></label>
    <label>WhatsApp<input name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999" required></label>
    <label>Data de nascimento<input name="nascimento" type="date" autocomplete="bday"></label>` : ""}
    <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
    <label>Senha<input name="senha" type="password" autocomplete="${cadastro ? "new-password" : "current-password"}" minlength="6" required></label>
    <p class="erro-form" hidden></p>
    <button class="btn btn-primario btn-largo" type="submit">${cadastro ? "Cadastrar" : "Entrar"}</button>
    ${cadastro ? "" : `<button class="link" type="button" data-acao="esqueci">Esqueci minha senha</button>`}
    <p class="troca">${cadastro ? "Já tem conta?" : "Ainda não tem conta?"} <button class="link" type="button" data-acao="trocar">${cadastro ? "Entrar" : "Criar conta"}</button></p>
  </form></div>`;
  const form = raiz.querySelector("form"), erro = form.querySelector(".erro-form");
  const mostraErro = (m) => { erro.textContent = m; erro.hidden = false; };
  form.querySelector("[data-acao=trocar]").onclick = () => telaLogin(cadastro ? "entrar" : "cadastro");
  if (cadastro) mascaraTelefone(form.whatsapp);
  form.querySelector("[data-acao=esqueci]")?.addEventListener("click", async () => {
    const email = form.email.value.trim();
    if (!email) return mostraErro("Digite seu e-mail acima e toque de novo em “Esqueci minha senha”.");
    try { await db.recuperarSenha(email); cartaoMensagem("Confira seu e-mail", `Se houver uma conta para <b>${esc(email)}</b>, enviamos um link para criar uma nova senha.`); }
    catch (e) { mostraErro(traduzErro(e)); }
  });
  form.onsubmit = async (ev) => {
    ev.preventDefault(); erro.hidden = true;
    const email = form.email.value.trim(), senha = form.senha.value;
    if (cadastro && form.nome.value.trim().length < 3) return mostraErro("Informe seu nome completo.");
    if (cadastro && soDigitos(form.whatsapp.value).length < 10) return mostraErro("Informe o WhatsApp com DDD.");
    if (!email || !senha) return mostraErro("Preencha e-mail e senha.");
    if (senha.length < 6) return mostraErro("A senha precisa ter pelo menos 6 caracteres.");
    const btn = form.querySelector("[type=submit]"); btn.disabled = true;
    try {
      if (cadastro) {
        const r = await db.cadastrar(form.nome.value.trim(), email, senha,
          { whatsapp: form.whatsapp.value.trim(), nascimento: form.nascimento.value });
        if (r.precisaConfirmar) cartaoMensagem("Confirme seu e-mail 📩", `Enviamos um link de confirmação para <b>${esc(email)}</b>. Abra o e-mail, toque no link e depois entre com sua senha.`);
      } else {
        await db.entrar(email, senha);
      }
    } catch (e) { mostraErro(traduzErro(e)); btn.disabled = false; }
  };
}

function telaNovaSenha() {
  raiz.innerHTML = `<div class="tela-centro"><form class="cartao-login" novalidate>
    <img src="assets/logo.jpg" alt="" class="logo-login"><h1>Nova senha</h1>
    <label>Nova senha<input name="senha" type="password" autocomplete="new-password" minlength="6" required></label>
    <p class="erro-form" hidden></p>
    <button class="btn btn-primario btn-largo" type="submit">Salvar senha</button></form></div>`;
  const form = raiz.querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const erro = form.querySelector(".erro-form");
    if (form.senha.value.length < 6) { erro.textContent = "Use pelo menos 6 caracteres."; erro.hidden = false; return; }
    try { await db.definirSenha(form.senha.value); recuperandoSenha = false; toast("Senha atualizada!"); render(); }
    catch (err) { erro.textContent = traduzErro(err); erro.hidden = false; }
  };
}

function telaPendente() {
  const bloqueado = state.perfil.papel === "bloqueado";
  raiz.innerHTML = `<div class="tela-centro"><div class="cartao-login">
    <img src="assets/logo.jpg" alt="" class="logo-login">
    <h1>${bloqueado ? "Acesso suspenso" : "Cadastro recebido!"}</h1>
    <p>${bloqueado ? "Seu acesso foi suspenso. Fale com a dirigência do grupo." : `Olá, ${esc(state.perfil.nome.split(" ")[0])}! Seu acesso está aguardando liberação de um dirigente. Assim que for aprovado, esta tela muda sozinha.`}</p>
    <button class="btn btn-claro btn-largo" data-sair>Sair</button></div></div>`;
  raiz.querySelector("[data-sair]").onclick = () => db.sair();
}

function telaApp() {
  if (!raiz.querySelector(".app-shell")) {
    raiz.innerHTML = `<div class="app-shell">
      <header class="barra-topo"><img src="assets/emblema.svg" alt="" width="30" height="27"><span>${esc(GRUPO)}</span></header>
      <main id="view" class="view"></main>
      <nav class="abas">${ABAS.map(([id, nome, svg]) => `<button data-aba="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg><span>${nome}</span><i class="selo-aba" hidden></i></button>`).join("")}</nav>
    </div>`;
    raiz.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => {
      if (state.aba !== b.dataset.aba) irPara(b.dataset.aba);
    }));
  }
  renderView();
}

function renderView() {
  const view = document.getElementById("view");
  if (!view) return;
  if (!VIEWS[state.aba]) state.aba = "agenda";
  raiz.querySelectorAll("[data-aba]").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === state.aba));
  const pend = ehAdmin() ? state.usuarios.filter((u) => u.papel === "pendente").length : 0;
  const faltaDados = mais.dadosFaltando(state).length > 0;
  const selo = raiz.querySelector('[data-aba=mais] .selo-aba');
  if (selo) { selo.hidden = !pend && !faltaDados; selo.textContent = pend || "!"; }
  const minhas = state.licoes.filter((l) => !(l.concluidas || []).includes(state.user.id)).length;
  const seloL = raiz.querySelector('[data-aba=licoes] .selo-aba');
  if (seloL) { seloL.hidden = !minhas; seloL.textContent = minhas; }
  VIEWS[state.aba].render(view, ctx());
}

/* ================= Dados em tempo real ================= */
function ouvir(tabela, destino, ordenar, extra) {
  return db.ouvirTabela(tabela, (lista) => {
    if (ordenar) lista.sort(ordenar);
    state[destino] = lista;
    extra?.();
    renderView();
  });
}
async function recarregarResumos() {
  try { state.resumos = await db.carregarResumos(); renderView(); } catch (e) { console.warn("resumos", e.message); }
}

function iniciarDados() {
  pararDados();
  const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");
  assinaturas.push(ouvir("membros", "membros", porNome));
  assinaturas.push(ouvir("eventos", "eventos", (a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || ""))));
  assinaturas.push(ouvir("licoes", "licoes", (a, b) => b.data.localeCompare(a.data)));
  assinaturas.push(ouvir("livros", "livros"));
  assinaturas.push(ouvir("estudos", "estudos"));
  recarregarResumos();
  const aoVoltar = () => document.visibilityState === "visible" && recarregarResumos();
  document.addEventListener("visibilitychange", aoVoltar);
  assinaturas.push(() => document.removeEventListener("visibilitychange", aoVoltar));
  if (ehAdmin()) {
    assinaturas.push(ouvir("lancamentos", "lancamentos", (a, b) => b.data.localeCompare(a.data), recarregarResumos));
    assinaturas.push(ouvir("perfis", "usuarios", porNome));
  }
}
function pararDados() {
  assinaturas.forEach((u) => u()); assinaturas = [];
  Object.assign(state, { membros: [], eventos: [], licoes: [], livros: [], estudos: [], lancamentos: [], resumos: {}, usuarios: [] });
}

let pararPerfil = null, papelAtual = null, uidAtual = null;
function iniciar() {
  if (!db.configurado) return render();
  render();
  db.aoMudarSessao((evento, user) => {
    if (evento === "PASSWORD_RECOVERY") { recuperandoSenha = true; }
    const novoUid = user?.id || null;
    if (novoUid === uidAtual && state.user !== undefined) { state.user = user; return render(); }
    uidAtual = novoUid;
    pararPerfil?.(); pararPerfil = null; pararDados();
    state.user = user; state.perfil = null; papelAtual = null;
    raiz.innerHTML = "";
    if (!user) return render();
    render();
    pararPerfil = db.ouvirTabela("perfis", (linhas) => {
      state.perfil = linhas[0] || { id: user.id, nome: user.user_metadata?.nome || user.email, email: user.email, papel: "pendente" };
      if (state.perfil.papel !== papelAtual) {
        papelAtual = state.perfil.papel;
        raiz.innerHTML = "";
        if (["membro", "admin"].includes(papelAtual)) iniciarDados(); else pararDados();
      }
      render();
    }, { filtro: ["id", user.id] });
  });
}

function traduzErro(e) {
  const m = String(e.message || "");
  if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered|already been registered/i.test(m)) return "Este e-mail já tem cadastro. Toque em “Entrar”.";
  if (/password should be at least|weak/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/invalid.*email|unable to validate email/i.test(m)) return "E-mail inválido.";
  if (/rate limit|too many/i.test(m)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/failed to fetch|network/i.test(m)) return "Sem conexão com a internet.";
  if (/same password|different from the old/i.test(m)) return "A nova senha precisa ser diferente da anterior.";
  return "Algo deu errado. Tente novamente.";
}

/* ================= PWA ================= */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const jaTinha = Boolean(navigator.serviceWorker.controller);
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // Versão nova publicada: recarrega sozinho para mostrar as novidades
  let recarregou = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (jaTinha && !recarregou) { recarregou = true; location.reload(); }
  });
  // Ao voltar para o app, confere se há versão nova
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  });
}
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.__instalar = e; });

iniciar();
