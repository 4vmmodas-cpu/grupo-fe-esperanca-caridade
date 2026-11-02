import {
  esc, MESES, MESES_CURTOS, DIAS, pad, iso, deISO, hojeISO, somaDias, dataLonga,
  linkMapa, abrirModal, confirmar, toast, salvando, abrirLembrete
} from "./ui.js";
import { novaLicao } from "./licoes.js";
import { suporte } from "./push.js";

/* Converte um encontro para o formato de lembrete */
const paraLembrete = (e) => ({
  id: e.id, titulo: `${e.titulo || e.tipo} – FEC`, data: e.data, hora: e.hora || "19:30", duracao: 150,
  local: e.local || "", descricao: [e.anfitriaoNome ? "Casa de " + e.anfitriaoNome : "", e.obs].filter(Boolean).join("\n")
});

const TIPOS = ["Gira", "Estudo", "Reunião", "Outro"];
const classeTipo = (t) => "tipo-" + (t || "Outro").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let mesVisto = null;   // Date do 1º dia do mês exibido
let diaSel = null;     // "AAAA-MM-DD" ou null

export function render(el, ctx) {
  const { state, admin } = ctx;
  if (!mesVisto) { const d = new Date(); mesVisto = new Date(d.getFullYear(), d.getMonth(), 1); }
  const ano = mesVisto.getFullYear(), m = mesVisto.getMonth(), hoje = hojeISO();

  const porDia = {};
  state.eventos.forEach((e) => (porDia[e.data] ||= []).push(e));

  let cels = "";
  for (let i = 0; i < mesVisto.getDay(); i++) cels += `<span class="dia vazio"></span>`;
  const total = new Date(ano, m + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const id = `${ano}-${pad(m + 1)}-${pad(d)}`, evs = porDia[id] || [];
    cels += `<button class="dia${id === hoje ? " hoje" : ""}${id === diaSel ? " sel" : ""}${evs.length ? " tem" : ""}" data-dia="${id}" aria-label="${d} de ${MESES[m]}${evs.length ? ", " + evs.length + " evento(s)" : ""}">
      <span>${d}</span><i>${evs.slice(0, 3).map((e) => `<b class="${classeTipo(e.tipo)}"></b>`).join("")}</i></button>`;
  }

  let lista, tituloLista;
  if (diaSel) {
    lista = porDia[diaSel] || [];
    tituloLista = `${dataLonga(diaSel)} <button class="link" data-limpar>ver próximos</button>`;
  } else {
    lista = state.eventos.filter((e) => e.data >= hoje).slice(0, 12);
    tituloLista = `Próximos encontros ${lista.length > 1 ? `<button class="link" data-lembrar-todos>🔔 Lembrete de todos</button>` : ""}`;
  }

  let dispensou = false;
  try { dispensou = localStorage.getItem("aviso-push") === "x"; } catch {}
  const convidar = !dispensou && "Notification" in window && Notification.permission === "default" && suporte() === "ok";

  el.innerHTML = `
    ${convidar ? `<div class="aviso-push"><span>🔔</span><p>Quer ser avisado antes de cada gira e estudo?</p>
      <button class="btn btn-primario btn-peq" data-ir-push>Ativar</button><button class="btn-icone" data-fechar-push aria-label="Dispensar">✕</button></div>` : ""}
    <section class="cartao calendario">
      <div class="cal-topo">
        <button class="btn-icone" data-mes="-1" aria-label="Mês anterior">‹</button>
        <h2>${MESES[m]} ${ano}</h2>
        <button class="btn-icone" data-mes="1" aria-label="Próximo mês">›</button>
      </div>
      <div class="cal-semana">${DIAS.map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="cal-grade">${cels}</div>
      <div class="legenda">${TIPOS.map((t) => `<span><b class="${classeTipo(t)}"></b>${t}</span>`).join("")}</div>
    </section>
    <h2 class="titulo-secao">${tituloLista}</h2>
    <div class="lista-eventos">${lista.length ? lista.map((e) => cartaoEvento(e, admin, (state.licoes || []).filter((l) => l.eventoId === e.id || (!l.eventoId && l.data === e.data && e.tipo === "Gira")).length)).join("")
      : `<p class="vazio">${diaSel ? "Nenhum encontro neste dia." : "Nenhum encontro agendado."}${admin ? " Toque em + para criar." : ""}</p>`}</div>
    ${admin ? `<button class="fab" data-novo aria-label="Novo encontro">+</button>` : ""}`;

  el.querySelector("[data-ir-push]")?.addEventListener("click", () => ctx.irPara("mais"));
  el.querySelector("[data-fechar-push]")?.addEventListener("click", () => {
    try { localStorage.setItem("aviso-push", "x"); } catch {}
    el.querySelector(".aviso-push").remove();
  });
  el.querySelectorAll("[data-mes]").forEach((b) => b.onclick = () => {
    mesVisto = new Date(ano, m + Number(b.dataset.mes), 1); diaSel = null; render(el, ctx);
  });
  el.querySelectorAll("[data-dia]").forEach((b) => b.onclick = () => {
    diaSel = diaSel === b.dataset.dia ? null : b.dataset.dia; render(el, ctx);
  });
  el.querySelector("[data-limpar]")?.addEventListener("click", () => { diaSel = null; render(el, ctx); });
  el.querySelector("[data-novo]")?.addEventListener("click", () => formulario(ctx, null, diaSel));
  el.querySelectorAll("[data-editar]").forEach((b) => b.onclick = () => formulario(ctx, state.eventos.find((e) => e.id === b.dataset.editar)));
  el.querySelectorAll("[data-avisar]").forEach((b) => b.onclick = () => avisar(state.eventos.find((e) => e.id === b.dataset.avisar)));
  el.querySelectorAll("[data-lembrar]").forEach((b) => b.onclick = () => abrirLembrete([paraLembrete(state.eventos.find((e) => e.id === b.dataset.lembrar))]));
  el.querySelector("[data-lembrar-todos]")?.addEventListener("click", () => abrirLembrete(lista.map(paraLembrete)));
  el.querySelectorAll("[data-licao]").forEach((b) => b.onclick = () => novaLicao(ctx, state.eventos.find((e) => e.id === b.dataset.licao)));
  el.querySelectorAll("[data-ver-licoes]").forEach((b) => b.onclick = () => { state.aba = "licoes"; ctx.irPara("licoes"); });
}

function cartaoEvento(e, admin, qtdLicoes = 0) {
  const d = deISO(e.data);
  const titulo = e.titulo || e.tipo;
  return `<article class="evento ${classeTipo(e.tipo)}">
    <div class="ev-data"><b>${pad(d.getDate())}</b><span>${MESES_CURTOS[d.getMonth()]}</span></div>
    <div class="ev-info">
      <span class="etiqueta">${esc(e.tipo)}</span>
      <h3>${esc(titulo)}</h3>
      <p>🕖 ${dataLonga(e.data)}${e.hora ? " · " + esc(e.hora) : ""}</p>
      ${e.anfitriaoNome ? `<p>🏠 Casa de <b>${esc(e.anfitriaoNome)}</b></p>` : ""}
      ${e.local ? `<p>📍 <a href="${linkMapa(e.local)}" target="_blank" rel="noopener">${esc(e.local)}</a></p>` : ""}
      ${e.obs ? `<p class="suave">${esc(e.obs)}</p>` : ""}
      <div class="ev-acoes">
        <button class="btn btn-claro btn-peq" data-lembrar="${e.id}">🔔 Lembrete</button>
        <button class="btn btn-whats btn-peq" data-avisar="${e.id}">Avisar no WhatsApp</button>
        ${qtdLicoes ? `<button class="btn btn-claro btn-peq" data-ver-licoes>📜 ${qtdLicoes} lição(ões)</button>` : ""}
        ${admin && e.tipo === "Gira" && e.data <= hojeISO() ? `<button class="btn btn-claro btn-peq" data-licao="${e.id}">+ Lição</button>` : ""}
        ${admin ? `<button class="btn btn-claro btn-peq" data-editar="${e.id}">Editar</button>` : ""}
      </div>
    </div></article>`;
}

function avisar(e) {
  const linhas = [
    `*${e.titulo || e.tipo}* 🙏`,
    `📅 ${dataLonga(e.data)}${e.hora ? " às " + e.hora : ""}`,
    e.anfitriaoNome ? `🏠 Casa de ${e.anfitriaoNome}` : "",
    e.local ? `📍 ${e.local}\n${linkMapa(e.local)}` : "",
    e.obs ? `📝 ${e.obs}` : ""
  ].filter(Boolean);
  linhas.push("", "_Fé, Esperança e Caridade_");
  window.open("https://wa.me/?text=" + encodeURIComponent(linhas.join("\n")), "_blank");
}

/* ================= Formulário ================= */
function formulario(ctx, ev, dataInicial) {
  const { state, db } = ctx;
  const novo = !ev;
  ev = ev || { tipo: "Gira", data: dataInicial || hojeISO(), hora: "19:30" };
  const opcoesMembros = state.membros.map((m) => `<option value="${m.id}"${ev.anfitriaoId === m.id ? " selected" : ""}>${esc(m.nome)}</option>`).join("");

  const { el, fechar } = abrirModal(novo ? "Novo encontro" : "Editar encontro", `
    <form class="form" novalidate>
      <div class="linha2">
        <label>Tipo<select name="tipo">${TIPOS.map((t) => `<option${t === ev.tipo ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        <label>Título <span class="suave">(opcional)</span><input name="titulo" value="${esc(ev.titulo || "")}" placeholder="Ex.: Gira de Pretos-Velhos"></label>
      </div>
      <div class="linha2">
        <label>Data<input name="data" type="date" value="${ev.data}" required></label>
        <label>Horário<input name="hora" type="time" value="${esc(ev.hora || "")}"></label>
      </div>
      <label>Onde (casa de quem?)
        <select name="anfitriao"><option value="">— Outro local / terreiro —</option>${opcoesMembros}</select>
      </label>
      <label>Endereço<input name="local" value="${esc(ev.local || "")}" placeholder="Preenchido pelo cadastro do membro"></label>
      <label>Observações<textarea name="obs" rows="2" placeholder="Ex.: levar vela branca, roupa branca">${esc(ev.obs || "")}</textarea></label>
      ${novo ? `
      <label class="check"><input type="checkbox" name="repetir"> Repetir toda semana</label>
      <div class="bloco-rep" hidden>
        <label>Por quantas semanas?<input name="semanas" type="number" min="2" max="52" value="8"></label>
        <p class="rotulo">Rodízio de casas <span class="suave">(toque na ordem; deixe vazio para usar sempre a mesma)</span></p>
        <div class="rodizio">${state.membros.map((m) => `<button type="button" class="chip" data-rod="${m.id}">${esc(m.nome)}<i></i></button>`).join("") || '<p class="suave">Cadastre membros para usar o rodízio.</p>'}</div>
      </div>` : ""}
      <div class="acoes-form">
        ${novo ? "" : `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>`}
        <button type="submit" class="btn btn-primario">Salvar</button>
      </div>
      ${!novo && ev.serieId ? `<button type="button" class="link link-perigo" data-excluir-serie>Excluir este e os próximos desta série</button>` : ""}
    </form>`);

  const f = el.querySelector("form");
  const membro = (id) => state.membros.find((m) => m.id === id);
  let localAuto = !ev.local || ev.local === membro(ev.anfitriaoId)?.endereco;
  f.anfitriao.value = ev.anfitriaoId || "";
  f.local.addEventListener("input", () => (localAuto = false));
  f.anfitriao.addEventListener("change", () => {
    if (localAuto || !f.local.value) { f.local.value = membro(f.anfitriao.value)?.endereco || ""; localAuto = true; }
  });

  // Rodízio: guarda a ordem dos toques
  const ordem = [];
  if (novo) {
    f.repetir.addEventListener("change", () => (el.querySelector(".bloco-rep").hidden = !f.repetir.checked));
    el.querySelectorAll("[data-rod]").forEach((b) => b.addEventListener("click", () => {
      const i = ordem.indexOf(b.dataset.rod);
      i >= 0 ? ordem.splice(i, 1) : ordem.push(b.dataset.rod);
      el.querySelectorAll("[data-rod]").forEach((c) => {
        const p = ordem.indexOf(c.dataset.rod);
        c.classList.toggle("ativo", p >= 0);
        c.querySelector("i").textContent = p >= 0 ? p + 1 : "";
      });
    }));
  }

  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.data.value) return toast("Informe a data.", "erro");
    const base = {
      tipo: f.tipo.value, titulo: f.titulo.value.trim(), data: f.data.value, hora: f.hora.value,
      obs: f.obs.value.trim()
    };
    const comCasa = (id, localDigitado) => {
      const mb = membro(id);
      return { anfitriaoId: id || "", anfitriaoNome: mb?.nome || "", local: (localDigitado ?? "") || mb?.endereco || "" };
    };
    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (!novo) {
        await db.atualizar("eventos", ev.id, { ...base, ...comCasa(f.anfitriao.value, f.local.value.trim()) });
      } else if (f.repetir.checked) {
        const n = Math.min(52, Math.max(2, parseInt(f.semanas.value, 10) || 8));
        const serieId = crypto.randomUUID();
        const lista = [];
        for (let k = 0; k < n; k++) {
          const casa = ordem.length ? comCasa(ordem[k % ordem.length], null) : comCasa(f.anfitriao.value, f.local.value.trim());
          lista.push({ ...base, ...casa, data: somaDias(base.data, 7 * k), serieId });
        }
        await db.inserir("eventos", lista);
      } else {
        await db.inserir("eventos", { ...base, ...comCasa(f.anfitriao.value, f.local.value.trim()) });
      }
    });
    if (ok) { fechar(); toast(novo && f.repetir?.checked ? "Encontros criados!" : "Encontro salvo!"); }
  };

  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar("Excluir este encontro?"))) return;
    try { await db.excluir("eventos", ev.id); fechar(); toast("Encontro excluído."); } catch { toast("Não foi possível excluir.", "erro"); }
  });
  el.querySelector("[data-excluir-serie]")?.addEventListener("click", async () => {
    const alvo = state.eventos.filter((x) => x.serieId === ev.serieId && x.data >= ev.data);
    if (!(await confirmar(`Excluir ${alvo.length} encontro(s) desta série, a partir de ${ev.data.split("-").reverse().join("/")}?`))) return;
    try { await db.excluir("eventos", alvo.map((x) => x.id)); fechar(); toast("Série excluída."); } catch { toast("Não foi possível excluir.", "erro"); }
  });
}
