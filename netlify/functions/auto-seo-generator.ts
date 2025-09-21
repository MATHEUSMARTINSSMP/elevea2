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
    const { businessData, siteContent } = body

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

  // Geração automática de keywords
  const keywords = [
    businessType,
    businessName,
    location,
    `${businessType} em ${location}`,
    `${businessType} ${location}`,
    category,
    'profissional',
    'qualidade',
    'atendimento',
    'serviços',
    businessType?.split(' ').join(', ')
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

  // Retornar dados SEO completos
  return {
    meta: {
      title,
      description: metaDescription,
      keywords: keywords.slice(0, 15), // Máximo 15 keywords
      robots: 'index,follow,max-image-preview:large'
    },
    openGraph: {
      title,
      description: metaDescription,
      type: 'website',
      locale: 'pt_BR',
      siteName: businessName
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription
    },
    structured: {
      business: businessSchema,
      website: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": businessName,
        "url": website || `https://${businessName.toLowerCase().replace(/\s+/g, '')}.com`
      }
    }
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