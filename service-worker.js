const CACHE_NAME = 'fletapp-pwa-cache-v1';
// Esta lista contiene los archivos esenciales para el shell de la aplicación.
// Todas las rutas deben ser absolutas desde la raíz.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Iconos de manifest.json
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png'
];

// Instala el service worker y cachea el app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        // addAll() es atómico, si un archivo falla, toda la operación falla.
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepta las solicitudes de red y sirve desde la caché si está disponible
self.addEventListener('fetch', event => {
  event.respondWith(
    // Intenta encontrar una coincidencia en la caché
    caches.match(event.request)
      .then(cachedResponse => {
        // Si se encuentra una respuesta en caché, la devuelve.
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si no está en la caché, la solicita a la red.
        // Clonamos el stream de la solicitud porque solo se puede consumir una vez.
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          networkResponse => {
            // Comprueba si recibimos una respuesta válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clonamos el stream de la respuesta porque solo se puede consumir una vez.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Añade la nueva respuesta a la caché.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
    );
});

// Limpia las cachés antiguas en la activación
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});