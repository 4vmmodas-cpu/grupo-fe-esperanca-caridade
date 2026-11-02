import {
  esc, MESES, hojeISO, dataBR, mesId, nomeMes, moeda, centavos, mascaraMoeda,
  abrirModal, confirmar, toast, salvando, comprimirImagem, dataURLparaBlob
} from "./ui.js";
import { gerarRelatorio } from "./relatorio.js";

export const CATEGORIAS = {
  entrada: ["Mensalidade", "Doação", "Festa / Evento", "Rifa / Bazar", "Outros"],
  saida: ["Aluguel", "Água / Luz", "Materiais de gira", "Velas / Ervas / Flores", "Alimentação", "Ação social", "Transporte", "Outros"]
};

let mesSel = mesId(hojeISO());
let filtro = "todos";

/* Saldo acumulado de todos os meses (ou até um mês, sem incluí-lo) */
export function saldoAte(resumos, ateMes) {
  return Object.entries(resumos).reduce((s, [id, r]) => (!ateMes || id < ateMes ? s + (r.entradas || 0) - (r.saidas || 0) : s), 0);
}

export function render(el, ctx) {
  ctx.admin ? renderAdmin(el, ctx) : renderMembro(el, ctx);
}

function navMes() {
  return `<div class="nav-mes">
    <button class="btn-icone" data-mes="-1" aria-label="Mês anterior">‹</button>
    <h2>${nomeMes(mesSel)}</h2>
    <button class="btn-icone" data-mes="1" aria-label="Próximo mês">›</button></div>`;
}
function ligarNavMes(el, ctx) {
  el.querySelectorAll("[data-mes]").forEach((b) => b.onclick = () => {
    const [a, m] = mesSel.split("-").map(Number);
    const d = new Date(a, m - 1 + Number(b.dataset.mes), 1);
    mesSel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    render(el, ctx);
  });
}
function cartoesResumo(r, saldoTotal) {
  const ent = r.entradas || 0, sai = r.saidas || 0;
  return `<div class="resumo-grade">
    <div class="resumo entrada"><span>Entradas</span><b>${moeda(ent)}</b></div>
    <div class="resumo saida"><span>Saídas</span><b>${moeda(sai)}</b></div>
    <div class="resumo"><span>Saldo do mês</span><b class="${ent - sai < 0 ? "neg" : ""}">${moeda(ent - sai)}</b></div>
    <div class="resumo total"><span>Saldo em caixa</span><b class="${saldoTotal < 0 ? "neg" : ""}">${moeda(saldoTotal)}</b></div>
  </div>`;
}

/* ---------- Visão dos membros: só o resumo ---------- */
function renderMembro(el, ctx) {
  const { resumos } = ctx.state;
  const meses = Object.keys(resumos).sort().reverse().slice(0, 12);
  el.innerHTML = `${navMes()}
    ${cartoesResumo(resumos[mesSel] || {}, saldoAte(resumos))}
    <section class="cartao">
      <h2>Últimos meses</h2>
      ${meses.length ? `<table class="tabela"><thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th></tr></thead><tbody>
        ${meses.map((id) => `<tr><td>${nomeMes(id)}</td><td class="pos">${moeda(resumos[id].entradas)}</td><td class="neg">${moeda(resumos[id].saidas)}</td></tr>`).join("")}
      </tbody></table>` : `<p class="vazio">Ainda não há lançamentos.</p>`}
      <p class="suave nota">Os lançamentos detalhados e comprovantes ficam com a tesouraria. O relatório mensal é enviado no grupo do WhatsApp.</p>
    </section>`;
  ligarNavMes(el, ctx);
}

/* ---------- Visão da tesouraria ---------- */
function renderAdmin(el, ctx) {
  const { state } = ctx;
  const doMes = state.lancamentos.filter((l) => mesId(l.data) === mesSel);
  const lista = doMes.filter((l) => filtro === "todos" || l.tipo === filtro);

  el.innerHTML = `${navMes()}
    ${cartoesResumo(state.resumos[mesSel] || {}, saldoAte(state.resumos))}
    <div class="barra-acoes">
      <div class="segmento" role="tablist">
        ${[["todos", "Todos"], ["entrada", "Entradas"], ["saida", "Saídas"]].map(([v, t]) => `<button data-filtro="${v}" class="${filtro === v ? "ativo" : ""}">${t}</button>`).join("")}
      </div>
      <button class="btn btn-escuro btn-peq" data-relatorio>📄 Relatório PDF</button>
    </div>
    <div class="lista-lanc">${lista.length ? lista.map(linhaLanc).join("") : `<p class="vazio">Nenhum lançamento em ${MESES[+mesSel.slice(5) - 1].toLowerCase()}. Toque em + para lançar.</p>`}</div>
    <button class="fab" data-novo aria-label="Novo lançamento">+</button>`;

  ligarNavMes(el, ctx);
  el.querySelectorAll("[data-filtro]").forEach((b) => b.onclick = () => { filtro = b.dataset.filtro; render(el, ctx); });
  el.querySelector("[data-novo]").onclick = () => formulario(ctx, null);
  el.querySelector("[data-relatorio]").onclick = () => dialogoRelatorio(ctx, doMes);
  el.querySelectorAll("[data-lanc]").forEach((a) => a.onclick = (e) => {
    const l = state.lancamentos.find((x) => x.id === a.dataset.lanc);
    if (e.target.closest("[data-comp]")) return verComprovante(ctx, l);
    formulario(ctx, l);
  });
}

function linhaLanc(l) {
  const ent = l.tipo === "entrada";
  return `<article class="lanc" data-lanc="${l.id}">
    <span class="lanc-icone ${ent ? "ent" : "sai"}">${ent ? "↑" : "↓"}</span>
    <div class="lanc-info"><h3>${esc(l.descricao || l.categoria)}</h3><p class="suave">${dataBR(l.data).slice(0, 5)} · ${esc(l.categoria)}</p></div>
    ${l.temComprovante ? `<button class="btn-icone" data-comp aria-label="Ver comprovante">📎</button>` : ""}
    <b class="${ent ? "pos" : "neg"}">${ent ? "+" : "−"} ${moeda(l.valor)}</b>
  </article>`;
}

/* ---------- Lançamento ---------- */
function formulario(ctx, l) {
  const { db } = ctx;
  const novo = !l;
  l = l || { tipo: "entrada", data: hojeISO(), categoria: "Mensalidade" };
  let arquivo = null, removerComp = false;

  const { el, fechar } = abrirModal(novo ? "Novo lançamento" : "Editar lançamento", `
    <form class="form" novalidate>
      <div class="segmento grande">
        <button type="button" data-tipo="entrada">↑ Entrada</button>
        <button type="button" data-tipo="saida">↓ Saída</button>
      </div>
      <div class="linha2">
        <label>Valor<input name="valor" inputmode="numeric" placeholder="R$ 0,00" value="${l.valor ? moeda(l.valor) : ""}" required></label>
        <label>Data<input name="data" type="date" value="${l.data}" required></label>
      </div>
      <label>Categoria<select name="categoria"></select></label>
      <label>Descrição<input name="descricao" value="${esc(l.descricao || "")}" placeholder="Ex.: Mensalidade de Maria, conta de luz de outubro"></label>
      <div class="comp">
        <p class="rotulo">Comprovante <span class="suave">(foto ou PDF)</span></p>
        <div class="comp-atual" ${l.temComprovante ? "" : "hidden"}>📎 ${esc(l.comprovanteNome || "Comprovante anexado")} <button type="button" class="link link-perigo" data-rem>remover</button></div>
        <label class="upload"><input type="file" name="arquivo" accept="image/*,application/pdf" hidden><span>📷 Tirar foto ou escolher arquivo</span></label>
        <p class="suave arquivo-nome"></p>
      </div>
      <div class="acoes-form">
        ${novo ? "" : `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>`}
        <button type="submit" class="btn btn-primario">Salvar</button>
      </div>
    </form>`);

  const f = el.querySelector("form");
  let tipo = l.tipo;
  const preencheCategorias = () => {
    f.categoria.innerHTML = CATEGORIAS[tipo].map((c) => `<option${c === l.categoria ? " selected" : ""}>${c}</option>`).join("");
    el.querySelectorAll("[data-tipo]").forEach((b) => b.classList.toggle("ativo", b.dataset.tipo === tipo));
  };
  el.querySelectorAll("[data-tipo]").forEach((b) => b.onclick = () => { tipo = b.dataset.tipo; preencheCategorias(); });
  preencheCategorias();
  mascaraMoeda(f.valor);

  f.arquivo.onchange = () => {
    arquivo = f.arquivo.files[0] || null;
    el.querySelector(".arquivo-nome").textContent = arquivo ? "Selecionado: " + arquivo.name : "";
  };
  el.querySelector("[data-rem]").onclick = () => { removerComp = true; el.querySelector(".comp-atual").hidden = true; };

  f.onsubmit = async (e) => {
    e.preventDefault();
    const valor = centavos(f.valor.value);
    if (!valor) return toast("Informe o valor.", "erro");
    if (!f.data.value) return toast("Informe a data.", "erro");

    let comp = null;
    if (arquivo) {
      try {
        if (arquivo.type === "application/pdf") {
          if (arquivo.size > 5 * 1024 * 1024) return toast("PDF muito grande (máx. 5 MB).", "erro");
          comp = { blob: arquivo, nome: arquivo.name };
        } else {
          comp = { blob: dataURLparaBlob(await comprimirImagem(arquivo, 1800)), nome: arquivo.name.replace(/\.\w+$/, "") + ".jpg" };
        }
      } catch { return toast("Não foi possível ler o arquivo.", "erro"); }
    }

    const id = novo ? crypto.randomUUID() : l.id;
    const dados = {
      id, tipo, valor, data: f.data.value, categoria: f.categoria.value, descricao: f.descricao.value.trim(),
      temComprovante: comp ? true : removerComp ? false : Boolean(l.temComprovante),
      comprovanteNome: comp ? comp.nome : removerComp ? null : l.comprovanteNome || null,
      comprovantePath: removerComp && !comp ? null : l.comprovantePath || null,
      atualizadoPor: ctx.state.perfil.nome, atualizadoEm: new Date().toISOString()
    };

    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (comp) dados.comprovantePath = await db.enviarComprovante(id, comp.blob, comp.nome);
      await db.salvar("lancamentos", dados);
      // Apaga o arquivo antigo se foi substituído ou removido
      if (l.comprovantePath && (comp || removerComp)) await db.removerComprovante(l.comprovantePath).catch(() => {});
    });
    if (ok) { fechar(); toast("Lançamento salvo!"); ctx.recarregarResumos(); }
  };

  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar(`Excluir o lançamento de ${moeda(l.valor)}?`))) return;
    try {
      await db.excluir("lancamentos", l.id);
      if (l.comprovantePath) await db.removerComprovante(l.comprovantePath).catch(() => {});
      fechar(); toast("Lançamento excluído."); ctx.recarregarResumos();
    } catch { toast("Não foi possível excluir.", "erro"); }
  });
}

async function verComprovante(ctx, l) {
  const m = abrirModal("Comprovante", `<div class="comp-visu"><div class="carregando"></div></div>`);
  const box = m.el.querySelector(".comp-visu");
  try {
    if (!l.comprovantePath) { box.innerHTML = `<p class="vazio">Comprovante não encontrado.</p>`; return; }
    const blob = await ctx.db.baixarComprovante(l.comprovantePath);
    const url = URL.createObjectURL(blob);
    box.innerHTML = `${blob.type.startsWith("image") ? `<img src="${url}" alt="Comprovante">` : `<p>📄 ${esc(l.comprovanteNome || "comprovante.pdf")}</p>`}
      <div class="acoes-form"><a class="btn btn-claro" href="${url}" download="${esc(l.comprovanteNome || "comprovante")}">Baixar</a><a class="btn btn-primario" href="${url}" target="_blank" rel="noopener">Abrir</a></div>`;
  } catch (e) { console.error(e); box.innerHTML = `<p class="vazio">Erro ao carregar o comprovante.</p>`; }
}

function dialogoRelatorio(ctx, doMes) {
  const comComp = doMes.filter((l) => l.temComprovante && l.comprovanteNome?.endsWith(".jpg")).length;
  const { el, fechar } = abrirModal("Relatório do mês", `
    <form class="form">
      <p>Relatório de <b>${nomeMes(mesSel)}</b>: ${doMes.length} lançamento(s).</p>
      <label class="check"><input type="checkbox" name="anexar" ${comComp ? "checked" : "disabled"}> Incluir fotos dos comprovantes (${comComp})</label>
      <p class="suave">No celular, o botão abre o compartilhamento: escolha o WhatsApp e o grupo.</p>
      <div class="acoes-form"><button class="btn btn-whats" type="submit">Gerar e enviar</button></div>
    </form>`);
  const f = el.querySelector("form");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true; btn.textContent = "Gerando PDF...";
    try {
      await gerarRelatorio({ db: ctx.db, mes: mesSel, lancamentos: doMes, resumos: ctx.state.resumos, anexar: f.anexar.checked, autor: ctx.state.perfil.nome });
      fechar();
    } catch (err) {
      console.error(err); toast("Não foi possível gerar o PDF.", "erro");
      btn.disabled = false; btn.textContent = "Gerar e enviar";
    }
  };
}
