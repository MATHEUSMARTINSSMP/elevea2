import type { Handler } from '@netlify/functions'

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
    const body = JSON.parse(event.body || '{}')
    const { businessData, siteContent, action = 'generate' } = body

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

    // Gerar SEO automático baseado nos dados do negócio
    const autoSEO = generateAutoSEO(businessData, siteContent)

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