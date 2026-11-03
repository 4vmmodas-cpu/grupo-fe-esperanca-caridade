import { esc, hojeISO, dataBR, dataLonga, somaDias, abrirModal, confirmar, toast, salvando, abrirLembrete, copiar } from "./ui.js";

let filtro = "pendentes";   // pendentes | feitas | todas
let entidadeSel = "";

const minhaFeita = (l, uid) => (l.concluidas || []).includes(uid);
const venceu = (l) => l.prazo && l.prazo < hojeISO();
const podeEditar = (l, uid, admin) => admin || l.criadoPorId === uid;

/* Texto pronto para o grupo do WhatsApp */
export function textoWhats(l) {
  const cabecalho = [`📜 *Lição – Gira de ${dataBR(l.data)}*`, l.entidade ? `🕯️ *${l.entidade}*` : ""].filter(Boolean);
  const detalhes = [
    `👥 ${l.paraTodos !== false ? "Para todos" : "Para: " + (l.paraNomes || []).join(", ")}`,
    l.prazo ? `⏳ Prazo: até ${dataLonga(l.prazo)}` : ""
  ].filter(Boolean);
  return [...cabecalho, "", l.texto, "", ...detalhes, "", "Marque ✓ *Fiz* no app quando concluir 🙏", "_Fé, Esperança e Caridade_"].join("\n");
}

export function render(el, ctx) {
  const { state, admin } = ctx;
  const uid = state.user.id;
  const todas = state.licoes || [];
  const entidades = [...new Set(todas.map((l) => l.entidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (entidadeSel && !entidades.includes(entidadeSel)) entidadeSel = "";

  let lista = todas.filter((l) => !entidadeSel || l.entidade === entidadeSel);
  if (filtro === "pendentes") lista = lista.filter((l) => !minhaFeita(l, uid));
  if (filtro === "feitas") lista = lista.filter((l) => minhaFeita(l, uid));
  // Pendentes: prazo mais próximo primeiro; demais: gira mais recente primeiro
  lista.sort(filtro === "pendentes"
    ? (a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999") || b.data.localeCompare(a.data)
    : (a, b) => b.data.localeCompare(a.data));
  const qtdPend = todas.filter((l) => !minhaFeita(l, uid)).length;

  el.innerHTML = `
    <div class="cartao intro-licoes">
      <h2>📜 Lições das entidades</h2>
      <p class="suave">Deveres de casa e orientações recebidas nas giras. Marque <b>✓ Fiz</b> quando concluir.</p>
    </div>
    <div class="barra-acoes">
      <div class="segmento">
        ${[["pendentes", `Pendentes${qtdPend ? ` (${qtdPend})` : ""}`], ["feitas", "Feitas"], ["todas", "Todas"]]
          .map(([v, t]) => `<button data-filtro="${v}" class="${filtro === v ? "ativo" : ""}">${t}</button>`).join("")}
      </div>
      ${entidades.length > 1 ? `<select class="filtro-entidade" aria-label="Filtrar por entidade"><option value="">Todas as entidades</option>
        ${entidades.map((e) => `<option${e === entidadeSel ? " selected" : ""}>${esc(e)}</option>`).join("")}</select>` : ""}
    </div>
    <div class="lista-licoes">${lista.length ? lista.map((l) => cartao(l, uid, admin)).join("")
      : `<p class="vazio">${filtro === "pendentes" ? "Nenhuma lição pendente. 🙏" : "Nenhuma lição por aqui."}${!todas.length ? " Toque em + para registrar a primeira." : ""}</p>`}</div>
    <button class="fab" data-nova aria-label="Nova lição">+</button>`;

  el.querySelectorAll("[data-filtro]").forEach((b) => b.onclick = () => { filtro = b.dataset.filtro; render(el, ctx); });
  el.querySelector(".filtro-entidade")?.addEventListener("change", (e) => { entidadeSel = e.target.value; render(el, ctx); });
  el.querySelector("[data-nova]")?.addEventListener("click", () => novaLicao(ctx));
  const achar = (id) => todas.find((l) => l.id === id);
  el.querySelectorAll("[data-fiz]").forEach((b) => b.onclick = async () => {
    const l = achar(b.dataset.fiz), feita = minhaFeita(l, uid);
    try {
      await ctx.db.marcarLicao(l.id, !feita);
      if (!feita) toast("Lição concluída. Axé! 🙏");
    } catch { toast("Não foi possível atualizar.", "erro"); }
  });
  el.querySelectorAll("[data-lembrar]").forEach((b) => b.onclick = () => {
    const l = achar(b.dataset.lembrar);
    const inicio = l.prazo && l.prazo > hojeISO() ? somaDias(hojeISO(), 1) : (l.prazo || somaDias(hojeISO(), 1));
    abrirLembrete([{ id: l.id + "-" + Date.now(), titulo: `Lição: ${l.entidade || "entidade"}`, data: inicio, hora: "08:00", duracao: 15, descricao: l.texto }],
      { avisoPadrao: 0, escolherHora: true, podeRepetirAte: l.prazo && l.prazo > hojeISO() ? l.prazo : "" });
  });
  el.querySelectorAll("[data-editar]").forEach((b) => b.onclick = () => novaLicao(ctx, null, achar(b.dataset.editar)));
  el.querySelectorAll("[data-whats]").forEach((b) => b.onclick = () =>
    window.open("https://wa.me/?text=" + encodeURIComponent(textoWhats(achar(b.dataset.whats))), "_blank"));
  el.querySelectorAll("[data-copiar]").forEach((b) => b.onclick = async () =>
    toast((await copiar(textoWhats(achar(b.dataset.copiar)))) ? "Lição copiada! Cole no grupo do WhatsApp." : "Não foi possível copiar.", "ok"));
}

function cartao(l, uid, admin) {
  const feita = minhaFeita(l, uid), qtd = (l.concluidas || []).length;
  return `<article class="licao${feita ? " feita" : ""}">
    <header>
      <span class="licao-gira">Gira de ${dataBR(l.data).slice(0, 5)}</span>
      ${l.entidade ? `<h3>${esc(l.entidade)}</h3>` : ""}
    </header>
    <p class="licao-texto">${esc(l.texto)}</p>
    <div class="licao-meta">
      <span>👥 ${l.paraTodos !== false ? "Para todos" : "Para: " + esc((l.paraNomes || []).join(", "))}</span>
      ${l.prazo ? `<span class="${venceu(l) && !feita ? "atrasada" : ""}">⏳ ${venceu(l) ? "Prazo era" : "Até"} ${dataLonga(l.prazo)}</span>` : ""}
      ${qtd ? `<span>✓ ${qtd} concluíram</span>` : ""}
      ${l.criadoPor ? `<span>✍️ ${esc(l.criadoPor.split(" ")[0])}</span>` : ""}
    </div>
    <div class="ev-acoes">
      <button class="btn btn-peq ${feita ? "btn-feito" : "btn-primario"}" data-fiz="${l.id}">${feita ? "✓ Feito (desfazer)" : "✓ Fiz"}</button>
      ${feita ? "" : `<button class="btn btn-claro btn-peq" data-lembrar="${l.id}">🔔 Lembrete</button>`}
      <button class="btn btn-whats btn-peq" data-whats="${l.id}">📲 WhatsApp</button>
      <button class="btn btn-claro btn-peq" data-copiar="${l.id}">📋 Copiar</button>
      ${podeEditar(l, uid, admin) ? `<button class="btn btn-claro btn-peq" data-editar="${l.id}">Editar</button>` : ""}
    </div>
  </article>`;
}

/* Formulário: nova lição (opcionalmente já ligada a uma gira) ou edição */
export function novaLicao(ctx, evento = null, licao = null) {
  const { state, db } = ctx;
  const novo = !licao;
  const hoje = hojeISO();
  const giras = state.eventos.filter((e) => e.tipo === "Gira" && e.data <= somaDias(hoje, 1)).slice(-12).reverse();
  const l = licao || { eventoId: evento?.id || giras[0]?.id || "", data: evento?.data || giras[0]?.data || hoje, paraTodos: true, para: [] };
  const entidades = [...new Set((state.licoes || []).map((x) => x.entidade).filter(Boolean))];
  const marcados = new Set(l.para || []);

  const { el, fechar } = abrirModal(novo ? "Nova lição" : "Editar lição", `
    <form class="form" novalidate>
      <label>Gira
        <select name="gira">
          ${giras.map((g) => `<option value="${g.id}"${g.id === l.eventoId ? " selected" : ""}>${dataBR(g.data)} – ${esc(g.titulo || g.tipo)}</option>`).join("")}
          <option value=""${!l.eventoId ? " selected" : ""}>Outra data…</option>
        </select>
      </label>
      <label class="bloco-data" ${l.eventoId ? "hidden" : ""}>Data da gira<input name="data" type="date" value="${l.data}"></label>
      <label>Entidade<input name="entidade" list="lista-entidades" value="${esc(l.entidade || "")}" placeholder="Ex.: Caboclo Pena Branca, Pai Joaquim"></label>
      <datalist id="lista-entidades">${entidades.map((e) => `<option value="${esc(e)}">`).join("")}</datalist>
      <label>Lição / dever de casa<textarea name="texto" rows="4" required placeholder="Ex.: Acender uma vela branca para o anjo da guarda por 7 dias e fazer banho de alecrim na sexta.">${esc(l.texto || "")}</textarea></label>
      <div>
        <p class="rotulo">Para quem?</p>
        <div class="segmento grande para">
          <button type="button" data-para="todos" class="${l.paraTodos !== false ? "ativo" : ""}">Todos</button>
          <button type="button" data-para="alguns" class="${l.paraTodos === false ? "ativo" : ""}">Membros específicos</button>
        </div>
        <div class="rodizio escolha-membros" ${l.paraTodos !== false ? "hidden" : ""} style="margin-top:10px">
          ${state.membros.map((m) => `<button type="button" class="chip${marcados.has(m.id) ? " ativo" : ""}" data-membro="${m.id}">${esc(m.nome)}</button>`).join("") || '<p class="suave">Cadastre membros primeiro.</p>'}
        </div>
      </div>
      <label>Prazo <span class="suave">(opcional)</span><input name="prazo" type="date" value="${l.prazo || ""}"></label>
      <div class="atalhos-prazo">${[[7, "+7 dias"], [14, "+14 dias"], [21, "+21 dias"]].map(([n, t]) => `<button type="button" class="chip" data-dias="${n}">${t}</button>`).join("")}</div>
      <div class="acoes-form">
        ${novo ? "" : `<button type="button" class="btn btn-perigo-claro" data-excluir>Excluir</button>`}
        <button type="submit" class="btn btn-primario">Salvar</button>
      </div>
    </form>`);

  const f = el.querySelector("form");
  let paraTodos = l.paraTodos !== false;
  const dataGira = () => (f.gira.value ? state.eventos.find((e) => e.id === f.gira.value)?.data : f.data.value) || hoje;
  f.gira.onchange = () => (el.querySelector(".bloco-data").hidden = Boolean(f.gira.value));
  el.querySelectorAll("[data-para]").forEach((b) => b.onclick = () => {
    paraTodos = b.dataset.para === "todos";
    el.querySelectorAll("[data-para]").forEach((x) => x.classList.toggle("ativo", x === b));
    el.querySelector(".escolha-membros").hidden = paraTodos;
  });
  el.querySelectorAll("[data-membro]").forEach((b) => b.onclick = () => {
    marcados.has(b.dataset.membro) ? marcados.delete(b.dataset.membro) : marcados.add(b.dataset.membro);
    b.classList.toggle("ativo");
  });
  el.querySelectorAll("[data-dias]").forEach((b) => b.onclick = () => (f.prazo.value = somaDias(dataGira(), Number(b.dataset.dias))));

  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!f.texto.value.trim()) return toast("Escreva a lição.", "erro");
    if (!paraTodos && !marcados.size) return toast("Escolha pelo menos um membro.", "erro");
    const para = paraTodos ? [] : [...marcados];
    const dados = {
      eventoId: f.gira.value, data: dataGira(), entidade: f.entidade.value.trim(), texto: f.texto.value.trim(),
      paraTodos, para, paraNomes: para.map((id) => state.membros.find((m) => m.id === id)?.nome).filter(Boolean),
      prazo: f.prazo.value
    };
    let salva = null;
    const ok = await salvando(f.querySelector("[type=submit]"), async () => {
      if (novo) [salva] = await db.inserir("licoes", { ...dados, criadoPor: state.perfil.nome, criadoPorId: state.user.id });
      else await db.atualizar("licoes", licao.id, dados);
    });
    if (!ok) return;
    fechar();
    if (!novo) return toast("Lição atualizada!");
    // Oferece mandar no grupo logo depois de registrar
    const m = abrirModal("Lição registrada! 🙏", `
      <p>Quer avisar o grupo agora?</p>
      <div class="acoes-form">
        <button class="btn btn-claro" data-copiar-nova>📋 Copiar</button>
        <button class="btn btn-whats" data-whats-nova>📲 Enviar no WhatsApp</button>
      </div>
      <button class="link" data-depois style="margin-top:8px">Agora não</button>`);
    const texto = textoWhats(salva || dados);
    m.el.querySelector("[data-whats-nova]").onclick = () => { window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank"); m.fechar(); };
    m.el.querySelector("[data-copiar-nova]").onclick = async () => { toast((await copiar(texto)) ? "Copiada! Cole no grupo do WhatsApp." : "Não foi possível copiar."); m.fechar(); };
    m.el.querySelector("[data-depois]").onclick = m.fechar;
  };
  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar("Excluir esta lição?"))) return;
    try { await db.excluir("licoes", licao.id); fechar(); toast("Lição excluída."); } catch { toast("Não foi possível excluir.", "erro"); }
  });
}
