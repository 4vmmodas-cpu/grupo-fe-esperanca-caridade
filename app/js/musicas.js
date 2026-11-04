/* Músicas: letras dos pontos cantados, escritas pelos próprios membros */
import { esc, abrirModal, confirmar, toast, salvando, copiar } from "./ui.js";

const LINHAS = ["Abertura", "Defumação", "Oxalá", "Ogum", "Oxóssi", "Xangô", "Iansã", "Oxum", "Iemanjá", "Nanã", "Obaluaê / Omulu",
  "Caboclos", "Pretos-Velhos", "Crianças / Erês", "Baianos", "Boiadeiros", "Marinheiros", "Ciganos", "Exus", "Pombagiras", "Encerramento", "Outros"];

let busca = "";
let linhaSel = "";
const abertas = new Set();

const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const podeEditar = (m, state, admin) => admin || m.criadoPorId === state.user.id;
/* Ordena as linhas na ordem tradicional da gira; as novas vão para o fim */
const posLinha = (l) => { const i = LINHAS.indexOf(l); return i < 0 ? 99 : i; };

export function textoWhats(m) {
  return [`🎵 *${m.titulo}*`, m.linha ? `_${m.linha}_` : null, "", m.letra, "",
    m.link || null, "_Fé, Esperança e Caridade_"].filter((l) => l !== null).join("\n");
}

export function render(el, ctx) {
  const { state, admin } = ctx;
  const todas = state.musicas || [];
  const linhas = [...new Set(todas.map((m) => m.linha).filter(Boolean))].sort((a, b) => posLinha(a) - posLinha(b) || a.localeCompare(b, "pt-BR"));
  if (linhaSel && !linhas.includes(linhaSel)) linhaSel = "";
  const termo = semAcento(busca.trim());
  const lista = todas
    .filter((m) => (!linhaSel || m.linha === linhaSel) && (!termo || semAcento(`${m.titulo} ${m.linha} ${m.letra}`).includes(termo)))
    .sort((a, b) => posLinha(a.linha) - posLinha(b.linha) || a.titulo.localeCompare(b.titulo, "pt-BR"));

  el.innerHTML = `
    <div class="cartao intro-licoes intro-musicas">
      <h2>🎵 Músicas</h2>
      <p class="suave">As letras dos pontos cantados do grupo. Conhece um ponto que não está aqui? Toque em <b>+</b> e escreva.</p>
    </div>
    ${todas.length > 4 ? `<input class="busca" type="search" placeholder="🔎 Buscar pelo nome ou por um trecho da letra..." value="${esc(busca)}" aria-label="Buscar música">` : ""}
    ${linhas.length > 1 ? `<div class="rodizio filtro-cats">
      <button class="chip${!linhaSel ? " ativo" : ""}" data-linha="">Todas</button>
      ${linhas.map((l) => `<button class="chip${l === linhaSel ? " ativo" : ""}" data-linha="${esc(l)}">${esc(l)}</button>`).join("")}</div>` : ""}
    <div class="lista-licoes">${lista.length ? lista.map((m) => cartao(m, state, admin)).join("")
      : `<p class="vazio">${todas.length ? "Nenhuma música encontrada." : "Nenhuma letra ainda. Toque em + para escrever a primeira."}</p>`}</div>
    ${todas.length ? `<p class="centro suave dica">${todas.length} música${todas.length > 1 ? "s" : ""} no caderno</p>` : ""}
    <button class="fab" data-nova aria-label="Nova música">+</button>`;

  el.querySelector(".busca")?.addEventListener("input", (e) => {
    busca = e.target.value;
    const pos = e.target.selectionStart;
    render(el, ctx);
    const novo = el.querySelector(".busca");
    novo.focus(); novo.setSelectionRange(pos, pos);
  });
  el.querySelectorAll("[data-linha]").forEach((b) => b.onclick = () => { linhaSel = b.dataset.linha; render(el, ctx); });
  el.querySelector("[data-nova]").onclick = () => formulario(ctx);
  const achar = (id) => todas.find((m) => m.id === id);
  el.querySelectorAll("[data-abrir]").forEach((b) => b.onclick = () => {
    abertas.has(b.dataset.abrir) ? abertas.delete(b.dataset.abrir) : abertas.add(b.dataset.abrir);
    render(el, ctx);
  });
  el.querySelectorAll("[data-editar]").forEach((b) => b.onclick = () => formulario(ctx, achar(b.dataset.editar)));
  el.querySelectorAll("[data-whats]").forEach((b) => b.onclick = () =>
    window.open("https://wa.me/?text=" + encodeURIComponent(textoWhats(achar(b.dataset.whats))), "_blank"));
  el.querySelectorAll("[data-copiar]").forEach((b) => b.onclick = async () =>
    toast((await copiar(textoWhats(achar(b.dataset.copiar)))) ? "Letra copiada!" : "Não foi possível copiar."));
}

function cartao(m, state, admin) {
  const aberta = abertas.has(m.id);
  const previa = m.letra.split("\n").filter((l) => l.trim()).slice(0, 2).join(" / ");
  return `<article class="licao musica${aberta ? " aberta" : ""}">
    <button class="musica-topo" data-abrir="${m.id}" aria-expanded="${aberta}">
      <span class="musica-info">
        ${m.linha ? `<span class="licao-gira">${esc(m.linha)}</span>` : ""}
        <h3>${esc(m.titulo)}</h3>
        ${aberta ? "" : `<span class="suave musica-previa">${esc(previa)}</span>`}
      </span>
      <span class="livro-seta">${aberta ? "▴" : "▾"}</span>
    </button>
    ${aberta ? `
    <p class="letra">${esc(m.letra)}</p>
    ${m.obs ? `<p class="suave">📝 ${esc(m.obs)}</p>` : ""}
    <div class="licao-meta">${m.criadoPor ? `<span>✍️ ${esc(m.criadoPor.split(" ")[0])}</span>` : ""}${m.editadoEm ? "<span>editada</span>" : ""}</div>
    <div class="ev-acoes">
      ${m.link ? `<a class="btn btn-primario btn-peq" href="${esc(m.link)}" target="_blank" rel="noopener">▶️ Ouvir</a>` : ""}
      <button class="btn btn-whats btn-peq" data-whats="${m.id}">📲 WhatsApp</button>
      <button class="btn btn-claro btn-peq" data-copiar="${m.id}">📋 Copiar</button>
      ${podeEditar(m, state, admin) ? `<button class="btn btn-claro btn-peq" data-editar="${m.id}">Editar</button>` : ""}
    </div>` : ""}
  </article>`;
}

function formulario(ctx, musica = null) {
  const { state, db } = ctx;
  const nova = !musica;
  const m = musica || {};
  const linhas = [...new Set([...LINHAS, ...(state.musicas || []).map((x) => x.linha).filter(Boolean)])];
  const { el, fechar } = abrirModal(nova ? "Nova música" : "Editar música", `
    <form class="form" novalidate>
      <label>Nome do ponto<input name="titulo" required value="${esc(m.titulo || "")}" placeholder="Ex.: Ponto de abertura – Oxalá"></label>
      <label>Linha / Orixá<input name="linha" list="lista-linhas" value="${esc(m.linha || "")}" placeholder="Escolha ou digite"></label>
      <datalist id="lista-linhas">${linhas.map((l) => `<option value="${esc(l)}">`).join("")}</datalist>
      <label>Letra<textarea name="letra" rows="12" required placeholder="Escreva a letra aqui, uma estrofe por linha...">${esc(m.letra || "")}</textarea></label>
      <label>Link para ouvir <span class="suave">(opcional – YouTube, Spotify...)</span><input name="link" type="url" inputmode="url" value="${esc(m.link || "")}" placeholder="https://..."></label>
      <label>Observações <span class="suave">(opcional)</span><input name="obs" value="${esc(m.obs || "")}" placeholder="Ex.: cantado na abertura da gira"></label>
      <div class="acoes-form">
        ${nova ? "" : `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>`}
        <button type="submit" class="btn btn-primario">Salvar</button>
      </div>
    </form>`);
  const f = el.querySelector("form");
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.titulo.value.trim()) return toast("Informe o nome do ponto.", "erro");
    if (!f.letra.value.trim()) return toast("Escreva a letra.", "erro");
    let link = f.link.value.trim();
    if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
    const dados = { titulo: f.titulo.value.trim(), linha: f.linha.value.trim(), letra: f.letra.value.replace(/\s+$/, ""), link: link || null, obs: f.obs.value.trim() };
    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (nova) await db.inserir("musicas", { ...dados, criadoPor: state.perfil.nome, criadoPorId: state.user.id });
      else await db.atualizar("musicas", m.id, { ...dados, editadoEm: new Date().toISOString() });
    });
    if (!ok) return;
    fechar();
    toast(nova ? "Música adicionada ao caderno! 🎵" : "Música atualizada!");
  };
  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar(`Excluir "${m.titulo}"?`))) return;
    try { await db.excluir("musicas", m.id); fechar(); toast("Música excluída."); } catch { toast("Não foi possível excluir.", "erro"); }
  });
}
