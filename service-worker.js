const CACHE_NAME = "pelada-pro-cache-v0.0.7";

// Arquivos essenciais do app (ajuste/complete conforme for criando novas páginas)
const ASSETS = [
  "./inicio.html",
  "./criar.html",
  "./login.html",
  "./style.css",
  "./criar.css",
  "./manifest.json",
  "./assets/icon/icon.png",
  "./js/app.js",
  "./js/firebase.js",
  "./js/inicio.js",
  "./js/inicio/carregarRanking.js",
  "./js/criar.js",
];

// Instala o Service Worker e guarda os arquivos no cache.
// Usamos cache.add() individualmente (em vez de cache.addAll) porque addAll()
// falha por inteiro se UM ÚNICO arquivo da lista não existir — isso fazia o
// Service Worker inteiro falhar ao instalar. Assim, cada arquivo que falhar
// só gera um aviso no console, sem quebrar o resto do cache.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const resultados = await Promise.allSettled(
        ASSETS.map((asset) => cache.add(asset))
      );

      resultados.forEach((resultado, i) => {
        if (resultado.status === "rejected") {
          console.warn("Não foi possível cachear:", ASSETS[i], resultado.reason);
        }
      });
    })
  );
  self.skipWaiting();
});

// Limpa caches antigos quando uma nova versão assume o controle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("Removendo cache antigo:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Serve os arquivos do cache (abre instantâneo) e cacheia dinamicamente
// qualquer página/arquivo novo que ainda não estava na lista ASSETS
// (ex: partidas.html, ranking.html, mais.html), pra elas também ficarem
// disponíveis offline depois da primeira visita.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;

      return fetch(event.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200 && respostaRede.type === "basic") {
            const copia = respostaRede.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return respostaRede;
        })
        .catch(() => {
          // Sem cache e sem rede — não há muito o que fazer aqui além de deixar falhar.
        });
    })
  );
});

// Escuta o comando do botão "Atualizar Agora" vindo do script.js
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
