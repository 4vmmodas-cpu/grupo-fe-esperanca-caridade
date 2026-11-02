(function () {
  "use strict";
  var S = window.SITE || {};
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  var LOGO = '<svg width="44" height="39" viewBox="0 0 100 88" aria-hidden="true"><path d="M50 2 98 86H2z" fill="#c1272d"/><path d="M45 30h10v14h14v9H55v27H45V53H31v-9h14z" fill="#fff"/></svg>';
  var ICONE_WHATS = '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z"/></svg>';

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function linkWhats(msg) {
    return "https://wa.me/" + (S.whatsapp || "") + (msg ? "?text=" + encodeURIComponent(msg) : "");
  }
  function parseData(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function hoje() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  /* ---------- Cabeçalho e rodapé ---------- */
  var paginas = [
    ["index.html", "Início"], ["quem-somos.html", "Quem Somos"], ["doutrina.html", "Doutrina"],
    ["agenda.html", "Agenda"], ["campanhas.html", "Campanhas"], ["galeria.html", "Galeria"]
  ];
  var atual = document.body.getAttribute("data-pagina") || "index.html";

  var topo = document.getElementById("topo");
  if (topo) {
    topo.className = "topo";
    topo.innerHTML =
      '<div class="container">' +
      '<a class="marca" href="index.html">' + LOGO + "<span>" + esc(S.nome) + "</span></a>" +
      '<button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>' +
      '<ul class="menu">' +
      paginas.map(function (p) {
        return '<li><a href="' + p[0] + '"' + (p[0] === atual ? ' class="ativo"' : "") + ">" + p[1] + "</a></li>";
      }).join("") +
      '<li><a class="btn btn-dourado" href="doacoes.html">Quero doar</a></li></ul></div>';
    var btn = topo.querySelector(".menu-toggle"), menu = topo.querySelector(".menu");
    btn.addEventListener("click", function () {
      var aberto = menu.classList.toggle("aberto");
      btn.setAttribute("aria-expanded", aberto);
    });
  }

  var rodape = document.getElementById("rodape");
  if (rodape) {
    rodape.className = "rodape";
    var redes = "";
    if (S.instagram) redes += '<li><a href="' + esc(S.instagram) + '" target="_blank" rel="noopener">Instagram</a></li>';
    if (S.facebook) redes += '<li><a href="' + esc(S.facebook) + '" target="_blank" rel="noopener">Facebook</a></li>';
    rodape.innerHTML =
      '<div class="container"><div class="grade">' +
      "<div><h3>" + esc(S.nome) + "</h3><p>" + esc(S.slogan) + "</p></div>" +
      "<div><h3>Navegue</h3><ul>" + paginas.map(function (p) { return '<li><a href="' + p[0] + '">' + p[1] + "</a></li>"; }).join("") + '<li><a href="doacoes.html">Doações</a></li></ul></div>' +
      "<div><h3>Contato</h3><ul>" +
      "<li>" + esc(S.endereco) + "</li>" +
      '<li><a href="' + linkWhats() + '" target="_blank" rel="noopener">WhatsApp ' + esc(S.telefoneExibicao) + "</a></li>" +
      '<li><a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a></li>" + redes +
      "</ul></div></div>" +
      '<div class="copy">© ' + new Date().getFullYear() + " " + esc(S.nome) + ". Feito com amor e caridade.</div></div>";

    var wf = document.createElement("a");
    wf.className = "whats-flutuante";
    wf.href = linkWhats("Olá! Vim pelo site e gostaria de mais informações.");
    wf.target = "_blank"; wf.rel = "noopener";
    wf.setAttribute("aria-label", "Falar no WhatsApp");
    wf.innerHTML = ICONE_WHATS;
    document.body.appendChild(wf);
  }

  /* ---------- Textos da configuração: <span data-site="nome"> ---------- */
  document.querySelectorAll("[data-site]").forEach(function (el) {
    var v = S[el.getAttribute("data-site")];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-whats]").forEach(function (el) {
    el.href = linkWhats(el.getAttribute("data-whats"));
    el.target = "_blank"; el.rel = "noopener";
  });
  var mapa = document.getElementById("mapa");
  if (mapa && S.mapaEmbed) mapa.src = S.mapaEmbed;
  var mail = document.getElementById("link-email");
  if (mail) mail.href = "mailto:" + S.email;
  var insta = document.getElementById("link-instagram");
  if (insta) { if (S.instagram) insta.href = S.instagram; else insta.closest(".contato-item").remove(); }

  /* ---------- Animação do hero: clique repete ---------- */
  var anim = document.querySelector(".hero-anim"), hero = document.querySelector(".hero");
  if (anim && hero) anim.addEventListener("click", function () {
    hero.classList.remove("tocar");
    void hero.offsetWidth; // reinicia as animações CSS
    hero.classList.add("tocar");
  });

  /* ---------- Agenda ---------- */
  document.querySelectorAll("[data-agenda]").forEach(function (box) {
    var limite = parseInt(box.getAttribute("data-agenda"), 10) || 0;
    var eventos = (window.AGENDA || [])
      .filter(function (e) { return parseData(e.data) >= hoje(); })
      .sort(function (a, b) { return parseData(a.data) - parseData(b.data); });
    if (limite) eventos = eventos.slice(0, limite);
    if (!eventos.length) { box.innerHTML = '<p class="vazio">Nenhum evento agendado no momento. Acompanhe nossas redes sociais.</p>'; return; }
    box.innerHTML = eventos.map(function (e) {
      var d = parseData(e.data);
      return '<article class="evento"><div class="data"><span class="dia">' + d.getDate() + '</span><span class="mes">' + MESES[d.getMonth()] + "</span></div>" +
        "<div><h3>" + esc(e.titulo) + '</h3><span class="hora">' + d.toLocaleDateString("pt-BR", { weekday: "long" }) + " · " + esc(e.hora) + "</span><p>" + esc(e.descricao) + "</p></div></article>";
    }).join("");
  });

  /* ---------- Campanhas ---------- */
  document.querySelectorAll("[data-campanhas]").forEach(function (box) {
    var soDestaque = box.getAttribute("data-campanhas") === "destaque";
    var lista = (window.CAMPANHAS || []).filter(function (c) {
      return (!c.prazo || parseData(c.prazo) >= hoje()) && (!soDestaque || c.destaque);
    });
    if (!lista.length) { box.innerHTML = '<p class="vazio">Nenhuma campanha ativa no momento.</p>'; return; }
    box.innerHTML = lista.map(function (c) {
      var pct = Math.min(100, Math.round((c.atual / c.meta) * 100)) || 0;
      var prazo = c.prazo ? parseData(c.prazo).toLocaleDateString("pt-BR") : "";
      return '<article class="campanha' + (c.destaque ? " destaque" : "") + '">' +
        (c.destaque ? '<span class="selo">Campanha em destaque</span>' : "") +
        "<h3>" + esc(c.titulo) + "</h3><p>" + esc(c.descricao) + "</p>" +
        '<div class="barra" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pct + '%"></span></div>' +
        '<div class="progresso-texto"><span><strong>' + c.atual + "</strong> de " + c.meta + " " + esc(c.unidade) + "</span><span>" + pct + "%</span></div>" +
        (prazo ? '<p class="ajuda">Até ' + prazo + "</p>" : "") +
        (c.necessarios && c.necessarios.length ? '<ul class="tags">' + c.necessarios.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
        '<a class="btn" href="doacoes.html?campanha=' + encodeURIComponent(c.titulo) + '">Quero ajudar</a></article>';
    }).join("");
  });

  /* ---------- Galeria ---------- */
  var gal = document.getElementById("galeria");
  if (gal) {
    var fotos = window.GALERIA || [];
    if (!fotos.length) {
      gal.innerHTML = ["Gira de Caboclos", "Ação social", "Festa de Iemanjá", "Campanha do agasalho", "Entrega de cestas", "Nosso terreiro"]
        .map(function (t) { return '<figure><div class="foto-exemplo">📷<br>' + t + "<br><small>(foto de exemplo)</small></div></figure>"; }).join("");
    } else {
      gal.innerHTML = fotos.map(function (f, i) {
        return '<figure data-i="' + i + '"><img src="' + esc(f.arquivo) + '" alt="' + esc(f.legenda) + '" loading="lazy">' +
          (f.legenda ? "<figcaption>" + esc(f.legenda) + "</figcaption>" : "") + "</figure>";
      }).join("");
      var lb = document.createElement("div");
      lb.className = "lightbox";
      lb.innerHTML = '<button aria-label="Fechar">×</button><img alt=""><p></p>';
      document.body.appendChild(lb);
      var fechar = function () { lb.classList.remove("aberto"); };
      gal.addEventListener("click", function (ev) {
        var fig = ev.target.closest("figure[data-i]");
        if (!fig) return;
        var f = fotos[+fig.getAttribute("data-i")];
        lb.querySelector("img").src = f.arquivo;
        lb.querySelector("p").textContent = f.legenda || "";
        lb.classList.add("aberto");
      });
      lb.addEventListener("click", function (ev) { if (ev.target === lb || ev.target.tagName === "BUTTON") fechar(); });
      document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") fechar(); });
    }
  }

  /* ---------- Formulário de doação ---------- */
  var form = document.getElementById("form-doacao");
  if (form) iniciarFormulario(form);

  function iniciarFormulario(form) {
    var params = new URLSearchParams(location.search);
    var selCamp = form.querySelector("[name=campanha]");
    (window.CAMPANHAS || []).forEach(function (c) {
      if (c.prazo && parseData(c.prazo) < hoje()) return;
      var o = document.createElement("option");
      o.value = o.textContent = c.titulo;
      selCamp.appendChild(o);
    });
    if (params.get("campanha")) selCamp.value = params.get("campanha");

    // Mostrar campo de tamanhos só quando houver roupas/calçados
    var blocoTam = document.getElementById("bloco-tamanhos");
    function atualizaTamanhos() {
      var marcado = form.querySelector("input[value=Roupas]:checked, input[value=Calçados]:checked");
      blocoTam.classList.toggle("oculto", !marcado);
    }
    form.querySelectorAll("input[name=itens]").forEach(function (c) { c.addEventListener("change", atualizaTamanhos); });
    atualizaTamanhos();

    // Máscaras simples
    var tel = form.querySelector("[name=whatsapp]");
    tel.addEventListener("input", function () {
      var d = tel.value.replace(/\D/g, "").slice(0, 11);
      tel.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
        : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
        : d.length > 2 ? d.replace(/(\d{2})(\d*)/, "($1) $2") : d;
    });
    var cep = form.querySelector("[name=cep]");
    cep.addEventListener("input", function () {
      var d = cep.value.replace(/\D/g, "").slice(0, 8);
      cep.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
      if (d.length === 8) buscaCep(d);
    });
    function buscaCep(d) {
      fetch("https://viacep.com.br/ws/" + d + "/json/").then(function (r) { return r.json(); }).then(function (j) {
        if (j.erro) return;
        [["rua", j.logradouro], ["bairro", j.bairro], ["cidade", j.localidade ? j.localidade + "/" + j.uf : ""]].forEach(function (p) {
          var el = form.querySelector("[name=" + p[0] + "]");
          if (p[1] && !el.value) el.value = p[1];
        });
        form.querySelector("[name=numero]").focus();
      }).catch(function () {});
    }

    function erro(el, msg) {
      el.classList.add("invalido");
      var box = el.closest(".campo") || el.parentNode;
      var m = box.querySelector(".msg-erro");
      if (!m) { m = document.createElement("span"); m.className = "msg-erro"; box.appendChild(m); }
      m.textContent = msg;
    }
    function limpaErros() {
      form.querySelectorAll(".invalido").forEach(function (e) { e.classList.remove("invalido"); });
      form.querySelectorAll(".msg-erro").forEach(function (e) { e.remove(); });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      limpaErros();
      var alerta = document.getElementById("alerta-form");
      alerta.classList.add("oculto");
      var primeiro = null;
      function marca(el, msg) { erro(el, msg); primeiro = primeiro || el; }

      form.querySelectorAll("[required]").forEach(function (el) {
        if (el.type === "checkbox") { if (!el.checked) marca(el, "Necessário para enviar."); }
        else if (!el.value.trim()) marca(el, "Campo obrigatório.");
      });
      if (tel.value && tel.value.replace(/\D/g, "").length < 10) marca(tel, "Informe DDD + número.");
      var itens = Array.prototype.map.call(form.querySelectorAll("input[name=itens]:checked"), function (c) { return c.value; });
      if (!itens.length) marca(form.querySelector("input[name=itens]"), "Escolha pelo menos um tipo de item.");
      var dias = Array.prototype.map.call(form.querySelectorAll("input[name=dias]:checked"), function (c) { return c.value; });
      if (!dias.length) marca(form.querySelector("input[name=dias]"), "Escolha pelo menos um dia.");

      if (primeiro) { primeiro.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (form.querySelector("[name=site]").value) return; // honeypot: robô

      var f = function (n) { return (form.querySelector("[name=" + n + "]") || {}).value || ""; };
      var dados = {
        nome: f("nome"), whatsapp: f("whatsapp"), email: f("email"),
        cep: f("cep"), rua: f("rua"), numero: f("numero"), complemento: f("complemento"),
        bairro: f("bairro"), cidade: f("cidade"), referencia: f("referencia"),
        itens: itens.join(", "), descricao: f("descricao"), tamanhos: f("tamanhos"),
        campanha: f("campanha"), dias: dias.join(", "), periodo: f("periodo"),
        observacoes: f("observacoes"), consentimento: "Sim"
      };

      var botao = form.querySelector("button[type=submit]");
      botao.disabled = true; botao.textContent = "Enviando...";

      var envio = S.urlFormulario
        ? fetch(S.urlFormulario, { method: "POST", mode: "no-cors", body: new URLSearchParams(dados) })
        : new Promise(function (ok) { console.info("[Modo de teste] Dados que seriam enviados:", dados); setTimeout(ok, 700); });

      envio.then(function () {
        form.classList.add("oculto");
        var suc = document.getElementById("sucesso");
        suc.classList.remove("oculto");
        suc.querySelector("[data-nome]").textContent = dados.nome.split(" ")[0];
        suc.querySelector("a[data-whats-resumo]").href = linkWhats(
          "Olá! Acabei de cadastrar uma doação pelo site.\nNome: " + dados.nome + "\nItens: " + dados.itens +
          "\nBairro: " + dados.bairro + "\nDisponibilidade: " + dados.dias + " (" + dados.periodo + ")");
        suc.scrollIntoView({ behavior: "smooth", block: "center" });
      }).catch(function () {
        alerta.textContent = "Não foi possível enviar agora. Verifique sua internet ou fale conosco pelo WhatsApp.";
        alerta.classList.remove("oculto");
        botao.disabled = false; botao.textContent = "Enviar cadastro";
      });
    });
  }
})();
