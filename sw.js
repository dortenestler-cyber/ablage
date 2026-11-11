const V='ablage-v2';const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./css/app.css?v=2','./js/01-core.js?v=2','./js/02-sync.js?v=2','./js/03-views.js?v=2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))));self.skipWaiting()});
/* Nur eigene Caches (Präfix ablage-) aufräumen: CashFlow liegt am selben Ursprung. */
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('ablage-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;
  const nav=e.request.mode==='navigate';
  e.respondWith(fetch(nav?new Request(e.request.url,{cache:'no-store'}):e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
