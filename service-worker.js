// 1. Toda vez que atualizar o app, mude o número dessa versão (ex: v1, v2, v3...)
const CACHE_NAME = 'pelada-pro-cache-v0.0.1'; 

const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  // Adicione aqui os caminhos para suas imagens ou ícones se houver
];

// Instala o Service Worker e guarda os arquivos no cache do celular
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // Força o Service Worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// Limpa caches antigos quando uma nova versão assume o controle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Serve os arquivos do cache (faz o app abrir instantaneamente)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});