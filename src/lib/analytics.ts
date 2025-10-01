// src/lib/analytics.ts
// Sistema de rastreamento de analytics para sites dos clientes

const GAS_URL = import.meta.env.VITE_GAS_BASE_URL || import.meta.env.ELEVEA_GAS_URL;
const SITE_SLUG = import.meta.env.ELEVEA_SITE_SLUG;

// Interface para dados de analytics
interface AnalyticsHit {
  path: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  userAgent?: string;
  ip?: string;
}

interface AnalyticsEvent {
  event: string;
  category: string;
  value?: number;
  metadata?: Record<string, any>;
}

// Detectar informações do dispositivo
function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*Tablet)|Windows Phone/i.test(userAgent);
  
  let device = 'desktop';
  if (isTablet) device = 'tablet';
  else if (isMobile) device = 'mobile';
  
  return {
    device,
    userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

// Detectar informações de geolocalização (se permitido)
async function getLocationInfo() {
  try {
    // Usar uma API de geolocalização por IP (exemplo)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      timezone: data.timezone
    };
  } catch (error) {
    console.warn('Não foi possível obter informações de localização:', error);
    return null;
  }
}

// Extrair parâmetros UTM da URL
function getUTMParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    source: urlParams.get('utm_source'),
    medium: urlParams.get('utm_medium'),
    campaign: urlParams.get('utm_campaign'),
    term: urlParams.get('utm_term'),
    content: urlParams.get('utm_content')
  };
}

// Enviar hit para o GAS
export async function recordHit(data: Partial<AnalyticsHit> = {}) {
  try {
    const deviceInfo = getDeviceInfo();
    const locationInfo = await getLocationInfo();
    const utmParams = getUTMParams();
    
    const hitData = {
      site: SITE_SLUG,
      path: data.path || window.location.pathname,
      referrer: data.referrer || document.referrer,
      utm: { ...utmParams, ...data.utm },
      userAgent: deviceInfo.userAgent,
      device: deviceInfo.device,
      screen: deviceInfo.screen,
      viewport: deviceInfo.viewport,
      location: locationInfo,
      timestamp: new Date().toISOString(),
      ...data
    };

    const response = await fetch(`${GAS_URL}?type=recordHit_&site=${encodeURIComponent(SITE_SLUG)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hitData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao registrar hit:', error);
    return { ok: false, error: error.message };
  }
}

// Enviar evento para o GAS
export async function recordEvent(data: AnalyticsEvent & { site?: string }) {
  try {
    const deviceInfo = getDeviceInfo();
    const siteSlug = data.site || SITE_SLUG;
    
    // Se não tem site, não registrar evento
    if (!siteSlug) {
      console.warn('Analytics ignorado - site não fornecido');
      return { ok: true, message: 'Analytics ignorado' };
    }
    
    const eventData = {
      site: siteSlug,
      event: data.event,
      category: data.category,
      value: data.value || 0,
      metadata: {
        ...data.metadata,
        device: deviceInfo.device,
        timestamp: new Date().toISOString()
      }
    };

    const response = await fetch(`${GAS_URL}?type=recordEvent_&site=${encodeURIComponent(siteSlug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
    return { ok: false, error: error.message };
  }
}

// Rastrear tempo na página
let pageStartTime: number;
let timeOnPageInterval: NodeJS.Timeout;

export function startPageTracking() {
  pageStartTime = Date.now();
  
  // Enviar hit inicial
  recordHit();
  
  // Rastrear tempo na página a cada 30 segundos
  timeOnPageInterval = setInterval(() => {
    const timeOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
    recordEvent({
      event: 'time_on_page',
      category: 'engagement',
      value: timeOnPage,
      metadata: { path: window.location.pathname }
    });
  }, 30000);
}

export function stopPageTracking() {
  if (timeOnPageInterval) {
    clearInterval(timeOnPageInterval);
  }
  
  // Enviar tempo final na página
  if (pageStartTime) {
    const timeOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
    recordEvent({
      event: 'page_exit',
      category: 'engagement',
      value: timeOnPage,
      metadata: { path: window.location.pathname }
    });
  }
}

// Rastrear scroll depth
let maxScrollDepth = 0;
let scrollDepthInterval: NodeJS.Timeout;

export function startScrollTracking() {
  maxScrollDepth = 0;
  
  const trackScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
      
      // Enviar eventos de scroll em marcos de 25%
      if (scrollPercent >= 25 && scrollPercent < 50 && maxScrollDepth < 50) {
        recordEvent({
          event: 'scroll_25',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      } else if (scrollPercent >= 50 && scrollPercent < 75 && maxScrollDepth < 75) {
        recordEvent({
          event: 'scroll_50',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      } else if (scrollPercent >= 75 && scrollPercent < 100 && maxScrollDepth < 100) {
        recordEvent({
          event: 'scroll_75',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      } else if (scrollPercent >= 100) {
        recordEvent({
          event: 'scroll_100',
          category: 'engagement',
          metadata: { path: window.location.pathname }
        });
      }
    }
  };
  
  window.addEventListener('scroll', trackScroll);
  
  // Enviar scroll depth final quando sair da página
  window.addEventListener('beforeunload', () => {
    recordEvent({
      event: 'scroll_depth',
      category: 'engagement',
      value: maxScrollDepth,
      metadata: { path: window.location.pathname }
    });
  });
}

// Rastrear cliques em elementos
export function trackClicks(selector: string, eventName: string, category: string = 'interaction') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches(selector)) {
      recordEvent({
        event: eventName,
        category: category,
        metadata: {
          path: window.location.pathname,
          element: target.tagName,
          text: target.textContent?.substring(0, 100),
          href: (target as HTMLAnchorElement).href
        }
      });
    }
  });
}

// Rastrear formulários
export function trackFormSubmissions(formSelector: string = 'form') {
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    if (form.matches(formSelector)) {
      recordEvent({
        event: 'form_submit',
        category: 'conversion',
        metadata: {
          path: window.location.pathname,
          formId: form.id,
          formAction: form.action,
          formMethod: form.method
        }
      });
    }
  });
}

// Rastrear downloads
export function trackDownloads(linkSelector: string = 'a[download], a[href*=".pdf"], a[href*=".doc"], a[href*=".zip"]') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    if (link && link.matches(linkSelector)) {
      recordEvent({
        event: 'download',
        category: 'engagement',
        metadata: {
          path: window.location.pathname,
          downloadUrl: link.href,
          downloadText: link.textContent?.substring(0, 100)
        }
      });
    }
  });
}

// Rastrear links externos
export function trackExternalLinks(linkSelector: string = 'a[href^="http"]:not([href*="' + window.location.hostname + '"])') {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    if (link && link.matches(linkSelector)) {
      recordEvent({
        event: 'external_link',
        category: 'engagement',
        metadata: {
          path: window.location.pathname,
          externalUrl: link.href,
          linkText: link.textContent?.substring(0, 100)
        }
      });
    }
  });
}

// Inicializar rastreamento completo
export function initAnalytics() {
  // Iniciar rastreamento de página
  startPageTracking();
  
  // Iniciar rastreamento de scroll
  startScrollTracking();
  
  // Rastrear cliques em CTAs
  trackClicks('button[data-cta], .cta-button, .btn-primary', 'cta_click', 'conversion');
  
  // Rastrear cliques em WhatsApp
  trackClicks('a[href*="wa.me"], a[href*="whatsapp.com"], .whatsapp-button', 'whatsapp_click', 'conversion');
  
  // Rastrear cliques em telefone
  trackClicks('a[href^="tel:"]', 'phone_click', 'conversion');
  
  // Rastrear cliques em email
  trackClicks('a[href^="mailto:"]', 'email_click', 'conversion');
  
  // Rastrear formulários
  trackFormSubmissions();
  
  // Rastrear downloads
  trackDownloads();
  
  // Rastrear links externos
  trackExternalLinks();
  
  // Rastrear saída da página
  window.addEventListener('beforeunload', stopPageTracking);
  
  console.log('Analytics inicializado com sucesso');
}

// Função para enviar feedback
export async function submitFeedback(data: {
  name: string;
  email?: string;
  phone?: string;
  rating: number;
  message: string;
}) {
  try {
    const response = await fetch(`${GAS_URL}?type=feedback&action=submit&site=${encodeURIComponent(SITE_SLUG)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Rastrear envio de feedback
    if (result.ok) {
      recordEvent({
        event: 'feedback_submit',
        category: 'conversion',
        value: data.rating,
        metadata: {
          hasEmail: !!data.email,
          hasPhone: !!data.phone,
          messageLength: data.message.length
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao enviar feedback:', error);
    return { ok: false, error: error.message };
  }
}

// Função para buscar feedbacks públicos
export async function getPublicFeedbacks() {
  try {
    const response = await fetch(`${GAS_URL}?type=feedback&action=get_public&site=${encodeURIComponent(SITE_SLUG)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    return { ok: false, data: { feedbacks: [] } };
  }
}

// Hook useAnalytics para React
export function useAnalytics() {
  return {
    trackEvent: (event: string, properties?: Record<string, any>) => {
      recordEvent({
        event,
        category: 'user_action',
        metadata: properties
      });
    },
    trackPage: (pageName: string, properties?: Record<string, any>) => {
      recordHit({
        path: window.location.pathname,
        ...properties
      });
    },
    setUserProperty: (key: string, value: any) => {
      // Implementar se necessário
      console.log('User property set:', key, value);
    }
  };
}

// Funções de identificação de usuário
export function identifyUser(user: any, hasConsent: boolean = false) {
  console.log('User identified:', user, 'Consent:', hasConsent);
}

export function resetUser() {
  console.log('User reset');
}

// Objeto analytics para compatibilidade
export const analytics = {
  featureUsed: (feature: string, properties?: Record<string, any>) => {
    recordEvent({
      event: 'feature_used',
      category: 'engagement',
      metadata: { feature, ...properties }
    });
  }
};