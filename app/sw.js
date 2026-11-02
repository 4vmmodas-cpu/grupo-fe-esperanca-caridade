/* Service worker: guarda os arquivos do app para abrir rápido e sem internet.
   Os dados (agenda, membros...) ficam no cache próprio do Firebase. */
const VERSAO = "fec-v3";
const BASE = ["./", "index.html", "css/app.css", "js/app.js", "js/ui.js", "js/db.js", "js/supabase-config.js",
  "js/agenda.js", "js/licoes.js", "js/membros.js", "js/financeiro.js", "js/relatorio.js", "js/mais.js",
  "assets/logo.jpg", "assets/emblema.svg", "assets/icone-192.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const CDNS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const local = url.origin === location.origin;
  if (!local && !CDNS.includes(url.hostname)) return; // chamadas ao Supabase (dados) passam direto
  // Mostra a versão guardada e atualiza em segundo plano
  e.respondWith(caches.open(VERSAO).then(async (cache) => {
    const guardado = await cache.match(e.request);
    const rede = fetch(e.request).then((r) => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => guardado);
    return guardado || rede;
  }));
});
