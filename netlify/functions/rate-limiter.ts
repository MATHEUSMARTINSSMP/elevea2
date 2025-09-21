import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, getClientIdentifier, isVipEndpoint, verifyVipAccess } from './shared/security'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
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
        try {
          await rateLimitMiddleware(endpoint, event)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              allowed: true,
              endpoint,
              client: getClientIdentifier(event)
            })
          }
        } catch (error) {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
              ok: false,
              allowed: false,
              error: error.message,
              endpoint
            })
          }
        }
      
      case 'get_status':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            status: 'Rate limiter ativo',
            endpoint,
            client: getClientIdentifier(event)
          })
        }
      
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