/* Service Worker de Fototeca Gris y Negro
   Estrategia de caché optimizada para dispositivos móviles y redes lentas:
   - Stale-While-Revalidate para estáticos (CSS, JS, imágenes, fuentes)
   - Network-First con fallback a caché para vistas y datos JSON
   - Limpieza automática de versiones anteriores
*/

const CACHE_NAME="fototeca-gyn-v1";
const PRECACHE_ASSETS=[
  "./",
  "./index.html",
  "./src/css/base.css",
  "./src/css/gallery.css",
  "./src/css/viewer.css",
  "./src/js/core.js",
  "./src/ajax/http.js",
  "./src/ajax/api.js",
  "./src/js/main.js",
  "./src/js/site.js",
  "./src/js/gallery.js",
  "./src/js/viewer.js",
  "./src/views/header.html",
  "./src/views/home.html",
  "./src/views/viewer.html",
  "./src/icons/favicon.svg",
  "./src/icons/favicon.ico",
  "./src/icons/apple-touch-icon.png",
  "./src/icons/share.png",
  "./src/data/site.json",
  "./src/img/manifest.json"
];

// Instalación: precarga de la estructura básica (App Shell)
self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>{
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url=>
          cache.add(url).catch(err=>console.warn("[SW] No se pudo precargar:",url,err))
        )
      );
    }).then(()=>self.skipWaiting())
  );
});

// Activación: limpieza de cachés antiguas
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(
        keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
      );
    }).then(()=>self.clients.claim())
  );
});

// Intercepción de peticiones con estrategia adaptativa
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;

  const url=new URL(req.url);

  // 1. Navegación HTML (Network First con fallback a index.html en caché)
  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).catch(()=>caches.match("./index.html").then(res=>res||caches.match("./")))
    );
    return;
  }

  // 2. Archivos estáticos: CSS, JS, imágenes, iconos, fuentes de Google
  const isStatic=/\.(?:css|js|jpe?g|png|webp|svg|gif|avif|ico|woff2?)$/i.test(url.pathname)
    ||url.hostname.includes("fonts.gstatic.com")
    ||url.hostname.includes("cdnjs.cloudflare.com")
    ||url.hostname.includes("cdn.jsdelivr.net");

  if(isStatic){
    // Stale-While-Revalidate: entrega desde caché de inmediato y actualiza en segundo plano
    event.respondWith(
      caches.open(CACHE_NAME).then(cache=>{
        return cache.match(req).then(cachedResponse=>{
          const fetchPromise=fetch(req).then(networkResponse=>{
            if(networkResponse&&networkResponse.status===200){
              cache.put(req,networkResponse.clone());
            }
            return networkResponse;
          }).catch(()=>cachedResponse);

          return cachedResponse||fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Datos JSON o vistas parciales (Network-first con fallback a caché)
  if(/\.json$/i.test(url.pathname)||url.pathname.includes("/ajax/")||url.pathname.includes("/views/")){
    event.respondWith(
      fetch(req).then(networkResponse=>{
        if(networkResponse&&networkResponse.status===200){
          const clone=networkResponse.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req,clone));
        }
        return networkResponse;
      }).catch(()=>caches.match(req))
    );
  }
});
