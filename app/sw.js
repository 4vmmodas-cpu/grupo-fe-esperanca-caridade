/* Service worker: deixa o app abrir sem internet e recebe as notificações push. */
const VERSAO = "fec-v11";
const BASE = ["./", "index.html", "css/app.css", "js/app.js", "js/ui.js", "js/db.js", "js/supabase-config.js", "js/push.js",
  "js/agenda.js", "js/licoes.js", "js/estudos.js", "js/biblioteca.js", "js/musicas.js", "js/membros.js", "js/financeiro.js", "js/relatorio.js", "js/mais.js",
  "assets/logo.jpg", "assets/emblema.svg", "assets/icone-192.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const CDNS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const local = url.origin === location.origin;
  if (!local && !CDNS.includes(url.hostname)) return; // chamadas ao Supabase passam direto
  e.respondWith(caches.open(VERSAO).then(async (cache) => {
    if (local) {
      // Arquivos do app: busca a versão nova; sem internet, usa a guardada
      try {
        const r = await fetch(e.request, { cache: "no-cache" });
        if (r.ok) cache.put(e.request, r.clone());
        return r;
      } catch {
        return (await cache.match(e.request)) || (await cache.match("index.html"));
      }
    }
    // Bibliotecas (versões fixas): usa a guardada
    const guardado = await cache.match(e.request);
    if (guardado) return guardado;
    const r = await fetch(e.request);
    if (r.ok) cache.put(e.request, r.clone());
    return r;
  }));
});

/* ---------- Notificações ---------- */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Fé, Esperança e Caridade", {
    body: d.corpo || "",
    icon: "assets/icone-192.png",
    badge: "assets/icone-192.png",
    tag: d.tag || undefined,
    renotify: Boolean(d.tag),
    data: { url: d.url || "./" },
    vibrate: [120, 60, 120]
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const alvo = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
    for (const j of janelas) if (j.url.startsWith(self.registration.scope)) {
      j.postMessage({ tipo: "abrir", url: alvo });
      return j.focus();
    }
    return self.clients.openWindow(alvo);
  }));
});
