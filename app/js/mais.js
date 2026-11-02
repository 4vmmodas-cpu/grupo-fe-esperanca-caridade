import { esc, iniciais, toast, abrirModal, salvando, confirmar } from "./ui.js";
import * as push from "./push.js";

/* Cartão de notificações (carrega o estado deste aparelho) */
async function cartaoPush(box) {
  const corpo = box.querySelector(".push-corpo");
  const s = push.suporte();
  if (s === "instalar-ios") { corpo.innerHTML = `<p>No iPhone, as notificações funcionam com o app <b>instalado na tela inicial</b>: no Safari, toque em Compartilhar ⬆️ e em <b>Adicionar à Tela de Início</b>. Depois abra o app por lá e volte aqui.</p>`; return; }
  if (s === "negado") { corpo.innerHTML = `<p>As notificações foram <b>bloqueadas</b> neste aparelho. Para liberar, abra as configurações do navegador/celular > Notificações > permita para este app, e recarregue.</p>`; return; }
  if (s !== "ok") { corpo.innerHTML = `<p class="suave">Este navegador não aceita notificações. Use o botão 🔔 Lembrete nos encontros para salvar na agenda do celular.</p>`; return; }

  let est;
  try { est = await push.estado(); } catch { est = { ativo: false }; }
  const opcoes = (sel) => push.ANTECEDENCIAS.map(([v, t]) => `<option value="${v}"${v === sel ? " selected" : ""}>${t}</option>`).join("");
  corpo.innerHTML = est.ativo ? `
      <p class="ok-push">✅ Ativadas neste aparelho</p>
      <label>Avisar sobre giras e estudos<select data-antes>${opcoes(est.antecedencia)}</select></label>
      <p class="suave dica">Lições "para todos" com prazo também avisam às 8h do dia do prazo.</p>
      <div class="acoes-form"><button class="btn btn-claro" data-desativar>Desativar</button><button class="btn btn-primario" data-testar>Enviar teste</button></div>`
    : `<p>Receba um aviso no celular antes de cada gira e estudo, mesmo com o app fechado.</p>
      <label>Avisar<select data-antes>${opcoes(120)}</select></label>
      <button class="btn btn-primario btn-largo" data-ativar>Ativar notificações</button>`;

  corpo.querySelector("[data-ativar]")?.addEventListener("click", async (e) => {
    e.target.disabled = true; e.target.textContent = "Ativando...";
    try { await push.ativar(Number(corpo.querySelector("[data-antes]").value)); toast("Notificações ativadas!"); }
    catch (err) { console.error(err); toast(err.code === "negado" ? "Você não permitiu as notificações." : "Não foi possível ativar.", "erro"); }
    cartaoPush(box);
  });
  corpo.querySelector("[data-desativar]")?.addEventListener("click", async () => {
    try { await push.desativar(); toast("Notificações desativadas."); } catch { toast("Não foi possível desativar.", "erro"); }
    cartaoPush(box);
  });
  if (est.ativo) corpo.querySelector("[data-antes]").addEventListener("change", async (e) => {
    try { await push.mudarAntecedencia(Number(e.target.value)); toast("Preferência salva."); } catch { toast("Não foi possível salvar.", "erro"); }
  });
  corpo.querySelector("[data-testar]")?.addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const r = await push.testar();
      toast(r?.enviados ? "Teste enviado! Deve chegar em instantes." : "Nenhum aparelho recebeu. Desative e ative de novo.", r?.enviados ? "ok" : "erro");
    } catch (err) { console.error(err); toast("O servidor de avisos ainda não está configurado.", "erro"); }
    e.target.disabled = false;
  });
}

const PAPEIS = { pendente: "Aguardando", membro: "Membro", admin: "Dirigente / Tesouraria", bloqueado: "Bloqueado" };

export function render(el, ctx) {
  const { state, admin, db } = ctx;
  const p = state.perfil;
  const pendentes = state.usuarios.filter((u) => u.papel === "pendente");
  const instalado = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  el.innerHTML = `
    <section class="cartao perfil">
      <span class="avatar grande">${esc(iniciais(p.nome))}</span>
      <div><h2>${esc(p.nome)}</h2><p class="suave">${esc(p.email)} · ${PAPEIS[p.papel]}</p></div>
      <button class="btn btn-claro btn-peq" data-editar-nome>Editar</button>
    </section>

    ${instalado ? "" : `<section class="cartao">
      <h2>📲 Instalar no celular</h2>
      ${window.__instalar ? `<p>Coloque o app na tela inicial para abrir com um toque.</p><button class="btn btn-primario" data-instalar>Instalar app</button>`
        : ios ? `<p>No iPhone: toque em <b>Compartilhar</b> <span aria-hidden="true">⬆️</span> no Safari e depois em <b>Adicionar à Tela de Início</b>.</p>`
        : `<p>No menu do navegador (⋮), toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>`}
    </section>`}

    <section class="cartao" id="cartao-push"><h2>🔔 Notificações</h2><div class="push-corpo"><div class="carregando"></div></div></section>

    ${admin ? `<section class="cartao">
      <h2>Acessos ao app ${pendentes.length ? `<span class="selo-num">${pendentes.length} novo(s)</span>` : ""}</h2>
      <p class="suave">Libere quem se cadastrou e defina quem pode editar a agenda, membros e finanças.</p>
      <div class="lista-usuarios">${state.usuarios.map((u) => `
        <div class="usuario ${u.papel === "pendente" ? "pend" : ""}">
          <span class="avatar">${esc(iniciais(u.nome))}</span>
          <div class="usuario-info"><b>${esc(u.nome)}</b><span class="suave">${esc(u.email)}</span></div>
          ${u.id === p.id ? `<span class="suave">você</span>` : `<select data-papel="${u.id}" aria-label="Acesso de ${esc(u.nome)}">
            ${Object.entries(PAPEIS).map(([v, t]) => `<option value="${v}"${u.papel === v ? " selected" : ""}>${t}</option>`).join("")}</select>`}
        </div>`).join("")}</div>
    </section>` : ""}

    <section class="cartao">
      <button class="btn btn-claro btn-largo" data-senha>Trocar senha</button>
      <button class="btn btn-perigo-claro btn-largo" data-sair>Sair</button>
    </section>
    <p class="centro suave rodape-app">Fé, Esperança e Caridade · app v1.0</p>`;

  cartaoPush(el.querySelector("#cartao-push"));
  el.querySelector("[data-sair]").onclick = async () => { if (await confirmar("Sair do app?", "Sair")) db.sair(); };
  el.querySelector("[data-senha]").onclick = async () => {
    try { await db.recuperarSenha(p.email); toast("Enviamos um link para trocar a senha no seu e-mail."); }
    catch { toast("Não foi possível enviar o e-mail.", "erro"); }
  };
  el.querySelector("[data-instalar]")?.addEventListener("click", async () => {
    window.__instalar.prompt(); await window.__instalar.userChoice; window.__instalar = null; render(el, ctx);
  });
  el.querySelector("[data-editar-nome]").onclick = () => {
    const { el: m, fechar } = abrirModal("Seu nome", `<form class="form"><label>Nome completo<input name="nome" value="${esc(p.nome)}"></label>
      <div class="acoes-form"><button class="btn btn-primario" type="submit">Salvar</button></div></form>`);
    const f = m.querySelector("form");
    f.onsubmit = async (e) => {
      e.preventDefault();
      const nome = f.nome.value.trim(); if (nome.length < 3) return toast("Informe seu nome.", "erro");
      if (await salvando(f.querySelector("[type=submit]"), () => db.atualizar("perfis", p.id, { nome }))) { fechar(); toast("Nome atualizado!"); }
    };
  };
  el.querySelectorAll("[data-papel]").forEach((s) => s.addEventListener("change", async () => {
    const u = state.usuarios.find((x) => x.id === s.dataset.papel);
    try { await db.atualizar("perfis", u.id, { papel: s.value }); toast(`${u.nome.split(" ")[0]}: ${PAPEIS[s.value]}`); }
    catch { toast("Sem permissão para alterar.", "erro"); s.value = u.papel; }
  }));
}
