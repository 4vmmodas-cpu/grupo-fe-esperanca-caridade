/* Estudos: livros que o grupo estuda e o resumo de cada dia de estudo */
import * as biblioteca from "./biblioteca.js";
import * as musicas from "./musicas.js";
import { esc, hojeISO, dataBR, dataLonga, mesId, abrirModal, confirmar, toast, salvando, copiar } from "./ui.js";

let secao = lerSecao();         // estudos | biblioteca | musicas
function lerSecao() { try { return localStorage.getItem("secao-estudos") || "estudos"; } catch { return "estudos"; } }
let livroAberto = null;          // id do livro aberto (ou null = lista de livros)
let mostrar = "andamento";       // andamento | concluidos
const comentariosAbertos = new Set();  // resumos com todos os comentários à mostra

const podeEditar = (x, uid, admin) => admin || x.criadoPorId === uid;
const registrosDe = (state, livroId) =>
  (state.estudos || []).filter((r) => r.livroId === livroId).sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm?.localeCompare(a.criadoEm || ""));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* Texto pronto para o grupo do WhatsApp */
export function textoWhats(r, livro) {
  const linhas = [
    `📚 *Estudo de ${dataBR(r.data)}*`,
    livro ? `📖 *${livro.titulo}*${livro.autor ? ` – ${livro.autor}` : ""}` : null,
    r.capitulos ? `📑 ${r.capitulos}` : null,
    "", r.resumo, "",
    (r.presentesNomes || []).length ? `👥 Presentes: ${r.presentesNomes.join(", ")}` : null,
    "_Fé, Esperança e Caridade_"
  ];
  return linhas.filter((l) => l !== null).join("\n");
}

export function render(raiz, ctx) {
  raiz.innerHTML = `<div class="segmento grande secoes">
      <button data-secao="estudos" class="${secao === "estudos" ? "ativo" : ""}">📚 Estudos</button>
      <button data-secao="biblioteca" class="${secao === "biblioteca" ? "ativo" : ""}">📖 Biblioteca</button>
      <button data-secao="musicas" class="${secao === "musicas" ? "ativo" : ""}">🎵 Músicas</button>
    </div><div class="sub-view"></div>`;
  raiz.querySelectorAll("[data-secao]").forEach((b) => b.onclick = () => {
    if (secao === b.dataset.secao) return;
    secao = b.dataset.secao;
    try { localStorage.setItem("secao-estudos", secao); } catch {}
    window.scrollTo(0, 0); ctx.atualizar();
  });
  const el = raiz.querySelector(".sub-view");
  if (secao === "biblioteca") return biblioteca.render(el, ctx);
  if (secao === "musicas") return musicas.render(el, ctx);
  const livro = livroAberto && (ctx.state.livros || []).find((l) => l.id === livroAberto);
  if (livro) return telaLivro(el, ctx, livro);
  livroAberto = null;
  telaLista(el, ctx);
}
/* Abre a seção Biblioteca (usado pelo botão "Ler o livro" quando o PDF sumiu) */
export function irParaBiblioteca(ctx) { secao = "biblioteca"; ctx.irPara("estudos"); }

/* ================= Lista de livros ================= */
function telaLista(el, ctx) {
  const { state } = ctx;
  const livros = state.livros || [];
  const andamento = livros.filter((l) => !l.concluido), concluidos = livros.filter((l) => l.concluido);
  if (mostrar === "concluidos" && !concluidos.length) mostrar = "andamento";
  const ultimo = (l) => registrosDe(state, l.id)[0]?.data || "";
  const lista = (mostrar === "concluidos" ? concluidos : andamento).slice()
    .sort((a, b) => ultimo(b).localeCompare(ultimo(a)) || a.titulo.localeCompare(b.titulo, "pt-BR"));

  el.innerHTML = `
    <div class="cartao intro-licoes intro-estudos">
      <h2>📚 Estudos</h2>
      <p class="suave">Os livros que estamos estudando e o resumo de cada encontro. Toque num livro para ver ou registrar o estudo do dia.</p>
    </div>
    <div class="barra-acoes">
      <div class="segmento">
        <button data-mostrar="andamento" class="${mostrar === "andamento" ? "ativo" : ""}">Em estudo${andamento.length ? ` (${andamento.length})` : ""}</button>
        ${concluidos.length ? `<button data-mostrar="concluidos" class="${mostrar === "concluidos" ? "ativo" : ""}">Concluídos (${concluidos.length})</button>` : ""}
      </div>
      ${(state.estudos || []).length ? `<button class="btn btn-claro btn-peq" data-relatorio-geral>📄 Relatório</button>` : ""}
    </div>
    <div class="lista-licoes">${lista.length ? lista.map((l) => cartaoLivro(l, registrosDe(state, l.id))).join("")
      : `<p class="vazio">Nenhum livro ${mostrar === "concluidos" ? "concluído" : "em estudo"}.${!livros.length ? " Toque em + para cadastrar o primeiro livro." : ""}</p>`}</div>
    <button class="fab" data-novo-livro aria-label="Novo livro">+</button>`;

  el.querySelectorAll("[data-mostrar]").forEach((b) => b.onclick = () => { mostrar = b.dataset.mostrar; ctx.atualizar(); });
  el.querySelectorAll("[data-abrir]").forEach((b) => b.onclick = () => { livroAberto = b.dataset.abrir; window.scrollTo(0, 0); ctx.atualizar(); });
  el.querySelector("[data-novo-livro]").onclick = () => formLivro(ctx, null, (id) => { livroAberto = id; ctx.atualizar(); });
  el.querySelector("[data-relatorio-geral]")?.addEventListener("click", () => dialogoRelatorio(ctx, null));
}

function cartaoLivro(l, regs) {
  const u = regs[0];
  return `<button class="livro${l.concluido ? " concluido" : ""}" data-abrir="${l.id}">
    <span class="livro-capa">📖</span>
    <span class="livro-info">
      <b>${esc(l.titulo)}</b>
      ${l.autor ? `<span class="suave">${esc(l.autor)}</span>` : ""}
      <span class="livro-meta">${regs.length ? `📝 ${plural(regs.length, "encontro", "encontros")} · último em ${dataBR(u.data).slice(0, 5)}${u.capitulos ? ` · ${esc(u.capitulos)}` : ""}` : "Nenhum estudo registrado ainda"}</span>
    </span>
    <span class="livro-seta">›</span>
  </button>`;
}

/* ================= Um livro e seus registros ================= */
function telaLivro(el, ctx, livro) {
  const { state, admin } = ctx;
  const uid = state.user.id;
  const regs = registrosDe(state, livro.id);
  const pdf = livro.bibliotecaId && (state.biblioteca || []).find((b) => b.id === livro.bibliotecaId && b.arquivoPath);
  if (pdf) biblioteca.garantirLinks(ctx, [pdf]);
  const periodo = regs.length ? `${dataBR(regs[regs.length - 1].data)} a ${dataBR(regs[0].data)}` : "";

  el.innerHTML = `
    <button class="link voltar" data-voltar>‹ Todos os livros</button>
    <section class="cartao livro-topo">
      <span class="etiqueta ${livro.concluido ? "etq-concluido" : "etq-andamento"}">${livro.concluido ? "Concluído" : "Em estudo"}</span>
      <h2>📖 ${esc(livro.titulo)}</h2>
      ${livro.autor ? `<p class="suave">${esc(livro.autor)}</p>` : ""}
      ${livro.obs ? `<p class="livro-obs">${esc(livro.obs)}</p>` : ""}
      <p class="livro-meta">${regs.length ? `📝 ${plural(regs.length, "encontro", "encontros")} · ${periodo}` : "Nenhum estudo registrado ainda."}</p>
      <div class="ev-acoes">
        <button class="btn btn-primario btn-peq" data-registrar>+ Estudo do dia</button>
        ${pdf ? `<a class="btn btn-claro btn-peq" data-ler-pdf ${biblioteca.linkLer(pdf.arquivoPath) ? `href="${esc(biblioteca.linkLer(pdf.arquivoPath))}"` : ""} target="_blank" rel="noopener">📖 Ler o livro</a>` : ""}
        ${regs.length ? `<button class="btn btn-claro btn-peq" data-relatorio>📄 Relatório PDF</button>` : ""}
        ${podeEditar(livro, uid, admin) ? `<button class="btn btn-claro btn-peq" data-editar-livro>Editar livro</button>` : ""}
      </div>
    </section>
    ${regs.length ? `<h2 class="titulo-secao">Resumos dos encontros</h2>` : ""}
    <div class="lista-licoes">${regs.map((r, i) => cartaoRegistro(r, regs.length - i, state, admin)).join("")
      || `<p class="vazio">Toque em <b>+ Estudo do dia</b> para registrar o resumo do primeiro encontro.</p>`}</div>
    <button class="fab" data-registrar aria-label="Registrar estudo do dia">+</button>`;

  const achar = (id) => regs.find((r) => r.id === id);
  el.querySelector("[data-ler-pdf]")?.addEventListener("click", (e) => {
    if (!e.currentTarget.getAttribute("href")) { e.preventDefault(); toast("Preparando o arquivo, toque de novo em instantes..."); }
  });
  el.querySelector("[data-voltar]").onclick = () => { livroAberto = null; ctx.atualizar(); };
  el.querySelectorAll("[data-registrar]").forEach((b) => b.onclick = () => novoRegistro(ctx, { livroId: livro.id }));
  el.querySelector("[data-relatorio]")?.addEventListener("click", () => dialogoRelatorio(ctx, livro));
  el.querySelector("[data-editar-livro]")?.addEventListener("click", () => formLivro(ctx, livro, null, () => { livroAberto = null; ctx.atualizar(); }));
  el.querySelectorAll("[data-editar]").forEach((b) => b.onclick = () => novoRegistro(ctx, { registro: achar(b.dataset.editar) }));
  el.querySelectorAll("[data-whats]").forEach((b) => b.onclick = () =>
    window.open("https://wa.me/?text=" + encodeURIComponent(textoWhats(achar(b.dataset.whats), livro)), "_blank"));
  el.querySelectorAll("[data-copiar]").forEach((b) => b.onclick = async () =>
    toast((await copiar(textoWhats(achar(b.dataset.copiar), livro))) ? "Resumo copiado! Cole no grupo do WhatsApp." : "Não foi possível copiar."));
  el.querySelectorAll("[data-curtir]").forEach((b) => b.onclick = async () => {
    const r = achar(b.dataset.curtir), antes = r.curtidas || [], curtiu = antes.includes(uid);
    r.curtidas = curtiu ? antes.filter((x) => x !== uid) : [...antes, uid];   // resposta imediata na tela
    ctx.atualizar();
    try { await ctx.db.curtirEstudo(r.id, !curtiu); }
    catch { r.curtidas = antes; ctx.atualizar(); toast("Não foi possível curtir.", "erro"); }
  });
  el.querySelectorAll("[data-comentar]").forEach((b) => b.onclick = () => formComentario(ctx, achar(b.dataset.comentar)));
  el.querySelectorAll("[data-ver-coment]").forEach((b) => b.onclick = () => {
    const id = b.dataset.verComent;
    comentariosAbertos.has(id) ? comentariosAbertos.delete(id) : comentariosAbertos.add(id);
    ctx.atualizar();
  });
  const acharC = (id) => (state.comentarios || []).find((c) => c.id === id);
  el.querySelectorAll("[data-editar-coment]").forEach((b) => b.onclick = () => {
    const c = acharC(b.dataset.editarComent);
    formComentario(ctx, achar(c.estudoId), c);
  });
  el.querySelectorAll("[data-apagar-coment]").forEach((b) => b.onclick = async () => {
    if (!(await confirmar("Apagar este comentário?", "Apagar"))) return;
    try { await ctx.db.excluir("estudo_comentarios", b.dataset.apagarComent); toast("Comentário apagado."); }
    catch { toast("Não foi possível apagar.", "erro"); }
  });
}

/* Nome curto de quem curtiu/comentou (a conta é ligada ao cadastro de Membro) */
function primeiroNome(state, perfilId) {
  if (perfilId === state.user.id) return "Você";
  const n = state.membros.find((m) => m.perfilId === perfilId)?.nome;
  return n ? n.split(" ")[0] : null;
}
function quando(ts) {
  const d = new Date(ts), hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = d.toDateString() === new Date().toDateString() ? "hoje" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${dia} às ${hora}`;
}
function textoCurtidas(state, ids) {
  const nomes = ids.map((id) => primeiroNome(state, id)).filter(Boolean).sort((a, b) => (a === "Você" ? -1 : b === "Você" ? 1 : 0));
  const mostrados = nomes.slice(0, 3), resto = ids.length - mostrados.length;
  if (!mostrados.length) return `${ids.length} curtida${ids.length > 1 ? "s" : ""}`;
  return mostrados.join(", ") + (resto > 0 ? ` e mais ${resto}` : "");
}

function cartaoRegistro(r, numero, state, admin) {
  const uid = state.user.id;
  const nomes = r.presentesNomes || [];
  const curtidas = r.curtidas || [], curti = curtidas.includes(uid);
  const coments = (state.comentarios || []).filter((c) => c.estudoId === r.id);
  const aberto = comentariosAbertos.has(r.id);
  const visiveis = aberto || coments.length <= 3 ? coments : coments.slice(-2);
  const nomeC = (c) => (c.autorNome || primeiroNome(state, c.criadoPorId) || "Membro").split(" ")[0];
  return `<article class="licao registro">
    <header>
      <span class="licao-gira">${numero}º encontro · ${dataLonga(r.data)}</span>
      ${r.capitulos ? `<h3>📑 ${esc(r.capitulos)}</h3>` : ""}
    </header>
    <p class="licao-texto">${esc(r.resumo)}</p>
    <div class="licao-meta">
      ${nomes.length ? `<span>👥 ${nomes.length} presente${nomes.length > 1 ? "s" : ""}: ${esc(nomes.map((n) => n.split(" ")[0]).join(", "))}</span>` : ""}
      ${r.criadoPor ? `<span>✍️ ${esc(r.criadoPor.split(" ")[0])}</span>` : ""}
    </div>
    <div class="interacoes">
      <button class="btn-curtir${curti ? " curtido" : ""}" data-curtir="${r.id}" aria-pressed="${curti}">${curti ? "❤️" : "🤍"} Curtir${curtidas.length ? ` · ${curtidas.length}` : ""}</button>
      <button class="btn-curtir" data-comentar="${r.id}">💬 Comentar${coments.length ? ` · ${coments.length}` : ""}</button>
    </div>
    ${curtidas.length ? `<p class="quem-curtiu">❤️ ${esc(textoCurtidas(state, curtidas))}</p>` : ""}
    ${coments.length ? `<div class="comentarios">
      ${visiveis.length < coments.length ? `<button class="link" data-ver-coment="${r.id}">Ver todos os ${coments.length} comentários</button>` : ""}
      ${visiveis.map((c) => `<div class="comentario">
        <p><b>${esc(nomeC(c))}</b> <span class="suave">${quando(c.criadoEm)}${c.editadoEm ? " · editado" : ""}</span></p>
        <p class="comentario-texto">${esc(c.texto)}</p>
        ${c.criadoPorId === uid || admin ? `<p class="comentario-acoes">
          ${c.criadoPorId === uid ? `<button class="link" data-editar-coment="${c.id}">editar</button>` : ""}
          <button class="link link-perigo" data-apagar-coment="${c.id}">apagar</button></p>` : ""}
      </div>`).join("")}
      ${aberto && coments.length > 3 ? `<button class="link" data-ver-coment="${r.id}">Mostrar menos</button>` : ""}
    </div>` : ""}
    <div class="ev-acoes">
      <button class="btn btn-whats btn-peq" data-whats="${r.id}">📲 WhatsApp</button>
      <button class="btn btn-claro btn-peq" data-copiar="${r.id}">📋 Copiar</button>
      ${podeEditar(r, uid, admin) ? `<button class="btn btn-claro btn-peq" data-editar="${r.id}">Editar</button>` : ""}
    </div>
  </article>`;
}

/* ================= Comentário ================= */
function formComentario(ctx, registro, comentario = null) {
  const { state, db } = ctx;
  const { el, fechar } = abrirModal(comentario ? "Editar comentário" : "Comentar", `
    <form class="form" novalidate>
      <p class="suave">Estudo de ${dataBR(registro.data)}${registro.capitulos ? " · " + esc(registro.capitulos) : ""}</p>
      <label>Seu comentário<textarea name="texto" rows="4" maxlength="2000" required placeholder="Compartilhe sua reflexão sobre este estudo...">${esc(comentario?.texto || "")}</textarea></label>
      <div class="acoes-form"><button type="submit" class="btn btn-primario">${comentario ? "Salvar" : "Enviar"}</button></div>
    </form>`);
  const f = el.querySelector("form");
  setTimeout(() => f.texto.focus(), 250);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const texto = f.texto.value.trim();
    if (!texto) return toast("Escreva o comentário.", "erro");
    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (comentario) await db.atualizar("estudo_comentarios", comentario.id, { texto, editadoEm: new Date().toISOString() });
      else await db.inserir("estudo_comentarios", { estudoId: registro.id, texto, autorNome: state.perfil.nome, criadoPorId: state.user.id });
    });
    if (!ok) return;
    fechar();
    toast(comentario ? "Comentário atualizado." : "Comentário enviado! 💬");
  };
}

/* ================= Formulário do livro ================= */
function formLivro(ctx, livro, aoCriar, aoExcluir) {
  const { state, db, admin } = ctx;
  const novo = !livro;
  const l = livro || {};
  const qtd = novo ? 0 : registrosDe(state, l.id).length;
  const { el, fechar } = abrirModal(novo ? "Novo livro" : "Editar livro", `
    <form class="form" novalidate>
      <label>Título do livro<input name="titulo" required value="${esc(l.titulo || "")}" placeholder="Ex.: O Evangelho Segundo o Espiritismo"></label>
      <label>Autor <span class="suave">(opcional)</span><input name="autor" value="${esc(l.autor || "")}" placeholder="Ex.: Allan Kardec"></label>
      ${(state.biblioteca || []).length ? `<label>PDF na Biblioteca <span class="suave">(opcional)</span>
        <select name="biblioteca"><option value="">— Nenhum —</option>
          ${state.biblioteca.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR")).map((b) => `<option value="${b.id}"${b.id === l.bibliotecaId ? " selected" : ""}>${esc(b.titulo)}</option>`).join("")}
        </select></label>` : ""}
      <label>Observações <span class="suave">(opcional)</span><textarea name="obs" rows="2" placeholder="Ex.: Estudo das quartas, um capítulo por semana">${esc(l.obs || "")}</textarea></label>
      ${novo ? "" : `<label class="check"><input type="checkbox" name="concluido"${l.concluido ? " checked" : ""}> Estudo deste livro concluído</label>`}
      <div class="acoes-form">
        ${!novo && admin ? `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>` : ""}
        <button type="submit" class="btn btn-primario">Salvar</button>
      </div>
    </form>`);
  const f = el.querySelector("form");
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.titulo.value.trim()) return toast("Informe o título do livro.", "erro");
    const dados = { titulo: f.titulo.value.trim(), autor: f.autor.value.trim(), obs: f.obs.value.trim() };
    if (f.biblioteca) dados.bibliotecaId = f.biblioteca.value;
    if (!novo) dados.concluido = f.concluido.checked;
    let criado = null;
    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (novo) [criado] = await db.inserir("livros", { ...dados, criadoPor: state.perfil.nome, criadoPorId: state.user.id });
      else await db.atualizar("livros", l.id, dados);
    });
    if (!ok) return;
    fechar();
    toast(novo ? "Livro cadastrado! 📚" : "Livro atualizado!");
    if (criado) {
      state.livros = [...(state.livros || []).filter((x) => x.id !== criado.id), criado];
      aoCriar?.(criado.id);
    }
  };
  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    const aviso = qtd ? `Excluir o livro e os ${plural(qtd, "resumo registrado", "resumos registrados")}? Isso não pode ser desfeito.` : "Excluir este livro?";
    if (!(await confirmar(aviso))) return;
    try { await db.excluir("livros", l.id); fechar(); toast("Livro excluído."); aoExcluir?.(); }
    catch { toast("Não foi possível excluir.", "erro"); }
  });
}

/* ================= Registro do dia ================= */
/* opcoes: { livroId, registro (edição), evento (vindo da Agenda) } */
export function novoRegistro(ctx, { livroId = "", registro = null, evento = null } = {}) {
  const { state, db } = ctx;
  const livros = state.livros || [];
  if (!livros.length) {
    toast("Cadastre primeiro o livro na aba Estudos.", "erro");
    return ctx.irPara("estudos");
  }
  const novo = !registro;
  const r = registro || { livroId: livroId || sugerirLivro(state), data: evento?.data || hojeISO(), presentes: [] };
  const opcoes = livros.filter((l) => !l.concluido || l.id === r.livroId).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  const marcados = new Set(r.presentes || []);
  const anterior = (id) => registrosDe(state, id).find((x) => x.id !== r.id);

  const { el, fechar } = abrirModal(novo ? "Estudo do dia" : "Editar estudo", `
    <form class="form" novalidate>
      <label>Livro
        <select name="livro">${opcoes.map((l) => `<option value="${l.id}"${l.id === r.livroId ? " selected" : ""}>${esc(l.titulo)}</option>`).join("")}</select>
      </label>
      <p class="suave dica" data-anterior></p>
      <label>Data do estudo<input name="data" type="date" value="${r.data}" required></label>
      <label>Capítulos estudados<input name="capitulos" value="${esc(r.capitulos || "")}" placeholder="Ex.: Cap. 3 e 4 (págs. 40 a 58)"></label>
      <label>Resumo<textarea name="resumo" rows="7" required placeholder="O que foi estudado, os principais ensinamentos e reflexões do grupo...">${esc(r.resumo || "")}</textarea></label>
      <div>
        <p class="rotulo">Presentes <span class="suave">(opcional)</span> <button type="button" class="link" data-todos>marcar todos</button></p>
        <div class="rodizio escolha-membros" style="margin-top:8px">
          ${state.membros.map((m) => `<button type="button" class="chip${marcados.has(m.id) ? " ativo" : ""}" data-membro="${m.id}">${esc(m.nome)}</button>`).join("") || '<p class="suave">Nenhum membro cadastrado.</p>'}
        </div>
      </div>
      <div class="acoes-form">
        ${novo ? "" : `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>`}
        <button type="submit" class="btn btn-primario">Salvar</button>
      </div>
    </form>`);

  const f = el.querySelector("form");
  const mostrarAnterior = () => {
    const a = anterior(f.livro.value);
    el.querySelector("[data-anterior]").innerHTML = a ? `Último registro: <b>${dataBR(a.data)}</b>${a.capitulos ? ` – ${esc(a.capitulos)}` : ""}` : "Primeiro registro deste livro.";
  };
  mostrarAnterior();
  f.livro.onchange = mostrarAnterior;
  const chips = [...el.querySelectorAll("[data-membro]")];
  chips.forEach((b) => b.onclick = () => {
    marcados.has(b.dataset.membro) ? marcados.delete(b.dataset.membro) : marcados.add(b.dataset.membro);
    b.classList.toggle("ativo");
  });
  el.querySelector("[data-todos]").onclick = () => {
    const todos = marcados.size < chips.length;
    chips.forEach((b) => { todos ? marcados.add(b.dataset.membro) : marcados.delete(b.dataset.membro); b.classList.toggle("ativo", todos); });
  };

  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.data.value) return toast("Informe a data do estudo.", "erro");
    if (!f.resumo.value.trim()) return toast("Escreva o resumo do estudo.", "erro");
    const presentes = [...marcados];
    // Liga ao encontro de Estudo da Agenda nesse dia, se houver
    const ev = evento?.data === f.data.value ? evento : state.eventos.find((x) => x.tipo === "Estudo" && x.data === f.data.value);
    const dados = {
      livroId: f.livro.value, data: f.data.value, eventoId: ev?.id || "",
      capitulos: f.capitulos.value.trim(), resumo: f.resumo.value.trim(),
      presentes, presentesNomes: presentes.map((id) => state.membros.find((m) => m.id === id)?.nome).filter(Boolean)
    };
    let salvo = null;
    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (novo) [salvo] = await db.inserir("estudos", { ...dados, criadoPor: state.perfil.nome, criadoPorId: state.user.id });
      else await db.atualizar("estudos", registro.id, dados);
    });
    if (!ok) return;
    fechar();
    if (!novo) return toast("Estudo atualizado!");
    const livro = livros.find((l) => l.id === dados.livroId);
    const texto = textoWhats(salvo || dados, livro);
    const m = abrirModal("Estudo registrado! 📚", `
      <p>Quer mandar o resumo no grupo?</p>
      <div class="acoes-form">
        <button class="btn btn-claro" data-copiar-novo>📋 Copiar</button>
        <button class="btn btn-whats" data-whats-novo>📲 Enviar no WhatsApp</button>
      </div>
      <button class="link" data-depois style="margin-top:8px">Agora não</button>`);
    m.el.querySelector("[data-whats-novo]").onclick = () => { window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank"); m.fechar(); };
    m.el.querySelector("[data-copiar-novo]").onclick = async () => { toast((await copiar(texto)) ? "Copiado! Cole no grupo do WhatsApp." : "Não foi possível copiar."); m.fechar(); };
    m.el.querySelector("[data-depois]").onclick = m.fechar;
  };
  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar("Excluir o resumo deste estudo?"))) return;
    try { await db.excluir("estudos", registro.id); fechar(); toast("Resumo excluído."); } catch { toast("Não foi possível excluir.", "erro"); }
  });
}

/* Livro mais provável: o aberto, senão o em estudo com registro mais recente */
function sugerirLivro(state) {
  if (livroAberto) return livroAberto;
  const ativos = (state.livros || []).filter((l) => !l.concluido);
  const ult = (l) => registrosDe(state, l.id)[0]?.data || l.criadoEm || "";
  return ativos.sort((a, b) => ult(b).localeCompare(ult(a)))[0]?.id || state.livros[0]?.id;
}

/* ================= Relatório ================= */
function dialogoRelatorio(ctx, livro) {
  const { state } = ctx;
  const hoje = hojeISO();
  const todos = livro ? registrosDe(state, livro.id) : state.estudos || [];
  const primeiro = todos.reduce((m, r) => (r.data < m ? r.data : m), hoje);
  const { el, fechar } = abrirModal(livro ? "Relatório do livro" : "Relatório de estudos", `
    <form class="form" novalidate>
      ${livro ? `<p>📖 <b>${esc(livro.titulo)}</b></p>` : `<p class="suave">Inclui todos os livros com estudos no período.</p>`}
      <div>
        <p class="rotulo">Período</p>
        <div class="segmento grande periodo" style="grid-template-columns:1fr 1fr 1fr">
          <button type="button" data-per="tudo" class="ativo">Tudo</button>
          <button type="button" data-per="mes">Este mês</button>
          <button type="button" data-per="datas">Escolher</button>
        </div>
      </div>
      <div class="linha2 bloco-datas" hidden>
        <label>De<input name="de" type="date" value="${primeiro}"></label>
        <label>Até<input name="ate" type="date" value="${hoje}"></label>
      </div>
      <label class="check"><input type="checkbox" name="presentes" checked> Incluir lista de presentes</label>
      <div class="acoes-form"><button type="submit" class="btn btn-primario">📄 Gerar e compartilhar</button></div>
    </form>`);
  const f = el.querySelector("form");
  let per = "tudo";
  el.querySelectorAll("[data-per]").forEach((b) => b.onclick = () => {
    per = b.dataset.per;
    el.querySelectorAll("[data-per]").forEach((x) => x.classList.toggle("ativo", x === b));
    el.querySelector(".bloco-datas").hidden = per !== "datas";
  });
  f.onsubmit = async (e) => {
    e.preventDefault();
    let de = "", ate = "";
    if (per === "mes") { de = mesId(hoje) + "-01"; ate = mesId(hoje) + "-31"; }
    if (per === "datas") { de = f.de.value; ate = f.ate.value; }
    const dentro = (r) => (!de || r.data >= de) && (!ate || r.data <= ate);
    const livros = livro ? [livro] : (state.livros || []);
    const grupos = livros
      .map((l) => ({ livro: l, registros: registrosDe(state, l.id).filter(dentro).reverse() }))
      .filter((g) => g.registros.length)
      .sort((a, b) => a.livro.titulo.localeCompare(b.livro.titulo, "pt-BR"));
    if (!grupos.length) return toast("Nenhum estudo registrado nesse período.", "erro");
    const btn = f.querySelector("[type=submit]");
    btn.disabled = true; btn.textContent = "Gerando PDF...";
    try {
      const { gerarRelatorioEstudos } = await import("./relatorio.js");
      await gerarRelatorioEstudos({ grupos, de, ate, presentes: f.presentes.checked, autor: state.perfil.nome });
      fechar();
    } catch (err) {
      console.error(err);
      toast("Não foi possível gerar o PDF. Verifique a internet.", "erro");
      btn.disabled = false; btn.textContent = "📄 Gerar e compartilhar";
    }
  };
}
