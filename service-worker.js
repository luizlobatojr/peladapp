const CACHE_NAME = "pelada-pro-cache-v0.0.6";

// Dica: Adicione aqui as outras páginas e blocos de CSS importantes para o app funcionar offline
const ASSETS = [
  "/",
  "/index.html",
  "/pages/index.css",
  
  "/assets/icon/icon.png",

  // Adicione aqui os blocos de CSS específicos que compõem esse dashboard, por exemplo:
  "/blocks/calendario.css",
  "/blocks/estatisticas.css",
  "/script.js",
  "/manifest.json"
];

// Instala o Service Worker e guarda os arquivos no cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // REMOVIDO: self.skipWaiting() daqui para permitir que o usuário controle a atualização pelo botão
});

// Limpa caches antigos quando uma nova versão assume o controle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Removendo cache antigo:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Serve os arquivos do cache (faz o app abrir instantaneamente)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Escuta o comando do botão "Atualizar Agora" vindo do script.js
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});