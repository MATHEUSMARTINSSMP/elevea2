import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'text/plain'
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: 'Method not allowed'
    }
  }

  try {
    const { queryStringParameters } = event
    const siteSlug = queryStringParameters?.site || ''
    const environment = queryStringParameters?.env || 'production'

    if (!siteSlug) {
      return {
        statusCode: 400,
        headers,
        body: 'Site slug é obrigatório'
      }
    }

    const robotsTxt = generateRobotsTxt(siteSlug, environment)

    return {
      statusCode: 200,
      headers,
      body: robotsTxt
    }

  } catch (error) {
    console.error('Erro na geração de robots.txt:', error)
    
    return {
      statusCode: 500,
      headers,
      body: 'Erro interno do servidor'
    }
  }
}

function generateRobotsTxt(siteSlug: string, environment: string): string {
  const baseUrl = `https://${siteSlug}.netlify.app`
  
  if (environment === 'development' || environment === 'staging') {
    // Em desenvolvimento, bloquear todos os bots
    return `User-agent: *
Disallow: /

# Desenvolvimento/Staging - Não indexar
Sitemap: ${baseUrl}/sitemap.xml`
  }

  // Em produção, permitir indexação otimizada
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /.netlify/
Disallow: /api/
Disallow: /*?*
Disallow: /dashboard/
Disallow: /client/

# Bots específicos
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 2

# SEO otimizado
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/.netlify/functions/sitemap-generator?site=${siteSlug}&format=xml

# Informações adicionais
# Última atualização: ${new Date().toISOString().split('T')[0]}
# Gerado automaticamente pela Elevea`
}