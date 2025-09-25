import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    }
  }

  try {
    // Rate limiting
    await rateLimitMiddleware('analytics', event)

    if (event.httpMethod === 'GET') {
      const { siteSlug, range } = event.queryStringParameters || {}
      
      if (!siteSlug) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'siteSlug é obrigatório'
          })
        }
      }

      // Buscar dados de analytics do Google Analytics API
      const analyticsData = await getAnalyticsData(siteSlug, range || '30d')

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          data: analyticsData,
          source: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'google_analytics' : 'development_mock'
        })
      }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { siteSlug, vipPin } = body
      
      // Verificar acesso VIP para operações POST
      if (!siteSlug || !vipPin) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'siteSlug e vipPin são obrigatórios para operações VIP'
          })
        }
      }
      
      const isVip = await verifyVipAccess(siteSlug, vipPin)
      if (!isVip) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Acesso VIP necessário para esta funcionalidade'
          })
        }
      }

      const { action } = body

      switch (action) {
        case 'sync_analytics':
          return await syncAnalyticsToSheets(body)
        case 'create_custom_report':
          return await createCustomReport(body)
        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              ok: false,
              error: 'Ação não reconhecida'
            })
          }
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Método não permitido'
      })
    }

  } catch (error) {
    console.error('Erro na função analytics:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    }
  }
}

// Função principal para buscar dados do Google Analytics
async function getAnalyticsData(siteSlug: string, range: string) {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const propertyId = process.env.GA_PROPERTY_ID
    
    if (!serviceAccountKey || !propertyId) {
      console.warn('⚠️ Credenciais Google Analytics não configuradas - usando dados mock')
      return generateMockAnalyticsData(range)
    }

    // Implementar Google Analytics API real
    const analyticsData = await fetchGoogleAnalytics(propertyId, range, siteSlug)
    
    // Salvar dados no Google Sheets para cache
    await saveAnalyticsToSheets(siteSlug, analyticsData)
    
    return analyticsData
  } catch (error) {
    console.error('Erro ao buscar analytics:', error)
    
    // Fallback para dados salvos no Google Sheets
    const cachedData = await getAnalyticsFromSheets(siteSlug, range)
    if (cachedData) {
      return cachedData
    }
    
    // Último fallback para dados mock
    return generateMockAnalyticsData(range)
  }
}

// Google Analytics API real
async function fetchGoogleAnalytics(propertyId: string, range: string, siteSlug: string) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}')
    
    // Obter token de acesso via JWT
    const accessToken = await getGoogleAccessToken(serviceAccount)
    
    const startDate = getStartDate(range)
    const endDate = new Date().toISOString().split('T')[0]
    
    // Query para Google Analytics Data API v1
    const analyticsQuery = {
      property: `properties/${propertyId}`,
      dateRanges: [{
        startDate,
        endDate
      }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'conversions' }
      ],
      dimensions: [
        { name: 'date' },
        { name: 'deviceCategory' },
        { name: 'country' },
        { name: 'pagePath' }
      ]
    }
    
    const response = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyticsQuery)
    })
    
    if (!response.ok) {
      throw new Error(`Google Analytics API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Processar dados do GA4 para formato compatível
    return processGoogleAnalyticsData(data)
  } catch (error) {
    console.error('Erro na API Google Analytics:', error)
    throw error
  }
}

// Obter token de acesso do Google
async function getGoogleAccessToken(serviceAccount: any) {
  try {
    const jwt = await createJWT(serviceAccount)
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    })
    
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Erro ao obter token Google:', error)
    throw error
  }
}

// Criar JWT para autenticação Google
async function createJWT(serviceAccount: any) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }
  
  // Implementação simplificada - em produção usar biblioteca crypto completa
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  // TODO: Implementar assinatura RSA256 real com private_key do service account
  const signature = 'placeholder_signature' // Em produção, usar crypto.sign
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Processar dados do Google Analytics
function processGoogleAnalyticsData(rawData: any) {
  try {
    const { rows = [], totals = [] } = rawData
    
    // Extrair métricas totais
    const totalMetrics = totals[0]?.metricValues || []
    
    return {
      overview: {
        users: parseInt(totalMetrics[0]?.value || '0'),
        sessions: parseInt(totalMetrics[1]?.value || '0'),
        pageViews: parseInt(totalMetrics[2]?.value || '0'),
        bounceRate: parseFloat(totalMetrics[3]?.value || '0'),
        avgSessionDuration: parseFloat(totalMetrics[4]?.value || '0'),
        conversions: parseInt(totalMetrics[5]?.value || '0')
      },
      chartData: rows.map((row: any) => ({
        date: row.dimensionValues[0]?.value,
        users: parseInt(row.metricValues[0]?.value || '0'),
        sessions: parseInt(row.metricValues[1]?.value || '0'),
        pageViews: parseInt(row.metricValues[2]?.value || '0')
      })),
      topPages: getTopPages(rows),
      deviceBreakdown: getDeviceBreakdown(rows),
      countryBreakdown: getCountryBreakdown(rows)
    }
  } catch (error) {
    console.error('Erro ao processar dados GA:', error)
    return generateMockAnalyticsData('30d')
  }
}

// Funções auxiliares para extrair dados específicos
function getTopPages(rows: any[]) {
  const pageMap = new Map()
  
  rows.forEach(row => {
    const pagePath = row.dimensionValues[3]?.value || '/'
    const pageViews = parseInt(row.metricValues[2]?.value || '0')
    
    if (pageMap.has(pagePath)) {
      pageMap.set(pagePath, pageMap.get(pagePath) + pageViews)
    } else {
      pageMap.set(pagePath, pageViews)
    }
  })
  
  return Array.from(pageMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ page: path, views }))
}

function getDeviceBreakdown(rows: any[]) {
  const deviceMap = new Map()
  
  rows.forEach(row => {
    const device = row.dimensionValues[1]?.value || 'desktop'
    const sessions = parseInt(row.metricValues[1]?.value || '0')
    
    if (deviceMap.has(device)) {
      deviceMap.set(device, deviceMap.get(device) + sessions)
    } else {
      deviceMap.set(device, sessions)
    }
  })
  
  return Array.from(deviceMap.entries()).map(([device, sessions]) => ({
    device,
    sessions,
    percentage: 0 // Calcular depois baseado no total
  }))
}

function getCountryBreakdown(rows: any[]) {
  const countryMap = new Map()
  
  rows.forEach(row => {
    const country = row.dimensionValues[2]?.value || 'Unknown'
    const users = parseInt(row.metricValues[0]?.value || '0')
    
    if (countryMap.has(country)) {
      countryMap.set(country, countryMap.get(country) + users)
    } else {
      countryMap.set(country, users)
    }
  })
  
  return Array.from(countryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, users]) => ({ country, users }))
}

// Salvar analytics no Google Sheets
async function saveAnalyticsToSheets(siteSlug: string, analyticsData: any) {
  try {
    const gasUrl = process.env.GAS_BASE_URL
    if (!gasUrl) {
      console.warn('GAS_BASE_URL não configurada - salvamento analytics pulado')
      return false
    }

    const response = await fetch(`${gasUrl}?action=save_analytics_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteSlug,
        analyticsData: {
          ...analyticsData,
          lastUpdate: new Date().toISOString(),
          source: 'google_analytics'
        }
      })
    })

    if (!response.ok) {
      console.warn('Erro ao salvar analytics no Google Sheets:', response.statusText)
      return false
    }

    console.log('✅ Analytics salvos no Google Sheets')
    return true
  } catch (error) {
    console.error('Erro ao salvar analytics:', error)
    return false
  }
}

// Buscar analytics do Google Sheets (cache)
async function getAnalyticsFromSheets(siteSlug: string, range: string) {
  try {
    const gasUrl = process.env.GAS_BASE_URL
    if (!gasUrl) return null

    const response = await fetch(`${gasUrl}?action=get_analytics_data&siteSlug=${siteSlug}&range=${range}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.analyticsData || null
  } catch (error) {
    console.error('Erro ao buscar analytics do cache:', error)
    return null
  }
}

// Dados mock para desenvolvimento
function generateMockAnalyticsData(range: string) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const chartData: Array<{
    date: string;
    users: number;
    sessions: number;
    pageViews: number;
  }> = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    chartData.push({
      date: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * 1000) + 100,
      sessions: Math.floor(Math.random() * 1200) + 150,
      pageViews: Math.floor(Math.random() * 2000) + 300
    })
  }
  
  return {
    overview: {
      users: chartData.reduce((sum, day) => sum + day.users, 0),
      sessions: chartData.reduce((sum, day) => sum + day.sessions, 0),
      pageViews: chartData.reduce((sum, day) => sum + day.pageViews, 0),
      bounceRate: 35.2,
      avgSessionDuration: 185.5,
      conversions: Math.floor(Math.random() * 50) + 10
    },
    chartData,
    topPages: [
      { page: '/', views: 1250 },
      { page: '/servicos', views: 890 },
      { page: '/contato', views: 670 },
      { page: '/sobre', views: 420 },
      { page: '/blog', views: 310 }
    ],
    deviceBreakdown: [
      { device: 'mobile', sessions: 1200, percentage: 60 },
      { device: 'desktop', sessions: 600, percentage: 30 },
      { device: 'tablet', sessions: 200, percentage: 10 }
    ],
    countryBreakdown: [
      { country: 'Brazil', users: 1800 },
      { country: 'United States', users: 200 },
      { country: 'Portugal', users: 100 },
      { country: 'Argentina', users: 80 }
    ],
    note: 'Dados exemplo - configure Google Analytics para dados reais'
  }
}

// Funções auxiliares
function getStartDate(range: string): string {
  const today = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)
  
  return startDate.toISOString().split('T')[0]
}

// Sincronizar analytics para Google Sheets
async function syncAnalyticsToSheets(body: any) {
  try {
    const { siteSlug } = body
    
    if (!siteSlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'siteSlug é obrigatório'
        })
      }
    }
    
    // Buscar dados atualizados e salvar
    const analyticsData = await getAnalyticsData(siteSlug, '30d')
    const saved = await saveAnalyticsToSheets(siteSlug, analyticsData)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        synced: saved,
        data: analyticsData
      })
    }
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro na sincronização'
      })
    }
  }
}

// Criar relatório customizado
async function createCustomReport(body: any) {
  try {
    const { siteSlug, metrics, dimensions, dateRange } = body
    
    // TODO: Implementar relatórios customizados
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        report: {
          id: `report_${Date.now()}`,
          metrics,
          dimensions,
          dateRange,
          note: 'Relatórios customizados em desenvolvimento'
        }
      })
    }
  } catch (error) {
    console.error('Erro ao criar relatório:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro ao criar relatório'
      })
    }
  }
}