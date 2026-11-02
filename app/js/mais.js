import { esc, iniciais, toast, abrirModal, salvando, confirmar } from "./ui.js";

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
