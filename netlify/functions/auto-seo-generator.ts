import type { Handler } from '@netlify/functions'
import { rateLimitMiddleware, verifyVipAccess } from './shared/security'
import OpenAI from 'openai'

// Inicializar OpenAI com API key real
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    }
  }

  try {
    // Verificar rate limiting
    await rateLimitMiddleware('auto-seo', event)
    
    const body = JSON.parse(event.body || '{}')
    const { businessData, siteContent, action = 'generate', siteSlug, vipPin } = body

    if (!businessData?.name || !businessData?.type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Nome e tipo do negócio são obrigatórios' 
        })
      }
    }

    // Verificar acesso VIP
    if (!siteSlug || !vipPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site e PIN VIP são obrigatórios para auto-SEO' 
        })
      }
    }

    const isVipValid = await verifyVipAccess(siteSlug, vipPin)
    if (!isVipValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'Acesso VIP inválido' })
      }
    }

    // Gerar SEO automático usando OpenAI REAL
    const autoSEO = await generateAutoSEOWithAI(businessData, siteContent, siteSlug)
    
    // Salvar análise no Google Sheets para histórico
    await saveSEOAnalysisToSheets(siteSlug, autoSEO)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        seo: autoSEO,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erro na geração de SEO automático:', error)
    
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

// Função OpenAI REAL para SEO inteligente
async function generateAutoSEOWithAI(businessData: any, siteContent?: any, siteSlug?: string) {
  try {
    const prompt = `Atue como um especialista em SEO. Analise os dados do negócio e gere uma otimização SEO completa e profissional.

DADOS DO NEGÓCIO:
- Nome: ${businessData.name}
- Tipo: ${businessData.type}
- Localização: ${businessData.location || 'Não informado'}
- Telefone: ${businessData.phone || 'Não informado'}
- Descrição: ${businessData.description || 'Não informada'}
- Categoria: ${businessData.category || 'Não informada'}
- Site: ${businessData.website || 'Não informado'}

CONTEÚDO DO SITE: ${siteContent ? JSON.stringify(siteContent).slice(0, 1000) : 'Não fornecido'}

Gere uma análise SEO completa em JSON com:
1. title: Título SEO otimizado (50-60 caracteres)
2. description: Meta description persuasiva (150-160 caracteres)
3. keywords: Array com 15 palavras-chave relevantes (incluindo long-tail)
4. seoScore: Pontuação de 0-100 com detalhes por categoria
5. recommendations: Array com 5-8 recomendações específicas
6. structuredData: Schema.org JSON-LD para o tipo de negócio
7. openGraph: Dados Open Graph otimizados

IMPORTANTE: Foque em SEO local brasileiro, use linguagem natural e seja específico para o tipo de negócio.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2500
    })

    const aiResult = JSON.parse(completion.choices[0].message.content || '{}')
    
    // Enriquecer com dados adicionais
    const enrichedSEO = {
      ...aiResult,
      sitemap: generateSitemapStructure(businessData, siteContent),
      robots: generateRobotsConfig(businessData),
      timestamp: new Date().toISOString(),
      siteSlug: siteSlug,
      // Garantir que temos um score válido
      seoScore: aiResult.seoScore || calculateFallbackScore(businessData)
    }
    
    return enrichedSEO
    
  } catch (error) {
    console.error('Erro na análise OpenAI:', error)
    // Fallback para método tradicional em caso de erro
    return generateAutoSEO(businessData, siteContent)
  }
}

function generateAutoSEO(businessData: any, siteContent?: any) {
  const {
    name: businessName,
    type: businessType,
    location,
    phone,
    website,
    description,
    openingHours,
    category
  } = businessData

  // Análise avançada de conteúdo para keywords
  const baseKeywords = [
    businessType,
    businessName,
    location,
    `${businessType} em ${location}`,
    `${businessType} ${location}`,
    category
  ].filter(Boolean)

  // Keywords de long-tail baseadas no tipo de negócio
  const longTailKeywords = generateLongTailKeywords(businessType, location)
  
  // Keywords baseadas no conteúdo do site
  const contentKeywords = siteContent ? extractContentKeywords(siteContent) : []
  
  // Combinar e otimizar keywords
  const keywords = [
    ...baseKeywords,
    ...longTailKeywords,
    ...contentKeywords,
    'profissional',
    'qualidade',
    'atendimento',
    'serviços'
  ].filter(Boolean)

  // Título SEO otimizado
  const title = `${businessName} - ${businessType} em ${location} | Qualidade e Profissionalismo`

  // Descrição SEO otimizada
  const metaDescription = description || 
    `${businessName} oferece serviços de ${businessType} em ${location}. ` +
    `Atendimento profissional, qualidade garantida e preços justos. ` +
    `${phone ? `Entre em contato: ${phone}` : 'Solicite um orçamento!'}`

  // Schema markup específico do negócio
  const businessSchema = {
    "@context": "https://schema.org",
    "@type": getBusinessSchemaType(businessType, category),
    "name": businessName,
    "description": metaDescription,
    "category": businessType,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": location,
      "addressCountry": "BR"
    },
    ...(phone && { "telephone": phone }),
    ...(website && { "url": website }),
    ...(openingHours && { "openingHours": openingHours }),
    "priceRange": "$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "25"
    }
  }

  // Gerar estrutura de sitemap
  const sitemap = generateSitemapStructure(businessData, siteContent)
  
  // Análise de performance SEO
  const seoScore = calculateSEOScore({
    title,
    description: metaDescription,
    keywords,
    businessData,
    content: siteContent
  })

  // Retornar dados SEO completos com melhorias
  return {
    meta: {
      title,
      description: metaDescription,
      keywords: keywords.slice(0, 15), // Máximo 15 keywords
      robots: 'index,follow,max-image-preview:large,max-snippet:-1',
      author: businessName,
      viewport: 'width=device-width, initial-scale=1.0',
      charset: 'UTF-8',
      language: 'pt-BR'
    },
    openGraph: {
      title,
      description: metaDescription,
      type: 'website',
      locale: 'pt_BR',
      siteName: businessName,
      image: `https://api.elevea.agencia/og-image/${encodeURIComponent(businessName)}`,
      imageWidth: 1200,
      imageHeight: 630
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
      image: `https://api.elevea.agencia/og-image/${encodeURIComponent(businessName)}`
    },
    structured: {
      business: businessSchema,
      website: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": businessName,
        "url": website || `https://${businessName.toLowerCase().replace(/\s+/g, '')}.netlify.app`,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${website}?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      },
      breadcrumb: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Início",
            "item": website || `https://${businessName.toLowerCase().replace(/\s+/g, '')}.netlify.app`
          }
        ]
      }
    },
    sitemap,
    seoScore,
    recommendations: generateSEORecommendations(seoScore, businessData)
  }
}

function getBusinessSchemaType(businessType: string, category?: string): string {
  const type = (businessType || category || '').toLowerCase()
  
  // Mapeamento para tipos de schema específicos
  const typeMap: Record<string, string> = {
    'restaurante': 'Restaurant',
    'loja': 'Store',
    'salão': 'BeautySalon',
    'barbearia': 'BeautySalon',
    'oficina': 'AutoRepair',
    'clínica': 'MedicalOrganization',
    'consultório': 'MedicalOrganization',
    'academia': 'ExerciseGym',
    'escola': 'EducationalOrganization',
    'hotel': 'LodgingBusiness',
    'pousada': 'LodgingBusiness',
    'farmácia': 'Pharmacy',
    'pet shop': 'PetStore',
    'advocacia': 'LegalService',
    'dentista': 'Dentist',
    'veterinário': 'VeterinaryCare'
  }

  // Buscar por palavras-chave no tipo de negócio
  for (const [key, value] of Object.entries(typeMap)) {
    if (type.includes(key)) {
      return value
    }
  }

  // Padrão é LocalBusiness
  return 'LocalBusiness'
}

// Função para gerar keywords de cauda longa
function generateLongTailKeywords(businessType: string, location: string): string[] {
  const baseType = businessType?.toLowerCase() || ''
  const baseLocation = location?.toLowerCase() || ''
  
  const longTailPatterns = [
    `melhor ${baseType} em ${baseLocation}`,
    `${baseType} de qualidade ${baseLocation}`,
    `${baseType} profissional ${baseLocation}`,
    `${baseType} com bom preço ${baseLocation}`,
    `${baseType} perto de mim`,
    `${baseType} ${baseLocation} avaliações`,
    `orçamento ${baseType} ${baseLocation}`,
    `contato ${baseType} ${baseLocation}`
  ]
  
  return longTailPatterns.filter(Boolean)
}

// Função para extrair keywords do conteúdo
function extractContentKeywords(content: any): string[] {
  if (!content) return []
  
  const text = JSON.stringify(content).toLowerCase()
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'as', 'e', 'o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'um', 'uma']
  
  // Extrair palavras relevantes (3+ caracteres, não comum)
  const words = text.match(/\b[a-záéíóúàèçãõâêôü]{3,}\b/g) || []
  const relevantWords = words.filter(word => !commonWords.includes(word))
  
  // Contar frequência e retornar as mais relevantes
  const frequency: Record<string, number> = {}
  relevantWords.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}

// Função para gerar estrutura de sitemap
function generateSitemapStructure(businessData: any, siteContent?: any) {
  const baseUrl = businessData.website || `https://${businessData.name?.toLowerCase().replace(/\s+/g, '')}.netlify.app`
  
  return {
    pages: [
      {
        url: baseUrl,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '1.0'
      },
      {
        url: `${baseUrl}/sobre`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.8'
      },
      {
        url: `${baseUrl}/servicos`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.9'
      },
      {
        url: `${baseUrl}/contato`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.7'
      }
    ]
  }
}

// Função para calcular score SEO
function calculateSEOScore(seoData: any): { score: number; details: any } {
  let score = 0
  const details: any = {}
  
  // Título (20 pontos)
  if (seoData.title) {
    if (seoData.title.length >= 30 && seoData.title.length <= 60) {
      score += 20
      details.title = { score: 20, status: 'excellent' }
    } else if (seoData.title.length >= 20 && seoData.title.length <= 70) {
      score += 15
      details.title = { score: 15, status: 'good' }
    } else {
      score += 5
      details.title = { score: 5, status: 'needs_improvement' }
    }
  }
  
  // Descrição (20 pontos)
  if (seoData.description) {
    if (seoData.description.length >= 120 && seoData.description.length <= 160) {
      score += 20
      details.description = { score: 20, status: 'excellent' }
    } else if (seoData.description.length >= 100 && seoData.description.length <= 180) {
      score += 15
      details.description = { score: 15, status: 'good' }
    } else {
      score += 5
      details.description = { score: 5, status: 'needs_improvement' }
    }
  }
  
  // Keywords (15 pontos)
  if (seoData.keywords && seoData.keywords.length >= 5) {
    score += 15
    details.keywords = { score: 15, status: 'excellent' }
  } else if (seoData.keywords && seoData.keywords.length >= 3) {
    score += 10
    details.keywords = { score: 10, status: 'good' }
  } else {
    score += 3
    details.keywords = { score: 3, status: 'needs_improvement' }
  }
  
  // Dados estruturados (15 pontos)
  if (seoData.businessData) {
    const hasPhone = Boolean(seoData.businessData.phone)
    const hasLocation = Boolean(seoData.businessData.location)
    const hasHours = Boolean(seoData.businessData.openingHours)
    
    if (hasPhone && hasLocation && hasHours) {
      score += 15
      details.structured = { score: 15, status: 'excellent' }
    } else if (hasPhone && hasLocation) {
      score += 10
      details.structured = { score: 10, status: 'good' }
    } else {
      score += 5
      details.structured = { score: 5, status: 'needs_improvement' }
    }
  }
  
  // Conteúdo (30 pontos)
  if (seoData.content) {
    const contentLength = JSON.stringify(seoData.content).length
    if (contentLength >= 1000) {
      score += 30
      details.content = { score: 30, status: 'excellent' }
    } else if (contentLength >= 500) {
      score += 20
      details.content = { score: 20, status: 'good' }
    } else {
      score += 10
      details.content = { score: 10, status: 'needs_improvement' }
    }
  } else {
    details.content = { score: 0, status: 'missing' }
  }
  
  return { score, details }
}

// Função para gerar recomendações de SEO
function generateSEORecommendations(seoScore: any, businessData: any): string[] {
  const recommendations: string[] = []
  
  if (seoScore.details.title?.status !== 'excellent') {
    recommendations.push('Otimize o título da página para 30-60 caracteres')
  }
  
  if (seoScore.details.description?.status !== 'excellent') {
    recommendations.push('Melhore a meta descrição para 120-160 caracteres')
  }
  
  if (seoScore.details.keywords?.status !== 'excellent') {
    recommendations.push('Adicione mais palavras-chave relevantes (mínimo 5)')
  }
  
  if (!businessData.phone) {
    recommendations.push('Adicione número de telefone para melhorar o SEO local')
  }
  
  if (!businessData.openingHours) {
    recommendations.push('Adicione horário de funcionamento para SEO local')
  }
  
  if (seoScore.details.content?.status !== 'excellent') {
    recommendations.push('Adicione mais conteúdo relevante à página (mínimo 1000 caracteres)')
  }
  
  return recommendations
}

// Funções auxiliares para OpenAI
function generateRobotsConfig(businessData: any): string {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/

Sitemap: https://${businessData.website || businessData.name?.toLowerCase().replace(/\s+/g, '')}.netlify.app/sitemap.xml`
}

function calculateFallbackScore(businessData: any): any {
  let score = 50 // Score base
  
  if (businessData.name) score += 10
  if (businessData.description) score += 15
  if (businessData.phone) score += 10
  if (businessData.location) score += 10
  if (businessData.openingHours) score += 5
  
  return {
    score: Math.min(score, 100),
    details: {
      title: { score: businessData.name ? 20 : 10, status: businessData.name ? 'good' : 'needs_improvement' },
      description: { score: businessData.description ? 20 : 10, status: businessData.description ? 'good' : 'needs_improvement' },
      keywords: { score: 15, status: 'good' },
      structured: { score: businessData.phone ? 15 : 10, status: businessData.phone ? 'good' : 'needs_improvement' },
      content: { score: 20, status: 'good' }
    }
  }
}

// Salvar análise SEO no Google Sheets
async function saveSEOAnalysisToSheets(siteSlug: string, seoData: any) {
  try {
    const gasUrl = process.env.GAS_BASE_URL
    if (!gasUrl) {
      console.warn('GAS_BASE_URL não configurada - salvamento pulado')
      return
    }

    const response = await fetch(`${gasUrl}?action=save_seo_analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteSlug,
        seoData,
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      console.warn('Erro ao salvar no Google Sheets:', response.statusText)
    } else {
      console.log('✅ Análise SEO salva no Google Sheets')
    }
  } catch (error) {
    console.error('Erro ao salvar análise SEO:', error)
  }
}

