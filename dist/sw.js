// Service Worker para PWA Elevea Dashboard
const CACHE_NAME = 'elevea-dashboard-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Recursos essenciais para cache
const ESSENTIAL_CACHE = [
  '/',
  '/client',
  '/admin',
  '/manifest.json',
  '/logo-elevea.png',
  '/favicon.ico'
];

// Recursos de interface para cache
const STATIC_CACHE = [
  // CSS e JS serão adicionados dinamicamente
];

// API endpoints para cache estratégico
const API_CACHE_PATTERNS = [
  /\/api\/sheets\//,
  /\/api\/client\//,
  /\/netlify\/functions\//
];

// ===== INSTALAÇÃO =====
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker instalando...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache recursos essenciais
        await cache.addAll(ESSENTIAL_CACHE);
        
        // Cache página offline
        await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        
        console.log('✅ Cache inicial criado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao criar cache inicial:', error);
      }
    })()
  );
  
  // Força ativação imediata
  self.skipWaiting();
});

// ===== ATIVAÇÃO =====
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker ativando...');
  
  event.waitUntil(
    (async () => {
      // Limpa caches antigos
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
      
      // Toma controle imediato
      await self.clients.claim();
      
      console.log('✅ Service Worker ativado');
    })()
  );
});

// ===== ESTRATÉGIAS DE CACHE =====

// Network First (para APIs dinâmicas)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache respostas bem-sucedidas
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('🔄 Fallback para cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retorna página offline para navegação
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

// Cache First (para recursos estáticos)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

// Stale While Revalidate (para recursos que mudam ocasionalmente)
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      const cache = caches.open(CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => {
    // Silently fail on network errors
  });
  
  return cachedResponse || fetchPromise;
}

// ===== INTERCEPTAÇÃO DE REQUESTS =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requests externos (exceto APIs conhecidas)
  if (url.origin !== self.location.origin && !url.hostname.includes('netlify')) {
    return;
  }
  
  // Estratégia baseada no tipo de request
  if (request.method !== 'GET') {
    return; // Não cacheamos POST/PUT/DELETE
  }
  
  let strategy;
  
  // APIs dinâmicas - Network First
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    strategy = networkFirst;
  }
  // Recursos estáticos - Cache First  
  else if (url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|svg|ico|woff|woff2)$/)) {
    strategy = cacheFirst;
  }
  // Páginas HTML - Stale While Revalidate
  else if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    strategy = staleWhileRevalidate;
  }
  // Outros recursos - Cache First
  else {
    strategy = cacheFirst;
  }
  
  event.respondWith(strategy(request));
});

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-data-sync') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  try {
    // Sincronizar dados offline pendentes
    const pendingData = await getStoredOfflineData();
    
    for (const item of pendingData) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        // Remove item sincronizado
        await removeOfflineData(item.id);
      } catch (error) {
        console.log('⏳ Item permanece pendente:', item.id);
      }
    }
  } catch (error) {
    console.error('❌ Erro no background sync:', error);
  }
}

// Helpers para dados offline
async function getStoredOfflineData() {
  // Implementar IndexedDB ou localStorage para dados pendentes
  return JSON.parse(localStorage.getItem('offline-pending-data') || '[]');
}

async function removeOfflineData(id) {
  const pending = await getStoredOfflineData();
  const filtered = pending.filter(item => item.id !== id);
  localStorage.setItem('offline-pending-data', JSON.stringify(filtered));
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/logo-elevea.png',
    badge: '/logo-elevea.png',
    tag: data.tag || 'elevea-notification',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Abrir Dashboard'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

console.log('🚀 Elevea PWA Service Worker carregado!');