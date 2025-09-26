// src/utils/devMocks.ts
// Mocks para desenvolvimento local quando funções Netlify não estão disponíveis

interface ClientPlanResponse {
  ok: boolean;
  vip: boolean;
  plan: string;
  status?: string;
  nextCharge?: string | null;
  lastPayment?: { date: string; amount: number } | null;
}

interface StatusResponse {
  ok: boolean;
  siteSlug: string;
  status: string;
  plan: string;
  nextCharge?: string | null;
  lastPayment?: { date: string; amount: number } | null;
  error?: string | null;
}

/**
 * Detecta se estamos em ambiente de desenvolvimento local
 */
export function isLocalDevelopment(): boolean {
  return (
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );
}

/**
 * Mock para /client-plan - simula usuário VIP
 */
export function mockClientPlan(site: string, email: string): ClientPlanResponse {
  console.log('[DEV MOCK] client-plan called for:', { site, email });
  return {
    ok: true,
    vip: true,
    plan: 'vip',
    status: 'active',
    nextCharge: "2025-10-25T10:00:00.000Z", // 25/10/2025 às 10h
    lastPayment: {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias atrás
      amount: 97.00
    }
  };
}

/**
 * Mock para /auth-status - simula usuário VIP
 */
export function mockAuthStatus(site: string): StatusResponse {
  console.log('[DEV MOCK] auth-status called for:', { site });
  return {
    ok: true,
    siteSlug: site,
    status: 'active',
    plan: 'vip',
    nextCharge: "2025-10-25T10:00:00.000Z", // 25/10/2025 às 10h
    lastPayment: {
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 97.00
    },
    error: null
  };
}

/**
 * Mock para /client-api GET settings
 */
export function mockClientSettings(site: string) {
  console.log('[DEV MOCK] client-api settings called for:', { site });
  return {
    ok: true,
    showBrand: true,
    showPhone: true,
    showWhatsApp: true,
    whatsAppNumber: '5596999999999',
    footerText: 'Desenvolvido com 💙 pela Agência Elevea',
    theme: {
      primary: '#D4AF37',
      background: '#ffffff',
      accent: '#1a202c'
    },
    vipPin: '1234'
  };
}

/**
 * Mock para /client-api GET feedbacks
 */
export function mockClientFeedbacks(site: string) {
  console.log('[DEV MOCK] client-api feedbacks called for:', { site });
  return {
    ok: true,
    data: [
      {
        id: 'mock-1',
        name: 'João Silva',
        message: 'Excelente atendimento! Muito satisfeito com o serviço.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        approved: true,
        email: 'joao@email.com',
        sentiment: {
          rating: 5,
          confidence: 0.95,
          emotion: 'joy',
          summary: 'Cliente muito satisfeito'
        }
      },
      {
        id: 'mock-2',
        name: 'Maria Santos',
        message: 'Ótima qualidade, recomendo!',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        approved: true,
        email: 'maria@email.com',
        sentiment: {
          rating: 4,
          confidence: 0.88,
          emotion: 'satisfaction',
          summary: 'Experiência positiva'
        }
      }
    ],
    total: 2,
    page: 1,
    pageSize: 20
  };
}

/**
 * Mock para /auth-session - simula sessão do usuário de desenvolvimento
 */
export function mockAuthSession(action: string) {
  console.log('[DEV MOCK] auth-session called for action:', action);
  
  if (action === 'me') {
    return {
      ok: true,
      authenticated: true,
      user: {
        login: 'dev',
        siteSlug: 'LOUNGERIEAMAPAGARDEN', 
        plan: 'dev',
        email: 'dev@elevea.com'
      }
    };
  }
  
  if (action === 'logout') {
    return {
      ok: true,
      message: 'Logout successful'
    };
  }
  
  return {
    ok: false,
    error: 'Unknown action'
  };
}

/**
 * Intercepta chamadas para funções Netlify em desenvolvimento
 */
export function interceptNetlifyFunctions(url: string, originalFetch: typeof fetch): Promise<Response> {
  console.log('[INTERCEPTOR] Called with URL:', url);
  console.log('[INTERCEPTOR] Is local development:', isLocalDevelopment());
  
  if (!isLocalDevelopment()) {
    console.log('[INTERCEPTOR] Not local dev, calling original fetch');
    return originalFetch(url);
  }

  // Parse URL
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;
  const params = urlObj.searchParams;
  
  console.log('[INTERCEPTOR] Parsed path:', path);

  let mockData: any = null;

  // client-plan
  if (path === '/.netlify/functions/client-plan') {
    const site = params.get('site') || 'demo';
    const email = params.get('email') || 'demo@elevea.com';
    mockData = mockClientPlan(site, email);
  }
  
  // auth-status  
  else if (path === '/.netlify/functions/auth-status') {
    const site = params.get('site') || 'demo';
    mockData = mockAuthStatus(site);
  }
  
  // client-api
  else if (path === '/.netlify/functions/client-api') {
    const action = params.get('action');
    const site = params.get('site') || 'demo';
    
    if (action === 'get_settings') {
      mockData = mockClientSettings(site);
    } else if (action === 'list_feedbacks') {
      mockData = mockClientFeedbacks(site);
    } else {
      mockData = { ok: true, message: 'Development mock - action not implemented' };
    }
  }
  
  // auth-session
  else if (path === '/.netlify/functions/auth-session') {
    const action = params.get('action') || 'me';
    mockData = mockAuthSession(action);
  }

  // Se tem mock, retorna
  if (mockData) {
    console.log(`[DEV MOCK] ${path} ->`, mockData);
    return Promise.resolve(new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Senão, chama original
  return originalFetch(url);
}