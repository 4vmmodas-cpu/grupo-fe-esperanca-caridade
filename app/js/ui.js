export const GRUPO = "Fé, Esperança e Caridade";
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- Datas (sempre "AAAA-MM-DD", sem fuso) ---------- */
export const pad = (n) => String(n).padStart(2, "0");
export function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function deISO(s) { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); }
export function hojeISO() { return iso(new Date()); }
export function somaDias(s, n) { const d = deISO(s); d.setDate(d.getDate() + n); return iso(d); }
export function dataBR(s) { if (!s) return ""; const [a, m, d] = s.split("-"); return `${d}/${m}/${a}`; }
export function dataLonga(s) { const d = deISO(s); return `${DIAS_LONGOS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }
export function mesId(s) { return s.slice(0, 7); }
export function nomeMes(id) { const [a, m] = id.split("-"); return `${MESES[+m - 1]}/${a}`; }

/* ---------- Dinheiro (guardado em centavos) ---------- */
export function moeda(c) { return ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
export function mascaraMoeda(input) {
  input.addEventListener("input", () => {
    const c = parseInt(input.value.replace(/\D/g, "") || "0", 10);
    input.value = c ? moeda(c) : "";
  });
}
export function centavos(txt) { return parseInt(String(txt).replace(/\D/g, "") || "0", 10); }

/* ---------- Telefone / WhatsApp ---------- */
export function soDigitos(t) { return String(t || "").replace(/\D/g, ""); }
export function mascaraTelefone(input) {
  input.addEventListener("input", () => {
    const d = soDigitos(input.value).slice(0, 11);
    input.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
      : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
      : d.length > 2 ? d.replace(/(\d{2})(\d*)/, "($1) $2") : d;
  });
}
export function linkWhats(numero, texto) {
  let n = soDigitos(numero);
  if (n && n.length <= 11) n = "55" + n;
  return `https://wa.me/${n}${texto ? "?text=" + encodeURIComponent(texto) : ""}`;
}
export function linkMapa(endereco) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(endereco); }
export function iniciais(nome) { return String(nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase(); }

/* ---------- Avisos ---------- */
export function toast(msg, tipo = "ok") {
  const t = document.createElement("div");
  t.className = "toast toast-" + tipo;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("visivel"));
  setTimeout(() => { t.classList.remove("visivel"); setTimeout(() => t.remove(), 300); }, 3200);
}

/* ---------- Janela modal (vira "gaveta" no celular) ---------- */
export function abrirModal(titulo, corpoHTML) {
  const fundo = document.createElement("div");
  fundo.className = "modal-fundo";
  fundo.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <header class="modal-topo"><h2>${esc(titulo)}</h2><button type="button" class="btn-icone fechar" aria-label="Fechar">✕</button></header>
      <div class="modal-corpo">${corpoHTML}</div></div>`;
  document.body.appendChild(fundo);
  document.body.classList.add("sem-rolagem");
  requestAnimationFrame(() => fundo.classList.add("aberto"));
  const fechar = () => {
    fundo.classList.remove("aberto");
    document.body.classList.remove("sem-rolagem");
    document.removeEventListener("keydown", esc_);
    setTimeout(() => fundo.remove(), 250);
  };
  const esc_ = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", esc_);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  fundo.querySelector(".fechar").addEventListener("click", fechar);
  const primeiro = fundo.querySelector("input:not([type=hidden]):not([type=checkbox]), select, textarea");
  if (primeiro && matchMedia("(pointer:fine)").matches) setTimeout(() => primeiro.focus(), 200);
  return { el: fundo.querySelector(".modal"), fechar };
}

export function confirmar(msg, textoOk = "Excluir") {
  return new Promise((resolve) => {
    const m = abrirModal("Confirmar", `<p>${esc(msg)}</p>
      <div class="acoes-form"><button class="btn btn-claro" data-r="0">Cancelar</button><button class="btn btn-perigo" data-r="1">${esc(textoOk)}</button></div>`);
    m.el.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => { m.fechar(); resolve(b.dataset.r === "1"); }));
  });
}

/* Trava o botão enquanto salva e mostra erro amigável */
export async function salvando(botao, fn) {
  const txt = botao.textContent;
  botao.disabled = true; botao.textContent = "Salvando...";
  try { await fn(); return true; }
  catch (e) {
    console.error(e);
    toast(e.code === "permission-denied" ? "Você não tem permissão para isso." : "Não foi possível salvar. Tente novamente.", "erro");
    return false;
  } finally { botao.disabled = false; botao.textContent = txt; }
}

/* ---------- Arquivos ---------- */
export function lerArquivo(file) {
  return new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(file); });
}
/* Reduz fotos de comprovante para caber no banco (limite ~1 MB por registro) */
export async function comprimirImagem(file, max = 1400) {
  const url = await lerArquivo(file);
  const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = url; });
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let q = 0.75, dados = c.toDataURL("image/jpeg", q);
  while (dados.length > 850000 && q > 0.3) { q -= 0.1; dados = c.toDataURL("image/jpeg", q); }
  return dados;
}
export function dataURLparaBlob(dataURL) {
  const [cab, b64] = dataURL.split(",");
  const tipo = cab.match(/:(.*?);/)[1];
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: tipo });
}

/* Compartilha arquivo (abre o WhatsApp no celular) ou baixa no computador */
export async function compartilharArquivo(blob, nome, texto) {
  const file = new File([blob], nome, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: nome, text: texto }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("PDF baixado. Agora é só anexar no WhatsApp.");
}

export function carregarScript(src) {
  return new Promise((ok, falha) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = falha;
    document.head.appendChild(s);
  });
}

/* ---------- Lembretes na agenda do celular ---------- */
const escICS = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
const dobraICS = (l) => { const out = []; while (l.length > 74) { out.push(l.slice(0, 74)); l = " " + l.slice(74); } out.push(l); return out.join("\r\n"); };
const horaICS = (data, hora) => data.replace(/-/g, "") + "T" + (hora || "09:00").replace(":", "") + "00";
function fimEvento(data, hora, min) {
  const [a, m, d] = data.split("-").map(Number), [h, mi] = (hora || "09:00").split(":").map(Number);
  const f = new Date(a, m - 1, d, h, mi + min);
  return { data: iso(f), hora: `${pad(f.getHours())}:${pad(f.getMinutes())}` };
}

/* eventos: [{ id, titulo, data, hora, duracao (min), local, descricao }] */
export function gerarICS(eventos, avisoMin) {
  const agora = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FEC Grupo//Agenda//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  eventos.forEach((e) => {
    const fim = fimEvento(e.data, e.hora, e.duracao || 120);
    linhas.push("BEGIN:VEVENT", `UID:${e.id}@fec-grupo`, `DTSTAMP:${agora}`,
      `DTSTART:${horaICS(e.data, e.hora)}`, `DTEND:${horaICS(fim.data, fim.hora)}`,
      `SUMMARY:${escICS(e.titulo)}`);
    if (e.local) linhas.push(`LOCATION:${escICS(e.local)}`);
    if (e.descricao) linhas.push(`DESCRIPTION:${escICS(e.descricao)}`);
    if (e.diarioAte) linhas.push(`RRULE:FREQ=DAILY;UNTIL=${e.diarioAte.replace(/-/g, "")}T235959`);
    if (avisoMin >= 0) linhas.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escICS(e.titulo)}`, `TRIGGER:-PT${avisoMin}M`, "END:VALARM");
    linhas.push("END:VEVENT");
  });
  linhas.push("END:VCALENDAR");
  return linhas.map(dobraICS).join("\r\n");
}

function linkGoogleAgenda(e) {
  const fim = fimEvento(e.data, e.hora, e.duracao || 120);
  const p = new URLSearchParams({
    action: "TEMPLATE", text: e.titulo, dates: `${horaICS(e.data, e.hora)}/${horaICS(fim.data, fim.hora)}`,
    details: e.descricao || "", location: e.local || "", ctz: "America/Sao_Paulo"
  });
  if (e.diarioAte) p.set("recur", `RRULE:FREQ=DAILY;UNTIL=${e.diarioAte.replace(/-/g, "")}T235959`);
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

function baixarICS(conteudo, nome) {
  const blob = new Blob([conteudo], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // No iPhone, abrir o arquivo mostra direto "Adicionar à Agenda"
  if (!/iphone|ipad|ipod/i.test(navigator.userAgent)) a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* Abre a janela "Criar lembrete" para um ou vários eventos */
/* opções: avisoPadrao (min), escolherHora (true = pede data/hora), podeRepetirAte ("AAAA-MM-DD" = oferece repetir todo dia) */
export function abrirLembrete(eventos, { avisoPadrao = 120, escolherHora = false, podeRepetirAte = "" } = {}) {
  const varios = eventos.length > 1;
  const { el, fechar } = abrirModal("🔔 Criar lembrete", `
    <form class="form">
      <p>${varios ? `<b>${eventos.length} encontros</b> serão salvos na agenda do seu celular.` : `<b>${esc(eventos[0].titulo)}</b>${escolherHora ? "" : `<br><span class="suave">${dataLonga(eventos[0].data)}${eventos[0].hora ? " às " + esc(eventos[0].hora) : ""}</span>`}`}</p>
      ${escolherHora ? `<div class="linha2"><label>Dia<input type="date" name="data" value="${eventos[0].data}"></label><label>Horário<input type="time" name="hora" value="${eventos[0].hora || "08:00"}"></label></div>` : ""}
      ${podeRepetirAte ? `<label class="check"><input type="checkbox" name="diario"> Repetir todo dia até ${dataBR(podeRepetirAte)}</label>` : ""}
      <label>Me avisar
        <select name="aviso">
          ${[[0, "Na hora"], [15, "15 minutos antes"], [30, "30 minutos antes"], [60, "1 hora antes"], [120, "2 horas antes"], [180, "3 horas antes"], [1440, "1 dia antes"]]
            .map(([v, t]) => `<option value="${v}"${v === avisoPadrao ? " selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
      <button type="submit" class="btn btn-primario">📅 Salvar na agenda do celular</button>
      ${varios ? "" : `<a class="btn btn-claro" target="_blank" rel="noopener" data-google>Abrir no Google Agenda</a>`}
      <p class="suave dica">Funciona no iPhone, Samsung e Outlook: o próprio celular avisa no horário, mesmo com o app fechado.
      ${varios ? "" : "No Google Agenda, confira o aviso antes de salvar (ele usa o padrão da sua agenda)."}</p>
    </form>`);
  const f = el.querySelector("form");
  // Aplica dia/hora/repetição escolhidos na janela
  const ajustados = () => eventos.map((e) => ({
    ...e,
    ...(escolherHora ? { data: f.data.value || e.data, hora: f.hora.value || e.hora } : {}),
    ...(f.diario?.checked ? { diarioAte: podeRepetirAte } : {})
  }));
  const google = el.querySelector("[data-google]");
  if (google) {
    const atualiza = () => google.setAttribute("href", linkGoogleAgenda(ajustados()[0]));
    atualiza(); f.addEventListener("input", atualiza); f.addEventListener("change", atualiza);
    google.addEventListener("click", () => setTimeout(fechar, 300));
  }
  f.onsubmit = (ev) => {
    ev.preventDefault();
    baixarICS(gerarICS(ajustados(), parseInt(f.aviso.value, 10)), varios ? "encontros-fec.ics" : "lembrete-fec.ics");
    fechar();
    toast("Abra o arquivo para adicionar à sua agenda.");
  };
}
