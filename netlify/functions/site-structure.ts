import type { Handler } from '@netlify/functions'

// Tipos para a estrutura do site
interface SiteSection {
  id: string
  type: 'hero' | 'about' | 'services' | 'products' | 'gallery' | 'contact' | 'custom'
  title: string
  subtitle?: string
  description?: string
  image?: string
  order: number
  visible: boolean
  customFields?: Record<string, any>
}

interface SiteStructure {
  siteSlug: string
  businessType: 'service' | 'product' | 'hybrid' | 'custom'
  lastUpdated: string
  sections: SiteSection[]
}

const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL || ""

async function callGAS(action: string, data: any): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`GAS HTTP ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { site } = event.queryStringParameters || {}
    
    if (!site) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Parâmetro site é obrigatório' 
        })
      }
    }

    if (event.httpMethod === 'GET') {
      // Buscar estrutura atual do site
      const result = await callGAS('get_site_structure', { site })
      
      if (!result.ok) {
        // Se não existe estrutura, criar template padrão baseado no tipo de negócio
        const defaultStructure = createDefaultStructure(site, 'service') // Default como serviço
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            structure: defaultStructure,
            isDefault: true
          })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          structure: result.structure,
          isDefault: false
        })
      }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { structure, pin } = body

      if (!pin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'PIN VIP necessário para editar estrutura' 
          })
        }
      }

      if (!structure || !structure.sections) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'Estrutura inválida' 
          })
        }
      }

      // Validar PIN VIP
      const authResult = await callGAS('validate_vip_pin', { site, pin })
      if (!authResult.ok || !authResult.valid) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'PIN VIP inválido' 
          })
        }
      }

      // Salvar estrutura
      const result = await callGAS('save_site_structure', { 
        site, 
        structure: {
          ...structure,
          siteSlug: site,
          lastUpdated: new Date().toISOString()
        }
      })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
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

  } catch (error: any) {
    console.error('Erro site-structure:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        ok: false, 
        error: error.message || 'Erro interno do servidor' 
      })
    }
  }
}

// Cria estrutura padrão baseada no tipo de negócio
function createDefaultStructure(siteSlug: string, businessType: 'service' | 'product' | 'hybrid'): SiteStructure {
  const baseStructure: SiteStructure = {
    siteSlug,
    businessType,
    lastUpdated: new Date().toISOString(),
    sections: []
  }

  if (businessType === 'service') {
    // Template para negócios de serviço (borracharia, consultoria, etc.)
    baseStructure.sections = [
      {
        id: 'hero',
        type: 'hero',
        title: 'Bem-vindo à Nossa Empresa',
        subtitle: 'Serviços de qualidade para você',
        image: '',
        order: 1,
        visible: true
      },
      {
        id: 'about',
        type: 'about',
        title: 'Sobre Nós',
        subtitle: 'Conheça nossa história e valores',
        description: 'Somos especializados em oferecer os melhores serviços.',
        image: '',
        order: 2,
        visible: true
      },
      {
        id: 'services',
        type: 'services',
        title: 'Nossos Serviços',
        subtitle: 'Soluções completas para suas necessidades',
        image: '',
        order: 3,
        visible: true
      },
      {
        id: 'contact',
        type: 'contact',
        title: 'Entre em Contato',
        subtitle: 'Fale conosco para mais informações',
        image: '',
        order: 4,
        visible: true
      }
    ]
  } else if (businessType === 'product') {
    // Template para comércio de produtos (joalheria, loja, etc.)
    baseStructure.sections = [
      {
        id: 'hero',
        type: 'hero',
        title: 'Nossa Loja',
        subtitle: 'Os melhores produtos para você',
        image: '',
        order: 1,
        visible: true
      },
      {
        id: 'products',
        type: 'products',
        title: 'Nossos Produtos',
        subtitle: 'Qualidade e variedade em um só lugar',
        image: '',
        order: 2,
        visible: true
      },
      {
        id: 'gallery',
        type: 'gallery',
        title: 'Galeria',
        subtitle: 'Veja nossos produtos em detalhes',
        image: '',
        order: 3,
        visible: true
      },
      {
        id: 'about',
        type: 'about',
        title: 'Sobre a Loja',
        subtitle: 'Nossa paixão por qualidade',
        description: 'Oferecemos produtos cuidadosamente selecionados.',
        image: '',
        order: 4,
        visible: true
      },
      {
        id: 'contact',
        type: 'contact',
        title: 'Onde Encontrar',
        subtitle: 'Visite nossa loja ou fale conosco',
        image: '',
        order: 5,
        visible: true
      }
    ]
  }

  return baseStructure
}