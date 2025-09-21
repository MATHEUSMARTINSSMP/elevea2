import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

interface RateLimitConfig {
  windowMs: number;      // Janela de tempo em ms
  maxRequests: number;   // Máximo de requests por janela
  keyGenerator: (event: any) => string; // Gerador de chave única
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Storage em memória (em produção usar Redis/Database)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configurações por endpoint
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // APIs IA - mais restritivas
  'auto-seo': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 10,          // 10 análises por minuto
    keyGenerator: (event) => `seo:${getClientIdentifier(event)}`
  },
  'lead-scoring': {
    windowMs: 60 * 1000,      // 1 minuto  
    maxRequests: 20,          // 20 scoring por minuto
    keyGenerator: (event) => `leads:${getClientIdentifier(event)}`
  },
  'whatsapp-webhook': {
    windowMs: 10 * 1000,      // 10 segundos
    maxRequests: 50,          // 50 webhooks por 10s
    keyGenerator: (event) => `whatsapp:${getClientIdentifier(event)}`
  },
  'ai-copywriter': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 15,          // 15 gerações por minuto
    keyGenerator: (event) => `copy:${getClientIdentifier(event)}`
  },
  // APIs gerais - menos restritivas
  'client-api': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 100,         // 100 requests por minuto
    keyGenerator: (event) => `client:${getClientIdentifier(event)}`
  },
  'assets': {
    windowMs: 60 * 1000,      // 1 minuto
    maxRequests: 30,          // 30 uploads por minuto
    keyGenerator: (event) => `assets:${getClientIdentifier(event)}`
  }
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { action, endpoint, siteSlug, vipPin } = body

    // Verificar acesso VIP para funcionalidades premium
    if (isVipEndpoint(endpoint)) {
      const isVipValid = await verifyVipAccess(siteSlug, vipPin)
      if (!isVipValid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'Acesso VIP requerido para esta funcionalidade' 
          })
        }
      }
    }

    switch (action) {
      case 'check_limit':
        return await checkRateLimit(endpoint, event)
      
      case 'get_status':
        return await getRateLimitStatus(endpoint, event)
      
      case 'reset_limits':
        return await resetRateLimits(siteSlug, vipPin)
      
      case 'get_config':
        return await getRateLimitConfig()
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ação inválida' })
        }
    }

  } catch (error) {
    console.error('Erro no rate limiter:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

async function checkRateLimit(endpoint: string, event: any) {
  try {
    const config = RATE_LIMITS[endpoint]
    if (!config) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          allowed: true,
          message: 'Endpoint sem limite configurado'
        })
      }
    }

    const key = config.keyGenerator(event)
    const now = Date.now()
    
    // Limpar entradas expiradas
    cleanupExpiredEntries()
    
    let entry = rateLimitStore.get(key)
    
    if (!entry) {
      // Primeira requisição
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      }
      rateLimitStore.set(key, entry)
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': (config.maxRequests - 1).toString(),
          'X-RateLimit-Reset': entry.resetTime.toString()
        },
        body: JSON.stringify({
          ok: true,
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: entry.resetTime
        })
      }
    }

    // Verificar se a janela expirou
    if (now >= entry.resetTime) {
      // Reset da janela
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      }
      rateLimitStore.set(key, entry)
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': (config.maxRequests - 1).toString(),
          'X-RateLimit-Reset': entry.resetTime.toString()
        },
        body: JSON.stringify({
          ok: true,
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: entry.resetTime
        })
      }
    }

    // Verificar limite
    if (entry.count >= config.maxRequests) {
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
        },
        body: JSON.stringify({
          ok: false,
          allowed: false,
          error: 'Rate limit exceeded',
          message: `Muitas requisições. Limite: ${config.maxRequests} por ${config.windowMs / 1000}s`,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
          resetTime: entry.resetTime
        })
      }
    }

    // Incrementar contador
    entry.count++
    rateLimitStore.set(key, entry)

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': (config.maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': entry.resetTime.toString()
      },
      body: JSON.stringify({
        ok: true,
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime
      })
    }

  } catch (error) {
    console.error('Erro ao verificar rate limit:', error)
    
    // Em caso de erro, permitir a requisição
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        allowed: true,
        message: 'Rate limiter temporariamente indisponível'
      })
    }
  }
}

async function getRateLimitStatus(endpoint: string, event: any) {
  try {
    const config = RATE_LIMITS[endpoint]
    if (!config) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          status: 'no-limit',
          message: 'Endpoint sem limite configurado'
        })
      }
    }

    const key = config.keyGenerator(event)
    const entry = rateLimitStore.get(key)
    const now = Date.now()

    if (!entry || now >= entry.resetTime) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          status: 'available',
          limit: config.maxRequests,
          remaining: config.maxRequests,
          resetTime: null,
          windowMs: config.windowMs
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        status: entry.count >= config.maxRequests ? 'exceeded' : 'active',
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetTime: entry.resetTime,
        windowMs: config.windowMs,
        timeUntilReset: Math.max(0, entry.resetTime - now)
      })
    }

  } catch (error) {
    console.error('Erro ao obter status:', error)
    throw error
  }
}

async function resetRateLimits(siteSlug: string, vipPin: string) {
  try {
    // Verificar acesso admin/VIP para reset
    const isVipValid = await verifyVipAccess(siteSlug, vipPin)
    if (!isVipValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Acesso VIP requerido para reset de limites' 
        })
      }
    }

    // Reset de limites para o site específico
    const keysToDelete: string[] = []
    for (const [key, entry] of rateLimitStore.entries()) {
      if (key.includes(siteSlug)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => rateLimitStore.delete(key))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: `Reset realizado para ${keysToDelete.length} endpoints`,
        resetKeys: keysToDelete
      })
    }

  } catch (error) {
    console.error('Erro ao resetar limites:', error)
    throw error
  }
}

async function getRateLimitConfig() {
  try {
    const configSummary = Object.entries(RATE_LIMITS).map(([endpoint, config]) => ({
      endpoint,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      windowSeconds: config.windowMs / 1000
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        configs: configSummary,
        totalEndpoints: configSummary.length
      })
    }

  } catch (error) {
    console.error('Erro ao obter configuração:', error)
    throw error
  }
}

function getClientIdentifier(event: any): string {
  // Gerar identificador único baseado em múltiplos fatores
  const body = JSON.parse(event.body || '{}')
  const siteSlug = body.siteSlug || 'unknown'
  const ip = event.headers['x-forwarded-for'] || 
             event.headers['x-real-ip'] || 
             'unknown'
  
  // Combinar site + IP para identificação única
  return `${siteSlug}:${ip.split(',')[0].trim()}`
}

function isVipEndpoint(endpoint: string): boolean {
  const vipEndpoints = ['auto-seo', 'lead-scoring', 'ai-copywriter']
  return vipEndpoints.includes(endpoint)
}

function cleanupExpiredEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

async function verifyVipAccess(siteSlug: string, vipPin: string): Promise<boolean> {
  try {
    if (!siteSlug || !vipPin) return false
    
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8080'
    const response = await fetch(`${baseUrl}/.netlify/functions/client-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_settings', siteSlug })
    })

    if (response.ok) {
      const data = await response.json()
      return data.settings?.vipPin === vipPin
    }
    return false
  } catch (error) {
    console.error('Erro ao verificar VIP:', error)
    return false
  }
}

// Middleware helper para uso em outras funções
export async function rateLimitMiddleware(endpoint: string, event: any) {
  const response = await checkRateLimit(endpoint, event)
  const result = JSON.parse(response.body)
  
  if (response.statusCode === 429) {
    throw new Error(`Rate limit exceeded for ${endpoint}: ${result.message}`)
  }
  
  return result
}