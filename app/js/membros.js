import {
  esc, MESES, pad, deISO, dataBR, hojeISO, linkWhats, iniciais, abrirModal, confirmar, toast, salvando, mascaraTelefone, soDigitos
} from "./ui.js";

const FUNCOES = ["Dirigente", "Médium", "Cambone", "Ogã", "Tesoureiro(a)", "Membro", "Outro"];
let busca = "";

export function render(el, ctx) {
  const { state, admin } = ctx;
  const hoje = new Date(), mesAtual = hoje.getMonth(), diaHoje = hoje.getDate();

  const aniversariantes = state.membros
    .filter((m) => m.nascimento && deISO(m.nascimento).getMonth() === mesAtual)
    .sort((a, b) => deISO(a.nascimento).getDate() - deISO(b.nascimento).getDate());

  el.innerHTML = `
    ${aniversariantes.length ? `
    <section class="cartao aniversarios">
      <h2>🎂 Aniversariantes de ${MESES[mesAtual]}</h2>
      <ul>${aniversariantes.map((m) => {
        const d = deISO(m.nascimento).getDate(), ehHoje = d === diaHoje;
        return `<li class="${ehHoje ? "hoje" : d < diaHoje ? "passou" : ""}">
          <span class="dia-niver">${pad(d)}</span>
          <span class="nome">${esc(m.nome)}${ehHoje ? ' <em>é hoje!</em>' : ""}</span>
          ${m.whatsapp ? `<a class="btn btn-whats btn-peq" target="_blank" rel="noopener" href="${linkWhats(m.whatsapp, `Feliz aniversário, ${m.nome.split(" ")[0]}! 🎉🙏 Que Oxalá e os bons guias iluminem seu caminho com muita saúde, paz e luz. Um abraço de toda a família Fé, Esperança e Caridade!`)}">Parabéns</a>` : ""}
        </li>`;
      }).join("")}</ul>
    </section>` : ""}
    <div class="busca"><input type="search" placeholder="Buscar membro..." value="${esc(busca)}" aria-label="Buscar membro"></div>
    <p class="contagem suave"></p>
    <div class="lista-membros"></div>
    ${admin ? `<button class="fab" data-novo aria-label="Novo membro">+</button>` : ""}`;

  const caixa = el.querySelector(".lista-membros"), cont = el.querySelector(".contagem");
  const desenhar = () => {
    const termo = busca.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const lista = state.membros.filter((m) =>
      !termo || (m.nome + " " + (m.funcao || "")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(termo));
    cont.textContent = `${lista.length} de ${state.membros.length} membro(s)`;
    caixa.innerHTML = lista.length ? lista.map((m) => `
      <article class="membro" data-id="${m.id}">
        <span class="avatar">${esc(iniciais(m.nome))}</span>
        <div class="membro-info">
          <h3>${esc(m.nome)}</h3>
          <p class="suave">${esc(m.funcao || "")}${m.nascimento ? ` · 🎂 ${dataBR(m.nascimento).slice(0, 5)}` : ""}</p>
        </div>
        <div class="membro-acoes">
          ${m.whatsapp ? `<a class="btn-icone whats" href="${linkWhats(m.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(m.nome)}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z"/></svg></a>` : ""}
          ${m.whatsapp ? `<a class="btn-icone" href="tel:+55${soDigitos(m.whatsapp)}" aria-label="Ligar para ${esc(m.nome)}">📞</a>` : ""}
        </div>
      </article>`).join("")
      : `<p class="vazio">${state.membros.length ? "Ninguém encontrado." : "Nenhum membro cadastrado ainda."}${admin && !state.membros.length ? " Toque em + para cadastrar." : ""}</p>`;
    caixa.querySelectorAll(".membro").forEach((a) => a.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      detalhe(ctx, state.membros.find((m) => m.id === a.dataset.id));
    }));
  };
  desenhar();
  el.querySelector(".busca input").addEventListener("input", (e) => { busca = e.target.value; desenhar(); });
  el.querySelector("[data-novo]")?.addEventListener("click", () => formulario(ctx, null));
}

function detalhe(ctx, m) {
  const { admin, state } = ctx;
  const proximos = state.eventos.filter((e) => e.anfitriaoId === m.id && e.data >= hojeISO());
  const { el, fechar } = abrirModal(m.nome, `
    <div class="detalhe">
      <span class="avatar grande">${esc(iniciais(m.nome))}</span>
      <dl>
        ${m.funcao ? `<dt>Função</dt><dd>${esc(m.funcao)}</dd>` : ""}
        ${m.whatsapp ? `<dt>WhatsApp</dt><dd><a href="${linkWhats(m.whatsapp)}" target="_blank" rel="noopener">${esc(m.whatsapp)}</a></dd>` : ""}
        ${m.nascimento ? `<dt>Aniversário</dt><dd>${dataBR(m.nascimento)}</dd>` : ""}
        ${m.endereco ? `<dt>Endereço</dt><dd>${esc(m.endereco)}</dd>` : ""}
        ${m.obs ? `<dt>Observações</dt><dd>${esc(m.obs)}</dd>` : ""}
        <dt>Próximos encontros na casa</dt><dd>${proximos.length ? proximos.slice(0, 4).map((e) => `${dataBR(e.data)} – ${esc(e.titulo || e.tipo)}`).join("<br>") : "Nenhum"}</dd>
      </dl>
      ${admin ? `<div class="acoes-form"><button class="btn btn-perigo-claro" data-excluir>Excluir</button><button class="btn btn-primario" data-editar>Editar</button></div>` : ""}
    </div>`);
  el.querySelector("[data-editar]")?.addEventListener("click", () => { fechar(); formulario(ctx, m); });
  el.querySelector("[data-excluir]")?.addEventListener("click", async () => {
    if (!(await confirmar(`Excluir ${m.nome} do cadastro?`))) return;
    try { await ctx.db.excluir("membros", m.id); fechar(); toast("Membro excluído."); } catch { toast("Não foi possível excluir.", "erro"); }
  });
}

function formulario(ctx, m) {
  const { db } = ctx;
  const novo = !m; m = m || { funcao: "Médium" };
  const { el, fechar } = abrirModal(novo ? "Novo membro" : "Editar membro", `
    <form class="form" novalidate>
      <label>Nome completo<input name="nome" value="${esc(m.nome || "")}" required autocomplete="off"></label>
      <div class="linha2">
        <label>WhatsApp<input name="whatsapp" type="tel" inputmode="tel" value="${esc(m.whatsapp || "")}" placeholder="(11) 99999-9999"></label>
        <label>Data de nascimento<input name="nascimento" type="date" value="${esc(m.nascimento || "")}"></label>
      </div>
      <label>Função<select name="funcao">${FUNCOES.map((f) => `<option${f === m.funcao ? " selected" : ""}>${f}</option>`).join("")}</select></label>
      <label>Endereço <span class="suave">(para quando receber encontros)</span><input name="endereco" value="${esc(m.endereco || "")}" placeholder="Rua, número – bairro, cidade"></label>
      <label>Observações<textarea name="obs" rows="2">${esc(m.obs || "")}</textarea></label>
      <div class="acoes-form"><button type="submit" class="btn btn-primario">Salvar</button></div>
    </form>`);
  const f = el.querySelector("form");
  mascaraTelefone(f.whatsapp);
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (f.nome.value.trim().length < 2) return toast("Informe o nome.", "erro");
    const tel = soDigitos(f.whatsapp.value);
    if (tel && tel.length < 10) return toast("WhatsApp precisa de DDD + número.", "erro");
    const dados = {
      nome: f.nome.value.trim(), whatsapp: f.whatsapp.value.trim(), nascimento: f.nascimento.value,
      funcao: f.funcao.value, endereco: f.endereco.value.trim(), obs: f.obs.value.trim()
    };
    const ok = await salvando(f.querySelector("[type=submit]"), () =>
      novo ? db.inserir("membros", dados) : db.atualizar("membros", m.id, dados));
    if (ok) { fechar(); toast(novo ? "Membro cadastrado!" : "Dados atualizados!"); }
  };
}
