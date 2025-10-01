import type { Handler } from '@netlify/functions'

// Tipos para edição de conteúdo
interface SectionField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'url' | 'number' | 'boolean'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

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
  lastUpdated?: string
}

interface SiteStructure {
  siteSlug: string
  businessType: 'service' | 'product' | 'hybrid' | 'custom'
  lastUpdated: string
  sections: SiteSection[]
}

const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL || process.env.ELEVEA_GAS_URL || ""

async function callGAS(action: string, data: any): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const payload = { type: action, ...data }
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    let site = event.queryStringParameters?.site
    
    // Para POST/PUT, pode vir no body também
    if (!site && (event.httpMethod === 'POST' || event.httpMethod === 'PUT')) {
      try {
        const body = JSON.parse(event.body || '{}')
        site = body.site || body.siteSlug
      } catch {}
    }
    
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
      // Listar seções do site
      const result = await callGAS('get_site_sections', { site })
      
      if (!result.ok) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: result.error || 'Erro ao carregar seções' 
          })
        }
      }

      // Adicionar campos editáveis para cada seção
      const sectionsWithFields = result.sections.map((section: SiteSection) => ({
        ...section,
        editableFields: getEditableFieldsForSection(section.type)
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          sections: sectionsWithFields,
          businessType: result.businessType,
          lastUpdated: result.lastUpdated
        })
      }
    }

    if (event.httpMethod === 'PUT') {
      // Atualizar conteúdo de uma seção
      const body = JSON.parse(event.body || '{}')
      const { sectionId, field, value, sectionData, pin } = body

      if (!pin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'PIN VIP necessário para editar conteúdo' 
          })
        }
      }

      if (!sectionId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: 'ID da seção é obrigatório' 
          })
        }
      }

      const result = await callGAS('update_site_content', {
        site,
        sectionId,
        field,
        value,
        sectionData,
        pin
      })

      if (!result.ok) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            ok: false, 
            error: result.error || 'Erro ao atualizar conteúdo' 
          })
        }
      }

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
    console.error('Erro site-content-editor:', error)
    
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

// Define campos editáveis para cada tipo de seção
function getEditableFieldsForSection(sectionType: string): SectionField[] {
  const commonFields: SectionField[] = [
    { key: 'title', label: 'Título', type: 'text', required: true },
    { key: 'subtitle', label: 'Subtítulo', type: 'text' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'image', label: 'Imagem', type: 'image' },
    { key: 'visible', label: 'Visível', type: 'boolean' }
  ]

  switch (sectionType) {
    case 'hero':
      return [
        ...commonFields,
        { key: 'cta_text', label: 'Texto do Botão', type: 'text' },
        { key: 'cta_link', label: 'Link do Botão', type: 'url' },
        { key: 'background_image', label: 'Imagem de Fundo', type: 'image' }
      ]
    
    case 'about':
      return [
        ...commonFields,
        { key: 'history', label: 'Nossa História', type: 'textarea' },
        { key: 'mission', label: 'Missão', type: 'textarea' },
        { key: 'vision', label: 'Visão', type: 'textarea' },
        { key: 'values', label: 'Valores', type: 'textarea' }
      ]
    
    case 'services':
      return [
        ...commonFields,
        { key: 'services_list', label: 'Lista de Serviços', type: 'textarea' },
        { key: 'pricing', label: 'Preços', type: 'textarea' },
        { key: 'schedule', label: 'Horários', type: 'text' }
      ]
    
    case 'products':
      return [
        ...commonFields,
        { key: 'products_list', label: 'Lista de Produtos', type: 'textarea' },
        { key: 'pricing', label: 'Preços', type: 'textarea' },
        { key: 'availability', label: 'Disponibilidade', type: 'text' }
      ]
    
    case 'gallery':
      return [
        ...commonFields,
        { key: 'gallery_images', label: 'Imagens da Galeria', type: 'image' },
        { key: 'gallery_description', label: 'Descrição da Galeria', type: 'textarea' }
      ]
    
    case 'contact':
      return [
        ...commonFields,
        { key: 'address', label: 'Endereço', type: 'textarea' },
        { key: 'phone', label: 'Telefone', type: 'text' },
        { key: 'email', label: 'E-mail', type: 'text' },
        { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
        { key: 'schedule', label: 'Horários', type: 'textarea' }
      ]
    
    default:
      return commonFields
  }
}
