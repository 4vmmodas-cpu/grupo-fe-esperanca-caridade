/* Biblioteca: PDFs de livros para ler no app e baixar */
import { esc, abrirModal, confirmar, toast } from "./ui.js";

const LIMITE = 50 * 1024 * 1024;           // 50 MB por arquivo (plano grátis)
const ESPACO = 1024 * 1024 * 1024;         // 1 GB no total (plano grátis)
const CATEGORIAS = ["Codificação Espírita", "Umbanda", "Orixás", "Mediunidade", "Estudos", "Preces e Pontos", "Outros"];

let busca = "";
let categoriaSel = "";
const links = {};            // caminho -> { url, vence }
let buscandoLinks = false;

const tamanhoTxt = (b) => !b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const nomeArquivo = (t) => (semAcento(t).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "livro") + ".pdf";

/* Links temporários: busca os que faltam e redesenha quando chegam */
function garantirLinks(ctx, itens) {
  const agora = Date.now();
  const faltam = itens.map((i) => i.arquivoPath).filter((p) => p && !(links[p]?.vence > agora));
  if (!faltam.length || buscandoLinks) return;
  buscandoLinks = true;
  // Se falhar (ou o arquivo não existir), espera 1 minuto antes de tentar de novo
  const falhou = () => faltam.forEach((p) => { if (!links[p]?.url) links[p] = { url: "", vence: agora + 60 * 1000 }; });
  ctx.db.linksPDF(faltam)
    .then((r) => { Object.entries(r).forEach(([p, url]) => (links[p] = { url, vence: agora + 50 * 60 * 1000 })); falhou(); })
    .catch((e) => { console.warn("links da biblioteca", e.message); falhou(); })
    .finally(() => { buscandoLinks = false; ctx.atualizar(); });
}
export function linkLer(caminho) { return links[caminho]?.vence > Date.now() ? links[caminho].url : ""; }
function linkBaixar(item) {
  const u = linkLer(item.arquivoPath);
  return u ? `${u}&download=${encodeURIComponent(item.arquivoNome || nomeArquivo(item.titulo))}` : "";
}
export { garantirLinks };

export function render(el, ctx) {
  const { state, admin } = ctx;
  const todos = (state.biblioteca || []).slice().sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
  const cats = [...new Set(todos.map((i) => i.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (categoriaSel && !cats.includes(categoriaSel)) categoriaSel = "";
  const termo = semAcento(busca.trim());
  const lista = todos.filter((i) => (!categoriaSel || i.categoria === categoriaSel)
    && (!termo || semAcento(`${i.titulo} ${i.autor} ${i.descricao}`).includes(termo)));
  const usado = todos.reduce((s, i) => s + (i.tamanho || 0), 0);
  garantirLinks(ctx, lista);

  el.innerHTML = `
    <div class="cartao intro-licoes intro-biblioteca">
      <h2>📖 Biblioteca</h2>
      <p class="suave">Livros em PDF para ler no celular ou baixar. Tem um livro para compartilhar? Toque em <b>+</b>.</p>
    </div>
    ${todos.length > 4 ? `<input class="busca" type="search" placeholder="🔎 Buscar por título, autor..." value="${esc(busca)}" aria-label="Buscar livro">` : ""}
    ${cats.length > 1 ? `<div class="rodizio filtro-cats">
      <button class="chip${!categoriaSel ? " ativo" : ""}" data-cat="">Todos</button>
      ${cats.map((c) => `<button class="chip${c === categoriaSel ? " ativo" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
    <div class="lista-licoes lista-biblio">${lista.length ? lista.map((i) => cartao(i, admin, state)).join("")
      : `<p class="vazio">${todos.length ? "Nenhum livro encontrado." : "A biblioteca ainda está vazia. Toque em + para enviar o primeiro PDF."}</p>`}</div>
    ${todos.length ? `<p class="centro suave dica">Espaço usado: ${tamanhoTxt(usado) || "0 MB"} de 1 GB</p>` : ""}
    <button class="fab" data-novo aria-label="Enviar livro">+</button>`;

  const campoBusca = el.querySelector(".busca");
  campoBusca?.addEventListener("input", (e) => {
    busca = e.target.value;
    const pos = e.target.selectionStart;
    render(el, ctx);
    const novo = el.querySelector(".busca");
    novo.focus(); novo.setSelectionRange(pos, pos);
  });
  el.querySelectorAll("[data-cat]").forEach((b) => b.onclick = () => { categoriaSel = b.dataset.cat; render(el, ctx); });
  el.querySelector("[data-novo]")?.addEventListener("click", () => formulario(ctx));
  el.querySelectorAll("[data-editar]").forEach((b) => b.onclick = () => formulario(ctx, todos.find((i) => i.id === b.dataset.editar)));
  el.querySelectorAll("a[data-espera]").forEach((a) => a.addEventListener("click", (e) => {
    if (!a.getAttribute("href")) { e.preventDefault(); toast("Preparando o arquivo, toque de novo em instantes..."); garantirLinks(ctx, lista); }
  }));
}

const podeEditar = (i, state, admin) => admin || i.criadoPorId === state.user.id;

function cartao(i, admin, state) {
  const ler = linkLer(i.arquivoPath), baixar = linkBaixar(i);
  const emEstudo = (state.livros || []).some((l) => l.bibliotecaId === i.id && !l.concluido);
  return `<article class="licao biblio">
    <div class="biblio-topo">
      <span class="biblio-capa">📕</span>
      <div class="biblio-info">
        <h3>${esc(i.titulo)}</h3>
        ${i.autor ? `<p class="suave">${esc(i.autor)}</p>` : ""}
        <div class="licao-meta">
          ${i.categoria ? `<span class="etiqueta etq-cat">${esc(i.categoria)}</span>` : ""}
          ${i.tamanho ? `<span>📄 ${tamanhoTxt(i.tamanho)}</span>` : ""}
          ${emEstudo ? `<span>📚 Em estudo</span>` : ""}
          ${i.criadoPor ? `<span>✍️ ${esc(i.criadoPor.split(" ")[0])}</span>` : ""}
        </div>
      </div>
    </div>
    ${i.descricao ? `<p class="licao-texto">${esc(i.descricao)}</p>` : ""}
    <div class="ev-acoes">
      ${i.arquivoPath ? `<a class="btn btn-primario btn-peq" data-espera ${ler ? `href="${esc(ler)}"` : ""} target="_blank" rel="noopener">👁️ Ler</a>
      <a class="btn btn-claro btn-peq" data-espera ${baixar ? `href="${esc(baixar)}"` : ""} target="_blank" rel="noopener">⬇️ Baixar</a>` : `<span class="suave">Sem arquivo</span>`}
      ${podeEditar(i, state, admin) ? `<button class="btn btn-claro btn-peq" data-editar="${i.id}">Editar</button>` : ""}
    </div>
  </article>`;
}

/* ================= Enviar / editar (qualquer membro; edita só o que enviou) ================= */
function formulario(ctx, item = null) {
  const { state, db } = ctx;
  const novo = !item;
  const i = item || {};
  const cats = [...new Set([...CATEGORIAS, ...(state.biblioteca || []).map((x) => x.categoria).filter(Boolean)])];
  const { el, fechar } = abrirModal(novo ? "Enviar livro" : "Editar livro", `
    <form class="form" novalidate>
      <label>Arquivo PDF ${novo ? "" : '<span class="suave">(escolha só se quiser trocar)</span>'}
        <input name="arquivo" type="file" accept="application/pdf,.pdf"></label>
      <p class="suave dica" data-info-arq>${novo ? "Até 50 MB por arquivo." : `Atual: ${esc(i.arquivoNome || "-")} (${tamanhoTxt(i.tamanho)})`}</p>
      <label>Título<input name="titulo" required value="${esc(i.titulo || "")}" placeholder="Ex.: O Livro dos Espíritos"></label>
      <label>Autor <span class="suave">(opcional)</span><input name="autor" value="${esc(i.autor || "")}" placeholder="Ex.: Allan Kardec"></label>
      <label>Categoria<input name="categoria" list="lista-cats" value="${esc(i.categoria || "")}" placeholder="Escolha ou digite"></label>
      <datalist id="lista-cats">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <label>Descrição <span class="suave">(opcional)</span><textarea name="descricao" rows="3" placeholder="Sobre o que é o livro, para quem é indicado...">${esc(i.descricao || "")}</textarea></label>
      <div class="progresso" hidden><div class="progresso-barra"></div><span>0%</span></div>
      <div class="acoes-form">
        ${novo ? "" : `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>`}
        <button type="submit" class="btn btn-primario">${novo ? "Enviar" : "Salvar"}</button>
      </div>
    </form>`);
  const f = el.querySelector("form");
  const info = el.querySelector("[data-info-arq]");
  f.arquivo.onchange = () => {
    const a = f.arquivo.files[0];
    if (!a) return;
    if (a.size > LIMITE) { info.innerHTML = `<span class="atrasada">Arquivo de ${tamanhoTxt(a.size)}: o limite é 50 MB. Comprima o PDF (ex.: ilovepdf.com) e tente de novo.</span>`; return; }
    info.textContent = `${a.name} · ${tamanhoTxt(a.size)}`;
    if (!f.titulo.value.trim()) f.titulo.value = a.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  };

  f.onsubmit = async (e) => {
    e.preventDefault();
    const arq = f.arquivo.files[0];
    if (novo && !arq) return toast("Escolha o arquivo PDF.", "erro");
    if (arq && arq.size > LIMITE) return toast("O PDF passa de 50 MB.", "erro");
    if (arq && !/pdf$/i.test(arq.type || arq.name)) return toast("O arquivo precisa ser PDF.", "erro");
    if (!f.titulo.value.trim()) return toast("Informe o título.", "erro");
    const usado = (state.biblioteca || []).reduce((s, x) => s + (x.id === i.id ? 0 : x.tamanho || 0), 0);
    if (arq && usado + arq.size > ESPACO) return toast("Sem espaço: a biblioteca passaria de 1 GB. Apague algum livro antes.", "erro");

    const btn = f.querySelector("[type=submit]"), barra = el.querySelector(".progresso");
    btn.disabled = true; btn.textContent = arq ? "Enviando..." : "Salvando...";
    const id = i.id || crypto.randomUUID();
    const dados = {
      id, titulo: f.titulo.value.trim(), autor: f.autor.value.trim(),
      categoria: f.categoria.value.trim(), descricao: f.descricao.value.trim()
    };
    try {
      if (arq) {
        barra.hidden = false;
        const caminho = `${id}/${Date.now()}-${nomeArquivo(dados.titulo)}`;
        await db.enviarPDF(caminho, arq, (p) => {
          barra.querySelector(".progresso-barra").style.width = Math.round(p * 100) + "%";
          barra.querySelector("span").textContent = p >= 1 ? "Finalizando..." : Math.round(p * 100) + "%";
        });
        Object.assign(dados, { arquivoPath: caminho, arquivoNome: nomeArquivo(dados.titulo), tamanho: arq.size });
      }
      if (novo) Object.assign(dados, { criadoPor: state.perfil.nome, criadoPorId: state.user.id });
      await db.salvar("biblioteca", dados);
      if (arq && i.arquivoPath) db.removerPDF(i.arquivoPath).catch(() => {});   // apaga o arquivo antigo
      fechar();
      toast(novo ? "Livro enviado para a biblioteca! 📖" : "Livro atualizado!");
    } catch (err) {
      console.error(err);
      toast(err.code === "grande-demais" ? "Arquivo grande demais (limite 50 MB)."
        : err.code === "permission-denied" ? "Você não tem permissão para alterar este livro."
        : err.code === "rede" ? "A conexão caiu durante o envio. Tente de novo no Wi-Fi."
        : "Não foi possível enviar. Tente novamente.", "erro");
      btn.disabled = false; btn.textContent = novo ? "Enviar" : "Salvar"; barra.hidden = true;
    }
  };
  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar(`Excluir "${i.titulo}" da biblioteca? O arquivo será apagado.`))) return;
    try {
      await db.excluir("biblioteca", i.id);
      db.removerPDF(i.arquivoPath).catch(() => {});
      fechar(); toast("Livro excluído da biblioteca.");
    } catch { toast("Não foi possível excluir.", "erro"); }
  });
}
