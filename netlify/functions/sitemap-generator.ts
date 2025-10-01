import type { Handler } from '@netlify/functions'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/xml'
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { queryStringParameters } = event
    const siteSlug = queryStringParameters?.site || ''
    const format = queryStringParameters?.format || 'xml'

    if (!siteSlug) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site slug é obrigatório' 
        })
      }
    }

    // Buscar dados do site
    const siteData = await getSiteData(siteSlug)
    
    if (format === 'xml') {
      const sitemap = generateSitemapXML(siteData)
      return {
        statusCode: 200,
        headers,
        body: sitemap
      }
    } else {
      const sitemapData = generateSitemapJSON(siteData)
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(sitemapData)
      }
    }

  } catch (error) {
    console.error('Erro na geração de sitemap:', error)
    
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

async function getSiteData(siteSlug: string) {
  // Buscar dados do site da API do Google Apps Script
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8080'
    const response = await fetch(`${baseUrl}/.netlify/functions/client-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_site', siteSlug })
    })

    if (response.ok) {
      const data = await response.json()
      return data.site || {}
    }
  } catch (error) {
    console.error('Erro ao buscar dados do site:', error)
  }

  // Dados padrão se não conseguir buscar
  return {
    name: siteSlug,
    type: 'Negócio Local',
    location: 'Brasil',
    domain: `https://${siteSlug}.netlify.app`
  }
}

function generateSitemapXML(siteData: any): string {
  const baseUrl = siteData.domain || `https://${siteData.name?.toLowerCase().replace(/\s+/g, '')}.netlify.app`
  const lastmod = new Date().toISOString().split('T')[0]

  const pages = [
    { url: baseUrl, priority: '1.0', changefreq: 'weekly' },
    { url: `${baseUrl}/sobre`, priority: '0.8', changefreq: 'monthly' },
    { url: `${baseUrl}/servicos`, priority: '0.9', changefreq: 'weekly' },
    { url: `${baseUrl}/contato`, priority: '0.7', changefreq: 'monthly' },
    { url: `${baseUrl}/portfolio`, priority: '0.6', changefreq: 'monthly' },
    { url: `${baseUrl}/blog`, priority: '0.8', changefreq: 'weekly' }
  ]

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  pages.forEach(page => {
    sitemap += '  <url>\n'
    sitemap += `    <loc>${page.url}</loc>\n`
    sitemap += `    <lastmod>${lastmod}</lastmod>\n`
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`
    sitemap += `    <priority>${page.priority}</priority>\n`
    sitemap += '  </url>\n'
  })

  sitemap += '</urlset>'
  return sitemap
}

function generateSitemapJSON(siteData: any) {
  const baseUrl = siteData.domain || `https://${siteData.name?.toLowerCase().replace(/\s+/g, '')}.netlify.app`
  const lastmod = new Date().toISOString().split('T')[0]

  return {
    ok: true,
    sitemap: {
      baseUrl,
      lastGenerated: new Date().toISOString(),
      pages: [
        {
          path: '/',
          url: baseUrl,
          title: `${siteData.name} - Página Inicial`,
          priority: 1.0,
          changefreq: 'weekly',
          lastmod
        },
        {
          path: '/sobre',
          url: `${baseUrl}/sobre`,
          title: `Sobre - ${siteData.name}`,
          priority: 0.8,
          changefreq: 'monthly',
          lastmod
        },
        {
          path: '/servicos',
          url: `${baseUrl}/servicos`,
          title: `Serviços - ${siteData.name}`,
          priority: 0.9,
          changefreq: 'weekly',
          lastmod
        },
        {
          path: '/contato',
          url: `${baseUrl}/contato`,
          title: `Contato - ${siteData.name}`,
          priority: 0.7,
          changefreq: 'monthly',
          lastmod
        },
        {
          path: '/portfolio',
          url: `${baseUrl}/portfolio`,
          title: `Portfólio - ${siteData.name}`,
          priority: 0.6,
          changefreq: 'monthly',
          lastmod
        },
        {
          path: '/blog',
          url: `${baseUrl}/blog`,
          title: `Blog - ${siteData.name}`,
          priority: 0.8,
          changefreq: 'weekly',
          lastmod
        }
      ]
    }
  }
}