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

const GAS_URL = process.env.GAS_URL || process.env.VITE_GAS_URL || process.env.ELEVEA_GAS_URL || ""

async function callGAS(action: string, data: any): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

  try {
    // Alguns endpoints usam 'action' em vez de 'type' no GAS
    const isActionEndpoint = ['get_site_structure', 'save_site_structure', 'validate_vip_pin'].includes(action)
    const payload = isActionEndpoint 
      ? { action, ...data }
      : { type: action, ...data }

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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    let site = event.queryStringParameters?.site
    
    // Para POST, pode vir no body também
    if (!site && event.httpMethod === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}')
        site = body.site
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
      // Para detectar tipo de negócio, usamos informações básicas do site
      // O GAS já tem a detecção automática implementada durante o onboarding
      const businessInfo = { empresa: site, historia: "", produtos: "", siteSlug: site }

      // Detecta o tipo de negócio automaticamente baseado no nome do site
      const businessText = `${businessInfo.empresa}`.toLowerCase()
      const businessType = detectBusinessType(businessText)
      
      const result = await callGAS('get_site_structure', { site })
      
      if (!result.ok) {
        // Se não existe estrutura, criar baseada no tipo de negócio detectado
        const defaultStructure = createDefaultStructure(site, businessType.category)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            structure: defaultStructure,
            isDefault: true,
            businessType: businessType
          })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          structure: result.structure,
          isDefault: false,
          businessType: businessType
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
// Detecta automaticamente o tipo de negócio baseado em texto/contexto
function detectBusinessType(businessText: string) {
  const text = businessText.toLowerCase();
  
  // 🏥 SAÚDE E MEDICINA
  if (text.match(/clinic|hospital|medic|dentist|fisio|psico|terapi|farma|opto|veter|nutri|estetic|spa|massag|quiropra|podologi|fonoaudio|acupunt|odonto|dermato|radiolog|laborator|ambulato|upa|pronto.socorro|posto.saude|home.care|pilates|crossfit|academia|ginasti|muscula|orthop|cardio|pneumo|gastro|neuro|urolog|gineco|pediatra|geriatra|anestesi|cirurgi|emergen|uti|cti|saude|medico|doutor|clinica|consulta|tratamento|terapia|fisioterapia|psicologia|odontologia|veterinaria|estetica|massagem|acupuntura|laboratorio|exame|cirurgia|emergencia|ambulatorio/)) {
    return {
      category: "health",
      type: "service",
      sections: ["hero", "about", "services", "team", "testimonials", "contact", "appointment"],
      keywords: ["saúde", "médico", "clínica", "tratamento", "consulta", "especialista", "cuidado"]
    };
  }

  // 🍽️ ALIMENTAÇÃO E RESTAURANTES
  if (text.match(/restauran|lanchon|pizzar|hambur|coffee|cafeter|padari|confeit|doceri|sorvet|açai|sushi|barbec|churrascar|bistro|pub|bar|cantina|food.truck|delivery|ifood|comida|gastrono|chef|culinar|menu|prato|bebida|drink|cocktail|cervej|cacha|vinho|whisky|vodka|tequila|gin|rum|licor|caipirnha|catering|buffet|festa|event|recep|casamen|formatur|aniver|restaurante|lanchonete|pizzaria|hamburger|cafeteria|padaria|confeitaria|doceria|sorveteria|acai|churrascaria|gastronomia|culinaria|cardapio|comida|bebida|entrega|delivery/)) {
    return {
      category: "food",
      type: "hybrid",
      sections: ["hero", "menu", "about", "gallery", "reviews", "delivery", "contact", "hours"],
      keywords: ["cardápio", "delivery", "sabor", "comida", "especialidade", "ambiente", "refeição"]
    };
  }

  // 🔧 SERVIÇOS AUTOMOTIVOS
  if (text.match(/auto|car|moto|bicicleta|bike|pneu|borrachar|mecanic|eletric|lava.jato|funilari|pintur|insulfilm|som|alarme|tracker|gps|reboque|guincho|vistoria|despachant|cartorio|detran|licenciament|emplacament|transfer|financiament|seguro|oficina|garage|posto|combusti|gasolin|alcool|diesel|gnv|lubri|oleo|filtro|peca|acessori|tunin|custom|restor|antiqu|classico|modific|turbo|nitro|suspens|freio|embrag|motor|cambio|direcao|alinhament|balancear|geometria|diagnos|scaner|teste|manutenc|prevent|corret|urgent|24h|plantao|automotivo|carro|automovel|veiculo|borracharia|mecanica|eletrica|lavajato|funilaria|pintura|oficina|posto|combustivel|gasolina|oleo|filtro|peca|acessorio|manutencao|conserto|reparo/)) {
    return {
      category: "automotive",
      type: "service", 
      sections: ["hero", "services", "about", "gallery", "brands", "contact", "emergency"],
      keywords: ["mecânica", "conserto", "manutenção", "especialista", "qualidade", "confiança", "experiência"]
    };
  }

  // 💎 JOIAS E BIJUTERIAS
  if (text.match(/joia|bijoux|anel|colar|brinco|pulseira|corrente|pingente|ouro|prata|diamante|esmeralda|rubi|safira|perola|cristal|relogio|alianca|casament|noivado|formatura|presente|ourivesar|joalher|designer|artesana|personaliz|exclusiv|luxo|elegante|sofistic|premium|import|suic|italia|joalheria|ourivesaria|bijuteria|acessorios|pedras.preciosas|metais.nobres|semi.joias/)) {
    return {
      category: "jewelry",
      type: "product",
      sections: ["hero", "products", "collections", "about", "gallery", "testimonials", "contact", "catalog"],
      keywords: ["joias", "elegância", "exclusividade", "momentos", "personalizado", "luxo", "sofisticação"]
    };
  }

  // 🏠 CONSTRUÇÃO E REFORMAS
  if (text.match(/construc|reform|obra|engenheir|arquitet|mestre|pedreiro|eletricist|encanador|pintore|azulejist|gesseiro|marmorari|vidraceiro|soldador|carpinteir|marceneir|serralheri|ferrageir|materiais.construc|ciment|areia|brita|tijolo|bloco|telha|madeira|ferro|aco|alumin|vidro|espelho|portas|janelas|portoes|grades|cancela|cerca|muro|laje|pilare|viga|fundac|alicerce|piso|azulejo|ceramic|porcelanat|granito|marmore|quartz|pedra|marmore|revestiment|tinta|verniz|selador|massa|reboco|chapisco|impermeabi|isolament|termic|acustic|drywall|gesso|forro|sanca|moldura|rodape|batent|fechadur|dobra|puxador|parafuso|prego|buchas|furadei|broca|serra|martelo|chave.fenda|philips|alicate|nivel|esquadro|trena|prumo|regua|esquadri|transfer|escalin|andaim|betonei|vibrador|compactador|rolo|pincel|brocha|pistola|compressor|gerador|solda|esmeril|furadei|parafusadei|plainar|tupia|serra.circular|tico.tico|moto.serra|britadei|construcao|reforma|obra|engenharia|arquitetura|pedreiro|eletricista|encanador|pintor|carpinteiro|serralheria|materiais|construcao|cimento|tijolo|telha|madeira|ferro|aluminio|vidro|porta|janela|piso|azulejo|tinta|massa|gesso|impermeabilizacao/)) {
    return {
      category: "construction", 
      type: "service",
      sections: ["hero", "services", "projects", "about", "team", "contact", "quote"],
      keywords: ["obra", "reforma", "construção", "projeto", "qualidade", "experiência", "entrega"]
    };
  }

  // 💻 TECNOLOGIA E INFORMÁTICA
  if (text.match(/tecno|comput|notebook|desktop|pc|laptop|tablet|celular|smartphone|iphone|android|samsung|xiaomi|motorola|lg|sony|apple|microsoft|google|intel|amd|nvidia|software|hardware|programa|app|aplicativ|system|website|site|blog|ecommerce|loja.virtual|marketplace|seo|sem|google.ads|facebook.ads|instagram.ads|linkedin.ads|email.marketing|automac|chatbot|ia|intelige.artific|machine.learning|deep.learning|big.data|analytics|dashboard|api|integrac|cloud|nuvem|aws|azure|google.cloud|server|servidor|hospedagem|dominio|ssl|backup|seguranc|antivirus|firewall|vpn|rede|wifi|bluetooth|ethernet|fibra.optic|internet|banda.larga|4g|5g|satelite|radio|transmiss|recepc|antena|roteador|switch|hub|modem|repetidor|tecnologia|informatica|computador|desenvolvimento|programacao|software|hardware|website|aplicativo|sistema|internet|rede|suporte|manutencao|digital|online/)) {
    return {
      category: "technology",
      type: "service",
      sections: ["hero", "services", "solutions", "about", "portfolio", "contact", "support"],
      keywords: ["tecnologia", "inovação", "digital", "solução", "eficiência", "modernização", "expertise"]
    };
  }

  // Categoria genérica para outros tipos
  return {
    category: "general",
    type: "hybrid", 
    sections: ["hero", "about", "services", "gallery", "contact"],
    keywords: ["qualidade", "excelência", "confiança", "experiência", "atendimento", "satisfação", "resultado"]
  };
}

function createDefaultStructure(siteSlug: string, businessCategory: string): SiteStructure {
  // Mapear categoria para tipo válido
  let businessType: 'service' | 'product' | 'hybrid' | 'custom' = 'service'
  if (businessCategory === 'jewelry') {
    businessType = 'product'
  } else if (businessCategory === 'food') {
    businessType = 'hybrid'
  } else {
    businessType = 'service'
  }

  const baseStructure: SiteStructure = {
    siteSlug,
    businessType,
    lastUpdated: new Date().toISOString(),
    sections: []
  }

  if (businessCategory === 'health' || businessCategory === 'automotive' || businessCategory === 'construction' || businessCategory === 'technology' || businessCategory === 'general') {
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
  } else if (businessCategory === 'jewelry' || businessCategory === 'food') {
    // Template para comércio de produtos (joalheria, restaurante, etc.)
    baseStructure.sections = [
      {
        id: 'hero',
        type: 'hero',
        title: businessCategory === 'jewelry' ? 'Nossa Joalheria' : 'Nosso Restaurante',
        subtitle: businessCategory === 'jewelry' ? 'Joias exclusivas para momentos especiais' : 'Sabores únicos para você',
        image: '',
        order: 1,
        visible: true
      },
      {
        id: 'products',
        type: 'products',
        title: businessCategory === 'jewelry' ? 'Nossas Joias' : 'Nosso Cardápio',
        subtitle: businessCategory === 'jewelry' ? 'Peças únicas e personalizadas' : 'Pratos especiais da casa',
        image: '',
        order: 2,
        visible: true
      },
      {
        id: 'gallery',
        type: 'gallery',
        title: 'Galeria',
        subtitle: businessCategory === 'jewelry' ? 'Veja nossas criações' : 'Ambiente e pratos',
        image: '',
        order: 3,
        visible: true
      },
      {
        id: 'about',
        type: 'about',
        title: businessCategory === 'jewelry' ? 'Nossa Arte' : 'Nossa História',
        subtitle: businessCategory === 'jewelry' ? 'Tradição e elegância' : 'Tradição e sabor',
        description: businessCategory === 'jewelry' ? 'Criamos peças únicas que eternizam momentos especiais.' : 'Oferecemos uma experiência gastronômica única.',
        image: '',
        order: 4,
        visible: true
      },
      {
        id: 'contact',
        type: 'contact',
        title: 'Entre em Contato',
        subtitle: businessCategory === 'jewelry' ? 'Visite nossa joalheria' : 'Faça sua reserva',
        image: '',
        order: 5,
        visible: true
      }
    ]
  }

  return baseStructure
}