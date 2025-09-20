const BUILD = 'debug-2025-09-11';

/** === Spreadsheet opener (sempre a planilha certa) === */
function openSS_() {
  // 1) tenta pelas Script Properties
  var props = PropertiesService.getScriptProperties();
  var ID = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  // 2) fallback hard-coded (mantenha seu ID aqui também)
  if (!ID) ID = '19T5YUVviV8F9GZwwwQM_Dsyz9WbPq97JeHSDHOJG8';
  try {
    return SpreadsheetApp.openById(ID);
  } catch (e) {
    throw new Error('SPREADSHEET_ID inválido ou sem acesso: ' + ID + ' → ' + e);
  }
}

/** ===================== INTERNAL MODULES (CANONICAL IMPLEMENTATIONS) ===================== */

// 🏗️ Namespace: Detection - Sistema universal para 100+ tipos de negócio
var Detection = {
  /**
   * Detecta automaticamente o tipo de negócio baseado em texto/contexto
   * Sistema preparado para 100+ categorias diferentes
   */
  detectBusinessType: function(businessText) {
    const text = String(businessText || "").toLowerCase();
    
    // 🏥 SAÚDE E MEDICINA (médicos, clínicas, fisioterapia, etc.)
    if (text.match(/clinic|hospital|medic|dentist|fisio|psico|terapi|farma|opto|veter|nutri|estetic|spa|massag|quiropra|podologi|fonoaudio|acupunt|odonto|dermato|radiolog|laborator|ambulato|upa|pronto.socorro|posto.saude|home.care|pilates|crossfit|academia|ginasti|muscula|orthop|cardio|pneumo|gastro|neuro|urolog|gineco|pediatra|geriatra|anestesi|cirurgi|emergen|uti|cti|saude|medico|doutor|clinica|consulta|tratamento|terapia|fisioterapia|psicologia|odontologia|veterinaria|estetica|massagem|acupuntura|laboratorio|exame|cirurgia|emergencia|ambulatorio/)) {
      return {
        category: "health",
        type: "service",
        sections: ["hero", "about", "services", "team", "testimonials", "contact", "appointment"],
        keywords: ["saúde", "médico", "clínica", "tratamento", "consulta", "especialista", "cuidado"]
      };
    }

    // 🍽️ ALIMENTAÇÃO E RESTAURANTES (restaurantes, lanchonetes, delivery, etc.)
    if (text.match(/restauran|lanchon|pizzar|hambur|coffee|cafeter|padari|confeit|doceri|sorvet|açai|sushi|barbec|churrascar|bistro|pub|bar|cantina|food.truck|delivery|ifood|comida|gastrono|chef|culinar|menu|prato|bebida|drink|cocktail|cervej|cacha|vinho|whisky|vodka|tequila|gin|rum|licor|caipirnha|catering|buffet|festa|event|recep|casamen|formatur|aniver|restaurante|lanchonete|pizzaria|hamburger|cafeteria|padaria|confeitaria|doceria|sorveteria|acai|churrascaria|gastronomia|culinaria|cardapio|comida|bebida|entrega|delivery/)) {
      return {
        category: "food",
        type: "hybrid",
        sections: ["hero", "menu", "about", "gallery", "reviews", "delivery", "contact", "hours"],
        keywords: ["cardápio", "delivery", "sabor", "comida", "especialidade", "ambiente", "refeição"]
      };
    }

    // 🔧 SERVIÇOS AUTOMOTIVOS (borracharia, mecânica, lava-jato, etc.)
    if (text.match(/auto|car|moto|bicicleta|bike|pneu|borrachar|mecanic|eletric|lava.jato|funilari|pintur|insulfilm|som|alarme|tracker|gps|reboque|guincho|vistoria|despachant|cartorio|detran|licenciament|emplacament|transfer|financiament|seguro|oficina|garage|posto|combusti|gasolin|alcool|diesel|gnv|lubri|oleo|filtro|peca|acessori|tunin|custom|restor|antiqu|classico|modific|turbo|nitro|suspens|freio|embrag|motor|cambio|direcao|alinhament|balancear|geometria|diagnos|scaner|teste|manutenc|prevent|corret|urgent|24h|plantao|automotivo|carro|automovel|veiculo|borracharia|mecanica|eletrica|lavajato|funilaria|pintura|oficina|posto|combustivel|gasolina|oleo|filtro|peca|acessorio|manutencao|conserto|reparo/)) {
      return {
        category: "automotive",
        type: "service", 
        sections: ["hero", "services", "about", "gallery", "brands", "contact", "emergency"],
        keywords: ["mecânica", "conserto", "manutenção", "especialista", "qualidade", "confiança", "experiência"]
      };
    }

    // 💎 JOIAS E ACESSÓRIOS (joalheria, bijuteria, relógios, etc.)
    if (text.match(/joia|ouro|prata|diamant|anel|colar|brinco|pulseir|relogio|alianc|noivad|casament|semi.joia|bijuter|acessori|piercing|corrente|pingent|chaveiro|broche|tiara|headband|oculos|bolsa|carteira|cinto|sapato|tenis|sandalia|chinelo|bota|scarpin|salto|rasteirnha|havaina|melissa|nike|adidas|puma|vans|converse|roupas|camisa|blusa|vestido|saia|calca|short|bermud|jaqueta|casaco|moletom|camiso|pijama|roupa.intim|sutia|calcinha|cueca|boxer|meia|underwear|lingerie|maio|biquin|sunga|praia|verao|inverno|outono|primaver|moda|estilo|tendenc|design|griffe|marca|luxo|premium|exclusiv|personalizad|custom|import|nacion|brasile|estrangei|joalheria|bijuteria|acessorio|relojoaria|alianca|noivado|casamento|ouro|prata|diamante|anel|colar|brinco|pulseira|corrente|moda|roupa|calcado|bolsa|oculos/)) {
      return {
        category: "fashion",
        type: "product",
        sections: ["hero", "products", "collections", "about", "gallery", "testimonials", "contact", "catalog"],
        keywords: ["elegância", "estilo", "qualidade", "exclusivo", "tendência", "design", "coleção"]
      };
    }

    // 🏠 CONSTRUÇÃO E REFORMAS (pedreiros, engenheiros, arquitetos, etc.)
    if (text.match(/construc|reform|obra|engenheir|arquitet|mestre|pedreiro|eletricist|encanador|pintore|azulejist|gesseiro|marmorari|vidraceiro|soldador|carpinteir|marceneir|serralheri|ferrageir|materiais.construc|ciment|areia|brita|tijolo|bloco|telha|madeira|ferro|aco|alumin|vidro|espelho|portas|janelas|portoes|grades|cancela|cerca|muro|laje|pilare|viga|fundac|alicerce|piso|azulejo|ceramic|porcelanat|granito|marmore|quartz|pedra|marmore|revestiment|tinta|verniz|selador|massa|reboco|chapisco|impermeabi|isolament|termic|acustic|drywall|gesso|forro|sanca|moldura|rodape|batent|fechadur|dobra|puxador|parafuso|prego|buchas|furadei|broca|serra|martelo|chave.fenda|philips|alicate|nivel|esquadro|trena|prumo|regua|esquadri|transfer|escalin|andaim|betonei|vibrador|compactador|rolo|pincel|brocha|pistola|compressor|gerador|solda|esmeril|furadei|parafusadei|plainar|tupia|serra.circular|tico.tico|moto.serra|britadei|construcao|reforma|obra|engenharia|arquitetura|pedreiro|eletricista|encanador|pintor|carpinteiro|serralheria|materiais|construcao|cimento|tijolo|telha|madeira|ferro|aluminio|vidro|porta|janela|piso|azulejo|tinta|massa|gesso|impermeabilizacao/)) {
      return {
        category: "construction", 
        type: "service",
        sections: ["hero", "services", "projects", "about", "team", "contact", "quote"],
        keywords: ["obra", "reforma", "construção", "projeto", "qualidade", "experiência", "entrega"]
      };
    }

    // 💻 TECNOLOGIA E INFORMÁTICA (desenvolvimento, suporte, hardware, etc.)
    if (text.match(/tecno|comput|notebook|desktop|pc|laptop|tablet|celular|smartphone|iphone|android|samsung|xiaomi|motorola|lg|sony|apple|microsoft|google|intel|amd|nvidia|software|hardware|programa|app|aplicativ|system|website|site|blog|ecommerce|loja.virtual|marketplace|seo|sem|google.ads|facebook.ads|instagram.ads|linkedin.ads|email.marketing|automac|chatbot|ia|intelige.artific|machine.learning|deep.learning|big.data|analytics|dashboard|api|integrac|cloud|nuvem|aws|azure|google.cloud|server|servidor|hospedagem|dominio|ssl|backup|seguranc|antivirus|firewall|vpn|rede|wifi|bluetooth|ethernet|fibra.optic|internet|banda.larga|4g|5g|satelite|radio|transmiss|recepc|antena|roteador|switch|hub|modem|repetidor|tecnologia|informatica|computador|desenvolvimento|programacao|software|hardware|website|aplicativo|sistema|internet|rede|suporte|manutencao|digital|online/)) {
      return {
        category: "technology",
        type: "service",
        sections: ["hero", "services", "solutions", "about", "portfolio", "contact", "support"],
        keywords: ["tecnologia", "inovação", "digital", "solução", "eficiência", "modernização", "expertise"]
      };
    }

    // Categoria genérica para outros tipos não detectados
    return {
      category: "general",
      type: "hybrid", 
      sections: ["hero", "about", "services", "gallery", "contact"],
      keywords: ["qualidade", "excelência", "confiança", "experiência", "atendimento", "satisfação", "resultado"]
    };
  },

  getBusinessTitle: function(category) {
    const titles = {
      health: "Cuidando da sua saúde com excelência",
      food: "Sabor que conquista",
      automotive: "Seu veículo em boas mãos",
      jewelry: "Joias que eternizam momentos",
      construction: "Construindo seus sonhos",
      technology: "Inovação e tecnologia",
      general: "Qualidade e confiança"
    };
    return titles[category] || titles.general;
  },

  getBusinessSubtitle: function(category) {
    const subtitles = {
      health: "Atendimento especializado e humanizado para o seu bem-estar",
      food: "Tradição e qualidade em cada sabor que servimos",
      automotive: "Manutenção e reparos automotivos com qualidade e confiança",
      jewelry: "Criamos peças únicas para os seus momentos mais especiais",
      construction: "Projetos executados com qualidade, segurança e pontualidade",
      technology: "Soluções digitais que transformam e impulsionam seu negócio",
      general: "Comprometidos com a excelência no atendimento e qualidade dos serviços"
    };
    return subtitles[category] || subtitles.general;
  },

  /**
   * Gera configuração de seções personalizadas para o elevea.sections.json baseado no tipo de negócio
   */
  generateSectionsForBusiness: function(businessCategory, context) {
    var baseFields = [
      {
        "id": "header",
        "name": "Cabeçalho",
        "fields": [
          { "key": "brand", "label": "Nome da marca" },
          { "key": "nav_links", "label": "Links do menu (âncoras)", "hint": "#sobre,#servicos,#depoimentos,#contato" }
        ]
      },
      {
        "id": "hero",
        "name": "Hero Principal",
        "fields": [
          { "key": "title", "label": "Título principal" },
          { "key": "subtitle", "label": "Subtítulo" },
          { "key": "cta_whatsapp", "label": "Link WhatsApp" }
        ],
        "slots": [
          { "key": "hero_img", "label": "Imagem principal" }
        ]
      }
    ];

    var specificFields = [];
    
    if (businessCategory === "health") {
      specificFields = [
        {
          "id": "sobre",
          "name": "Sobre o Profissional",
          "fields": [
            { "key": "about", "label": "Apresentação profissional" },
            { "key": "credentials", "label": "Credenciais e especializações" }
          ]
        },
        {
          "id": "servicos",
          "name": "Especialidades",
          "fields": [
            { "key": "list", "label": "Lista de especialidades" }
          ]
        },
        {
          "id": "convenios",
          "name": "Convênios",
          "fields": [
            { "key": "list", "label": "Convênios aceitos" }
          ]
        }
      ];
    } else if (businessCategory === "food") {
      specificFields = [
        {
          "id": "sobre",
          "name": "Nossa História",
          "fields": [
            { "key": "about", "label": "História e tradição" }
          ]
        },
        {
          "id": "cardapio",
          "name": "Cardápio",
          "fields": [
            { "key": "list", "label": "Principais pratos e categorias" }
          ]
        },
        {
          "id": "delivery",
          "name": "Delivery",
          "fields": [
            { "key": "info", "label": "Informações de delivery" }
          ]
        }
      ];
    } else if (businessCategory === "automotive") {
      specificFields = [
        {
          "id": "sobre",
          "name": "Sobre a Oficina",
          "fields": [
            { "key": "about", "label": "Experiência e qualificações" }
          ]
        },
        {
          "id": "servicos",
          "name": "Serviços Automotivos",
          "fields": [
            { "key": "list", "label": "Lista de serviços oferecidos" }
          ]
        },
        {
          "id": "marcas",
          "name": "Marcas Atendidas",
          "fields": [
            { "key": "list", "label": "Marcas e tipos de veículos" }
          ]
        }
      ];
    } else if (businessCategory === "jewelry") {
      specificFields = [
        {
          "id": "sobre",
          "name": "Nossa Joalheria",
          "fields": [
            { "key": "about", "label": "Tradição e arte em joias" }
          ]
        },
        {
          "id": "produtos",
          "name": "Nossos Produtos",
          "fields": [
            { "key": "list", "label": "Tipos de joias e produtos" }
          ]
        },
        {
          "id": "servicos",
          "name": "Serviços Especiais",
          "fields": [
            { "key": "list", "label": "Serviços personalizados" }
          ]
        }
      ];
    } else if (businessCategory === "construction") {
      specificFields = [
        {
          "id": "sobre",
          "name": "Sobre a Empresa",
          "fields": [
            { "key": "about", "label": "Experiência em construção" }
          ]
        },
        {
          "id": "servicos",
          "name": "Serviços de Construção",
          "fields": [
            { "key": "list", "label": "Tipos de construção e reforma" }
          ]
        },
        {
          "id": "projetos",
          "name": "Tipos de Projeto",
          "fields": [
            { "key": "list", "label": "Categorias de projetos" }
          ]
        }
      ];
    } else if (businessCategory === "technology") {
      specificFields = [
        {
          "id": "sobre",
          "name": "Nossa Empresa",
          "fields": [
            { "key": "about", "label": "Inovação e tecnologia" }
          ]
        },
        {
          "id": "servicos",
          "name": "Soluções Tecnológicas",
          "fields": [
            { "key": "list", "label": "Serviços e soluções oferecidas" }
          ]
        },
        {
          "id": "tecnologias",
          "name": "Tecnologias",
          "fields": [
            { "key": "list", "label": "Tecnologias utilizadas" }
          ]
        }
      ];
    } else {
      // general
      specificFields = [
        {
          "id": "sobre",
          "name": "Sobre Nós",
          "fields": [
            { "key": "about", "label": "Apresentação da empresa" }
          ]
        },
        {
          "id": "servicos",
          "name": "Produtos e Serviços",
          "fields": [
            { "key": "list", "label": "Lista de produtos/serviços" }
          ]
        }
      ];
    }

    var finalFields = [
      {
        "id": "depoimentos",
        "name": "Depoimentos",
        "fields": []
      },
      {
        "id": "contato",
        "name": "Contato",
        "fields": [
          { "key": "email", "label": "E-mail" },
          { "key": "whatsapp", "label": "WhatsApp" },
          { "key": "address", "label": "Endereço" },
          { "key": "maps_url", "label": "Google Maps URL" },
          { "key": "instagram", "label": "Instagram" },
          { "key": "facebook", "label": "Facebook" },
          { "key": "tiktok", "label": "TikTok" }
        ]
      }
    ];

    return baseFields.concat(specificFields).concat(finalFields);
  }
};

// 🏗️ Namespace: SiteStructure - Gerenciamento de estruturas personalizadas de sites
var SiteStructure = {
  /**
   * Busca a estrutura personalizada de um site
   */
  get: function(site) {
    try {
      const ss = openSS_();
      let structureSheet = ss.getSheetByName("site_structure");
      
      if (!structureSheet) {
        return { ok: false, error: "Planilha site_structure não encontrada" };
      }

      const headers = structureSheet.getRange(1, 1, 1, structureSheet.getLastColumn()).getValues()[0];
      const siteIdx = headers.indexOf("siteSlug");
      const structureIdx = headers.indexOf("structure");

      if (siteIdx === -1 || structureIdx === -1) {
        return { ok: false, error: "Headers obrigatórios não encontrados" };
      }

      const data = structureSheet.getRange(2, 1, Math.max(1, structureSheet.getLastRow() - 1), structureSheet.getLastColumn()).getValues();
      
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][siteIdx]).trim() === site) {
          const structureJson = String(data[i][structureIdx] || "");
          if (structureJson) {
            try {
              const structure = JSON.parse(structureJson);
              return {
                ok: true,
                structure: structure
              };
            } catch (e) {
              return { ok: false, error: "Erro ao parsear estrutura JSON: " + e.message };
            }
          }
        }
      }

      return { ok: false, error: "Estrutura não encontrada para o site" };
      
    } catch (e) {
      return { ok: false, error: "Erro ao buscar estrutura: " + e.message };
    }
  },

  /**
   * Salva a estrutura personalizada de um site
   */
  save: function(site, structure) {
    try {
      const ss = openSS_();
      let structureSheet = ss.getSheetByName("site_structure");
      
      // Cria a planilha se não existir
      if (!structureSheet) {
        structureSheet = ss.insertSheet("site_structure");
        structureSheet.getRange(1, 1, 1, 4).setValues([["siteSlug", "structure", "lastUpdated", "businessType"]]);
      }

      const headers = structureSheet.getRange(1, 1, 1, structureSheet.getLastColumn()).getValues()[0];
      const siteIdx = headers.indexOf("siteSlug");
      const structureIdx = headers.indexOf("structure");
      const updatedIdx = headers.indexOf("lastUpdated");
      const businessIdx = headers.indexOf("businessType");

      const structureJson = JSON.stringify(structure);
      const now = new Date().toISOString();
      const businessType = structure.businessType || "service";

      // Verifica se já existe uma linha para o site
      const data = structureSheet.getRange(2, 1, Math.max(1, structureSheet.getLastRow() - 1), structureSheet.getLastColumn()).getValues();
      let rowToUpdate = -1;

      for (let i = 0; i < data.length; i++) {
        if (String(data[i][siteIdx]).trim() === site) {
          rowToUpdate = i + 2; // +2 porque começamos da linha 2
          break;
        }
      }

      if (rowToUpdate !== -1) {
        // Atualiza linha existente
        structureSheet.getRange(rowToUpdate, structureIdx + 1).setValue(structureJson);
        structureSheet.getRange(rowToUpdate, updatedIdx + 1).setValue(now);
        structureSheet.getRange(rowToUpdate, businessIdx + 1).setValue(businessType);
      } else {
        // Adiciona nova linha
        const newRow = new Array(structureSheet.getLastColumn()).fill("");
        newRow[siteIdx] = site;
        newRow[structureIdx] = structureJson;
        newRow[updatedIdx] = now;
        newRow[businessIdx] = businessType;
        
        structureSheet.appendRow(newRow);
      }

      return { ok: true, message: "Estrutura salva com sucesso" };
      
    } catch (e) {
      return { ok: false, error: "Erro ao salvar estrutura: " + e.message };
    }
  },

  /**
   * Valida PIN VIP de um site
   */
  validateVipPin: function(site, pin) {
    try {
      if (!pin) {
        return { ok: false, valid: false, error: "PIN não fornecido" };
      }

      const ss = openSS_();
      const usuariosSheet = ss.getSheetByName("usuarios");
      
      if (!usuariosSheet) {
        return { ok: false, valid: false, error: "Planilha usuarios não encontrada" };
      }

      const headers = usuariosSheet.getRange(1, 1, 1, usuariosSheet.getLastColumn()).getValues()[0];
      const siteIdx = headers.indexOf("site");
      const pinIdx = headers.indexOf("vip_pin");
      const planoIdx = headers.indexOf("plano");

      if (siteIdx === -1) {
        return { ok: false, valid: false, error: "Coluna site não encontrada" };
      }

      const data = usuariosSheet.getRange(2, 1, Math.max(1, usuariosSheet.getLastRow() - 1), usuariosSheet.getLastColumn()).getValues();
      
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][siteIdx]).trim() === site) {
          const storedPin = String(data[i][pinIdx] || "").trim();
          const plano = String(data[i][planoIdx] || "").toLowerCase();
          
          // Verifica se é VIP e se o PIN confere
          const isVip = plano.includes("vip") || plano === "premium";
          const pinValid = storedPin && storedPin === pin;
          
          return {
            ok: true,
            valid: isVip && pinValid,
            isVip: isVip,
            pinMatch: pinValid
          };
        }
      }

      return { ok: false, valid: false, error: "Site não encontrado" };
      
    } catch (e) {
      return { ok: false, valid: false, error: "Erro ao validar PIN: " + e.message };
    }
  },

  /**
   * Cria estrutura de site padrão baseada no tipo de negócio detectado
   */
  createByType: function(site, businessCategory, onboardingData) {
    const baseStructure = {
      siteSlug: site,
      businessType: businessCategory,
      lastUpdated: new Date().toISOString(),
      sections: []
    };
    
    // Seções comuns para todos os tipos
    const commonSections = [
      {
        id: "header",
        name: "Cabeçalho",
        visible: true,
        data: {
          brand: onboardingData.empresa || site,
          nav_links: "#sobre,#servicos,#depoimentos,#contato"
        }
      },
      {
        id: "hero", 
        name: "Hero Principal",
        visible: true,
        data: {
          title: (onboardingData.empresa || site) + " - " + Detection.getBusinessTitle(businessCategory),
          subtitle: onboardingData.historia || Detection.getBusinessSubtitle(businessCategory),
          cta_whatsapp: onboardingData.whatsapp || ""
        }
      }
    ];
    
    // Seções específicas por tipo de negócio
    var specificSections = [];
    
    if (businessCategory === "health") {
      specificSections = [
        {
          id: "sobre",
          name: "Sobre o Profissional",
          visible: true,
          data: {
            about: onboardingData.historia || "Profissional qualificado com experiência em cuidados de saúde, oferecendo atendimento personalizado e de qualidade.",
            credentials: "CRM/CRO/CREFITO - Especialização"
          }
        },
        {
          id: "servicos",
          name: "Especialidades",
          visible: true,
          data: {
            list: onboardingData.produtos || "Consultas • Diagnósticos • Tratamentos • Acompanhamento"
          }
        },
        {
          id: "convenios",
          name: "Convênios",
          visible: true,
          data: {
            list: "Unimed • Bradesco Saúde • SulAmérica • Amil • Particular"
          }
        }
      ];
    } else if (businessCategory === "food") {
      specificSections = [
        {
          id: "sobre",
          name: "Nossa História",
          visible: true,
          data: {
            about: onboardingData.historia || "Tradição e sabor se encontram em cada prato. Oferecemos uma experiência gastronômica única com ingredientes frescos e receitas especiais."
          }
        },
        {
          id: "cardapio",
          name: "Cardápio",
          visible: true,
          data: {
            list: onboardingData.produtos || "Pratos Principais • Porções • Bebidas • Sobremesas"
          }
        },
        {
          id: "delivery",
          name: "Delivery",
          visible: true,
          data: {
            info: "Delivery próprio • iFood • Uber Eats • Rappi"
          }
        }
      ];
    } else if (businessCategory === "automotive") {
      specificSections = [
        {
          id: "sobre",
          name: "Sobre a Oficina",
          visible: true,
          data: {
            about: onboardingData.historia || "Oficina especializada com profissionais qualificados e equipamentos modernos para cuidar do seu veículo com excelência."
          }
        },
        {
          id: "servicos",
          name: "Serviços Automotivos",
          visible: true,
          data: {
            list: onboardingData.produtos || "Mecânica Geral • Elétrica • Freios • Suspensão • Ar Condicionado • Diagnóstico"
          }
        },
        {
          id: "marcas",
          name: "Marcas Atendidas",
          visible: true,
          data: {
            list: "Todas as marcas • Carros nacionais e importados • Motos • Utilitários"
          }
        }
      ];
    } else if (businessCategory === "jewelry") {
      specificSections = [
        {
          id: "sobre",
          name: "Nossa Joalheria",
          visible: true,
          data: {
            about: onboardingData.historia || "Criamos peças únicas que eternizam momentos especiais. Tradição, elegância e sofisticação em cada joia."
          }
        },
        {
          id: "produtos",
          name: "Nossos Produtos",
          visible: true,
          data: {
            list: onboardingData.produtos || "Anéis • Colares • Brincos • Pulseiras • Alianças • Relógios • Peças Personalizadas"
          }
        },
        {
          id: "servicos",
          name: "Serviços Especiais",
          visible: true,
          data: {
            list: "Design Personalizado • Reforma de Joias • Avaliação • Certificação • Garantia"
          }
        }
      ];
    } else if (businessCategory === "construction") {
      specificSections = [
        {
          id: "sobre",
          name: "Sobre a Empresa",
          visible: true,
          data: {
            about: onboardingData.historia || "Empresa de construção com experiência sólida no mercado, oferecendo qualidade e pontualidade em todos os projetos."
          }
        },
        {
          id: "servicos",
          name: "Serviços de Construção",
          visible: true,
          data: {
            list: onboardingData.produtos || "Construção • Reforma • Ampliação • Acabamento • Elétrica • Hidráulica • Pintura"
          }
        },
        {
          id: "projetos",
          name: "Tipos de Projeto",
          visible: true,
          data: {
            list: "Residencial • Comercial • Industrial • Reformas • Manutenção"
          }
        }
      ];
    } else if (businessCategory === "technology") {
      specificSections = [
        {
          id: "sobre",
          name: "Nossa Empresa",
          visible: true,
          data: {
            about: onboardingData.historia || "Soluções tecnológicas inovadoras para impulsionar seu negócio. Desenvolvimento, consultoria e suporte especializado."
          }
        },
        {
          id: "servicos",
          name: "Soluções Tecnológicas",
          visible: true,
          data: {
            list: onboardingData.produtos || "Desenvolvimento Web • Apps Mobile • Sistemas • Consultoria • Cloud • Suporte Técnico"
          }
        },
        {
          id: "tecnologias",
          name: "Tecnologias",
          visible: true,
          data: {
            list: "React • Node.js • Python • AWS • Google Cloud • Mobile • E-commerce"
          }
        }
      ];
    } else {
      // general
      specificSections = [
        {
          id: "sobre",
          name: "Sobre Nós",
          visible: true,
          data: {
            about: onboardingData.historia || "Empresa comprometida com a excelência no atendimento e qualidade dos serviços oferecidos."
          }
        },
        {
          id: "servicos",
          name: "Produtos e Serviços",
          visible: true,
          data: {
            list: onboardingData.produtos || "Atendimento personalizado • Qualidade garantida • Melhores preços • Entrega rápida"
          }
        }
      ];
    }
    
    // Seções finais comuns
    const finalSections = [
      {
        id: "depoimentos",
        name: "Depoimentos",
        visible: true,
        data: {
          testimonials: []
        }
      },
      {
        id: "contato",
        name: "Contato",
        visible: true,
        data: {
          email: onboardingData.email || "",
          whatsapp: onboardingData.whatsapp || "",
          address: onboardingData.endereco || "",
          maps_url: "",
          instagram: "",
          facebook: "",
          tiktok: ""
        }
      }
    ];
    
    baseStructure.sections = commonSections.concat(specificSections).concat(finalSections);
    return baseStructure;
  }
};

/** ===================== COMPATIBILITY WRAPPERS (PUBLIC FUNCTIONS) ===================== */

// 🔧 Detection wrappers (backward compatibility)
function detectBusinessType(businessText) {
  try {
    var props = PropertiesService.getScriptProperties();
    var useCanonical = props.getProperty('FEATURE_DETECTION_ROUTER') === '1';
    
    if (useCanonical) {
      log_(openSS_(), "detection_canonical", { input: String(businessText || "").substring(0, 50) });
      return Detection.detectBusinessType(businessText);
    } else {
      log_(openSS_(), "detection_fallback", { input: String(businessText || "").substring(0, 50) });
      return Detection.detectBusinessType(businessText); // fallback to canonical for now
    }
  } catch (e) {
    log_(openSS_(), "detection_error", { error: String(e) });
    return Detection.detectBusinessType(businessText);
  }
}

function getBusinessTitle(category) {
  return Detection.getBusinessTitle(category);
}

function getBusinessSubtitle(category) {
  return Detection.getBusinessSubtitle(category);
}

function generateSectionsForBusiness_(businessCategory, context) {
  return Detection.generateSectionsForBusiness(businessCategory, context);
}

// 🔧 Site Structure wrappers (backward compatibility)
function get_site_structure(site) {
  try {
    var props = PropertiesService.getScriptProperties();
    var useCanonical = props.getProperty('FEATURE_SITE_STRUCTURE_ROUTER') === '1';
    
    if (useCanonical) {
      log_(openSS_(), "site_structure_get_canonical", { site: site });
      return SiteStructure.get(site);
    } else {
      log_(openSS_(), "site_structure_get_fallback", { site: site });
      return SiteStructure.get(site); // fallback to canonical for now
    }
  } catch (e) {
    log_(openSS_(), "site_structure_get_error", { site: site, error: String(e) });
    return SiteStructure.get(site);
  }
}

function save_site_structure(site, structure) {
  try {
    var props = PropertiesService.getScriptProperties();
    var useCanonical = props.getProperty('FEATURE_SITE_STRUCTURE_ROUTER') === '1';
    
    if (useCanonical) {
      log_(openSS_(), "site_structure_save_canonical", { site: site });
      return SiteStructure.save(site, structure);
    } else {
      log_(openSS_(), "site_structure_save_fallback", { site: site });
      return SiteStructure.save(site, structure); // fallback to canonical for now
    }
  } catch (e) {
    log_(openSS_(), "site_structure_save_error", { site: site, error: String(e) });
    return SiteStructure.save(site, structure);
  }
}

function validate_vip_pin(site, pin) {
  try {
    var props = PropertiesService.getScriptProperties();
    var useCanonical = props.getProperty('FEATURE_SITE_STRUCTURE_ROUTER') === '1';
    
    if (useCanonical) {
      log_(openSS_(), "validate_vip_pin_canonical", { site: site });
      return SiteStructure.validateVipPin(site, pin);
    } else {
      log_(openSS_(), "validate_vip_pin_fallback", { site: site });
      return SiteStructure.validateVipPin(site, pin); // fallback to canonical for now
    }
  } catch (e) {
    log_(openSS_(), "validate_vip_pin_error", { site: site, error: String(e) });
    return SiteStructure.validateVipPin(site, pin);
  }
}

function createSiteStructureByType(site, businessCategory, onboardingData) {
  try {
    var props = PropertiesService.getScriptProperties();
    var useCanonical = props.getProperty('FEATURE_SITE_STRUCTURE_ROUTER') === '1';
    
    if (useCanonical) {
      log_(openSS_(), "create_site_structure_canonical", { site: site, category: businessCategory });
      return SiteStructure.createByType(site, businessCategory, onboardingData);
    } else {
      log_(openSS_(), "create_site_structure_fallback", { site: site, category: businessCategory });
      return SiteStructure.createByType(site, businessCategory, onboardingData); // fallback to canonical for now
    }
  } catch (e) {
    log_(openSS_(), "create_site_structure_error", { site: site, category: businessCategory, error: String(e) });
    return SiteStructure.createByType(site, businessCategory, onboardingData);
  }
}

/** ===================== HELPER FUNCTIONS ===================== */

function log_(ss, action, data) {
  try {
    var sh = ensureLogSheet_(ss);
    var now = new Date();
    var keys = Object.keys(data || {}).join(",");
    var values = Object.keys(data || {}).map(k => String(data[k] || "")).join("|");
    sh.appendRow([now, action, "", "", "", "", "", "", keys, "ok", values]);
  } catch (e) {
    // Silent fail to prevent infinite loops
  }
}

function ensureLogSheet_(ss) {
  var sh = ss.getSheetByName("log");
  if (!sh) {
    sh = ss.insertSheet("log");
    sh.appendRow(["timestamp", "action", "event", "mp_id", "preapproval_id", "status", "payer_email", "amount", "keys", "result", "values"]);
  }
  return sh;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeSlug_(str) {
  if (!str) return '';
  return String(str).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function onlyDigits_(str) {
  if (!str) return '';
  return String(str).replace(/\D/g, '');
}

/** ===================== GET HANDLER (validate + ping + admin + sites + status + settings/leads/feedbacks/traffic/assets) ===================== */
function doGet(e) {
  const ss = openSS_();
  const p = (e && e.parameter) ? e.parameter : {};
  const type = String(p.type || "").toLowerCase();

  // CORS preflight support
  if (type === "options" || type === "cors") {
    return jsonOut_({ ok: true, message: "CORS preflight" });
  }

  // log de entrada
  try {
    ensureLogSheet_(ss).appendRow([
      new Date(), "get_entry", "", "", "", "",
      type || "", "", Object.keys(p || {}).join(","), "", ""
    ]);
  } catch (_) {}

  /* -------- ping -------- */
  if (type === "ping") {
    return jsonOut_({ ok: true, note: "webapp alive (GET)", build: BUILD });
  }

  /* -------- validate (cadastro) -------- */
  if (type === "validate") {
    const slugRaw = String(p.siteSlug || "");
    const cpfRaw  = String(p.cpf || "");
    const slug = normalizeSlug_(slugRaw);
    const cpf  = onlyDigits_(cpfRaw);

    const errors = [];
    if (!slug) errors.push("siteSlug_obrigatorio");
    if (slug && (slug.length < 3 || slug.length > 30)) errors.push("siteSlug_tamanho_invalido");
    if (slug && !/^[A-Z0-9-]+$/.test(slug)) errors.push("siteSlug_caracteres_invalidos");
    if (slug && slugExiste_(slug)) errors.push("siteSlug_ja_usado");
    if (cpf && !isValidCPF_(cpf)) errors.push("cpf_invalido");

    try {
      ensureLogSheet_(ss).appendRow([
        new Date(), "get_validate_done", "", "", "", "",
        "validate", "", "", errors.length ? "" : "ok", errors.join("|")
      ]);
    } catch (_) {}

    return jsonOut_({ ok: errors.length === 0, errors });
  }

  /* -------- admin_set (manual_block) via GET com token -------- */
  if (type === "admin_set") {
    var props = PropertiesService.getScriptProperties();
    var ADMIN = props.getProperty("ADMIN_DASH_TOKEN") || props.getProperty("ADMIN_TOKEN") || "";
    var token = String(p.token || "");
    if (!ADMIN || token !== ADMIN) {
      try { ensureLogSheet_(ss).appendRow([new Date(),"get_admin_set_fail","","","","","admin_set","","","unauthorized",""]); } catch(_){}
      return jsonOut_({ ok: false, error: "unauthorized" });
    }

    var site = normalizeSlug_(String(p.site || p.siteSlug || ""));
    var manual = String(p.manualBlock || p.block || "").toLowerCase();
    var manualBlock = (manual === "1" || manual === "true" || manual === "yes" || manual === "on");
    if (!site) return jsonOut_({ ok: false, error: "missing_site" });

    var shCad = ss.getSheetByName("cadastros");
    if (!shCad) return jsonOut_({ ok: false, error: "missing_sheet_cadastros" });

    // headers (trim)
    var headers = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
    var idxSite   = headers.indexOf("siteSlug");       if (idxSite === -1) return jsonOut_({ ok:false, error:"missing_siteSlug_header" });
    var idxManual = headers.indexOf("manual_block");   // pode não existir
    var idxUpd    = headers.indexOf("updated_at");     // pode não existir

    if (idxManual === -1) {
      var lastCol = shCad.getLastColumn();
      shCad.insertColumnAfter(lastCol);
      shCad.getRange(1, lastCol + 1).setValue("manual_block");
      headers   = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
      idxManual = headers.indexOf("manual_block");
    }
    if (idxUpd === -1) {
      var lastCol2 = shCad.getLastColumn();
      shCad.insertColumnAfter(lastCol2);
      shCad.getRange(1, lastCol2 + 1).setValue("updated_at");
      headers = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
      idxUpd  = headers.indexOf("updated_at");
    }

    var last = shCad.getLastRow(); if (last < 2) return jsonOut_({ ok:false, error:"no_rows" });
    var rows = shCad.getRange(2, 1, last-1, shCad.getLastColumn()).getValues();

    var updated = false;
    for (var j = 0; j < rows.length; j++) {
      var s = normalizeSlug_(String(rows[j][idxSite] || ""));
      if (s === site) {
        rows[j][idxManual] = manualBlock ? "TRUE" : "";
        if (idxUpd !== -1) rows[j][idxUpd] = new Date().toISOString();
        updated = true;
        break;
      }
    }
    if (!updated) return jsonOut_({ ok:false, error:"site_not_found" });

    shCad.getRange(2, 1, last-1, shCad.getLastColumn()).setValues(rows);
    try { ensureLogSheet_(ss).appendRow([new Date(),"get_admin_set_ok","","","","","admin_set","","","ok",""]); } catch(_){}
    return jsonOut_({ ok:true, siteSlug: site, manual_block: manualBlock });
  }

/* -------- client_billing (dados de cobrança) -------- */
if (type === "client_billing") {
  const email = String(p.email || "").trim().toLowerCase(); // ✅ toLowerCase
  if (!email) return jsonOut_({ ok: false, error: "missing_email" });

  try {
    // ✅ MUDANÇA: usar planilha "usuarios" em vez de "cadastros"
    const shUsuarios = ensureUsuariosSheet_(ss);
    const data = shUsuarios.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idxEmail = headers.indexOf("email");
    const idxSite = headers.indexOf("siteSlug");
    const idxPlan = headers.indexOf("plan");

    if (idxEmail === -1) return jsonOut_({ ok: false, error: "missing_email_header" });

    // ✅ BUSCA com toLowerCase para evitar problemas de case
    const row = data.find(r => String(r[idxEmail] || "").trim().toLowerCase() === email);
    if (!row) return jsonOut_({ ok: false, error: "user_not_found" });

    const siteSlug = String(row[idxSite] || "");
    const plan = String(row[idxPlan] || "essential");

    const billing = {
      ok: true,
      plan: plan.toLowerCase(),
      status: "pending",
      provider: "mercadopago",
      siteSlug: siteSlug
    };

    try {
      ensureLogSheet_(ss).appendRow([
        new Date(), "get_client_billing", "", "", "", "",
        "client_billing", siteSlug, email, "ok", ""
      ]);
    } catch (_) {}

    return jsonOut_(billing);
  } catch (e) {
    try {
      ensureLogSheet_(ss).appendRow([
        new Date(), "get_client_billing_fail", "", "", "", "",
        "client_billing", "", email, "error", String(e)
      ]);
    } catch (_) {}
    return jsonOut_({ ok: false, error: String(e) });
  }
}

  /* -------- AdminDashboard helpers -------- */
  if (type === "sites") {
    return jsonOut_({ ok: true, siteSlugs: getSiteSlugs_() });
  }

  if (type === "status") {
    // devolve objeto calculado por getStatusForSite_ (já com fallback de status)
    var slug = normalizeSlug_(String(p.site || ""));
    return jsonOut_(getStatusForSite_(slug));
  }

  /* -------- API do dashboard (GET) -------- */
  if (type === "get_settings") {
    var slugGetSettings = normalizeSlug_(String(p.site || ""));
    return jsonOut_(getClientSettings_(slugGetSettings));
  }

  if (type === "list_leads") {
    var slugLeads  = normalizeSlug_(String(p.site || ""));
    var page       = parseInt(p.page || "1", 10)  || 1;
    var pageSize   = parseInt(p.pageSize || "20", 10) || 20;
    return jsonOut_(listLeads_(slugLeads, page, pageSize));
  }

  if (type === "list_feedbacks") {
    var slugFb   = normalizeSlug_(String(p.site || ""));
    var pageFb   = parseInt(p.page || "1", 10)  || 1;
    var sizeFb   = parseInt(p.pageSize || "20", 10) || 20;
    var isPublic = String(p.public || "").toLowerCase() === "1";
    return jsonOut_(listFeedbacks_(slugFb, pageFb, sizeFb, { public: isPublic }));
  }

  if (type === "list_feedbacks_public") {
    var slugFbP = normalizeSlug_(String(p.site || ""));
    var pageFbP = parseInt(p.page || "1", 10)  || 1;
    var sizeFbP = parseInt(p.pageSize || "20", 10) || 20;
    return jsonOut_(listFeedbacksPublic_(slugFbP, pageFbP, sizeFbP));
  }

  if (type === "get_traffic") {
    var slugTr = normalizeSlug_(String(p.site || ""));
    var rng    = String(p.range || "30d");
    return jsonOut_(getTraffic_(slugTr, rng));
  }

  // Lista imagens públicas do Drive do cliente
  if (type === "assets") {
    var slugA = normalizeSlug_(String(p.site || ""));
    return handleAssetsList_(slugA);
  }

  // default
  try {
    ensureLogSheet_(ss).appendRow([ new Date(), "get_ignored", "", "", "", "", type || "", "", "", "", "" ]);
  } catch (_) {}
  return jsonOut_({ ok: false, error: "ignored_get" });
}

/** ===================== POST HANDLER (JSON + multipart + webhooks) ===================== */
function doPost(e) {
  const ss = openSS_();

  // CORS preflight support
  if (e && e.parameter && e.parameter.type === "options") {
    return jsonOut_({ ok: true, message: "CORS preflight POST" });
  }

  // ===== header/entrada =====
  const hasPD = !!(e && e.postData);
  const contentType = hasPD ? String(e.postData.type || "") : "";
  const rawLen = hasPD && e.postData && e.postData.contents ? String(e.postData.contents.length) : "0";
  const hasFiles = !!(e && e.files && Object.keys(e.files || {}).length > 0);
  const isMultipartHeader = hasPD && /^multipart\//i.test(contentType);
  const isMultipart = hasFiles || isMultipartHeader;

  log_(ss, "entry", {
    contentType,
    isMultipart: String(isMultipart),
    hasPD: String(hasPD),
    rawLen
  });

  // Parse mínimo p/ JSON (somente se NÃO multipart)
  let data = {};
  try {
    if (hasPD && typeof e.postData.contents === "string" && !isMultipart) {
      data = JSON.parse(e.postData.contents || "{}");
    }
  } catch (err) {
    log_(ss, "json_parse_fail", { error: String(err) });
    data = {};
  }

  // Ping rápido
  if (data.type === "ping") {
    log_(ss, "ping_ok", { note: "webapp alive" });
    return jsonOut_({ ok: true, note: "webapp alive" });
  }

  try {
    // ====== UPLOAD ======
    const paramType = String(e && e.parameter && e.parameter.type || "");
    if (isMultipart || hasFiles || paramType === "upload_files") {
      log_(ss, "route_upload", { note: "upload_files", keys: Object.keys(e.parameter || {}).join(",") });
      return handleUploadFiles_(ss, e);
    }

    // ===== ONBOARDING (salva formulário Obrigado) =====
    if (data.type === "save_onboarding" || String(e.parameter && e.parameter.type || "") === "save_onboarding") {
      return handleSaveOnboarding_(ss, data);
    }

    // ===== Gerar/atualizar apenas o prompt do Lovable (a partir do que já está em settings) =====
    if (data.type === "generate_prompt" || String(e.parameter && e.parameter.type || "") === "generate_prompt") {
      var siteGen = normalizeSlug_(String((data.siteSlug || (e.parameter && e.parameter.siteSlug) || (e.parameter && e.parameter.site) || "")));
      return handleGeneratePrompt_(siteGen);
    }

    // ===== promover e.parameter -> data =====
    var p = (e && e.parameter) ? e.parameter : {};
    if (!data.type && p && p.type) {
      data = Object.assign({}, data, { type: String(p.type || "") });
      const promote = [
        "event","action","plan","brand","order","email","fullName","document",
        "phone","company","siteSlug","preapproval_id","logoUrl","fotosUrl",
        "historia","produtos","fundacao","paleta","template","payment_id",
        "collection_id","mp_payment_id","mp_preapproval_id","topic"
      ];
      promote.forEach(k => { if (p[k] && !data[k]) data[k] = p[k]; });
    }

    log_(ss, "parsed", {
      type: data.type || "",
      event: data.event || "",
      keys: Object.keys(data || {}).join(",")
    });

    // ===== abas base =====
    const shDados = ss.getSheetByName('dados');
    const shCad   = ss.getSheetByName('cadastros');
    if (shDados && shDados.getLastRow() === 0) {
      shDados.appendRow(['timestamp','event','action','mp_id','preapproval_id','status','payer_email','amount','raw_json']);
    }
    if (shCad && shCad.getLastRow() === 0) {
      shCad.appendRow(['timestamp','fullName','document','email','phone','company','siteSlug','plan','brand','order','preapproval_id','status','manual_block','updated_at']);
    }

    // ====== JSON/base64 (upload) ======
    if (data.type === "upload_base64") {
      log_(ss, "route_upload_base64", {});
      return handleUploadBase64_(ss, data);
    }

    // ===== SESSIONS: receber defs do Lovable (Netlify onSuccess) =====
    if (data.type === "sections_upsert_defs") {
      // delega auth e persistência para a própria função (único ponto — removido duplicado)
      return sectionsUpsertDefs_(ss, data);
    }

    // ===== SESSIONS: inicializar conteúdo (data) a partir do onboarding =====
    if (data.type === "sections_bootstrap_from_onboarding") {
      var siteB = normalizeSlug_(String(data.site || data.siteSlug || ''));
      if (!siteB) return jsonOut_({ ok:false, error:'missing_site' });
      var r2 = sectionsBootstrapFromOnboarding_(ss, siteB);
      return jsonOut_(Object.assign({ ok:true, siteSlug: siteB }, r2));
    }

    // ---- Admin: setar/atualizar o hook de um site (opcional) ----
    if (data.type === 'admin_set_hook') {
      var props = PropertiesService.getScriptProperties();
      var ADMIN = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';
      if (!ADMIN || String(data.token || '') !== ADMIN) return jsonOut_({ ok:false, error:'unauthorized' });

      var s = normalizeSlug_(String(data.siteSlug || ''));
      var u = String(data.url || '').trim();
      if (!s || !u) return jsonOut_({ ok:false, error:'missing_site_or_url' });

      var r = upsertSiteBuildHook_(s, u);
      return jsonOut_(Object.assign({ ok:true, siteSlug:s }, r));
    }

    // === Admin: setar manual_block via POST (JSON), com token ===
    if (data.type === "admin_set") {
      var props = PropertiesService.getScriptProperties();
      var ADMIN = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';
      var token = String(data.token || '');
      if (!ADMIN || token !== ADMIN) {
        log_(ss,"post_admin_set_fail",{ error:"unauthorized" });
        return jsonOut_({ ok:false, error:"unauthorized" });
      }

      var site   = normalizeSlug_(String(data.site || data.siteSlug || ''));
      var manual = String(data.manualBlock || data.block || '').toLowerCase();
      var manualBlock = (manual === '1' || manual === 'true' || manual === 'yes' || manual === 'on');

      if (!site) return jsonOut_({ ok:false, error:"missing_site" });

      // ⚠️ NÃO redeclare shCad aqui — já existe acima em doPost
      if (!shCad) return jsonOut_({ ok:false, error:"missing_sheet_cadastros" });

      var headers = shCad.getRange(1,1,1, shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
      var idxSite   = headers.indexOf('siteSlug');
      if (idxSite === -1) return jsonOut_({ ok:false, error:'missing_siteSlug_header' });
      var idxManual = headers.indexOf('manual_block');
      var idxUpd    = headers.indexOf('updated_at');

      // cria manual_block, se faltar
      if (idxManual === -1) {
        var lastCol = shCad.getLastColumn();
        shCad.insertColumnAfter(lastCol);
        shCad.getRange(1, lastCol + 1).setValue('manual_block');
        headers   = shCad.getRange(1,1,1, shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
        idxManual = headers.indexOf('manual_block');
      }
      // cria updated_at, se faltar (carimbo útil)
      if (idxUpd === -1) {
        var lastCol2 = shCad.getLastColumn();
        shCad.insertColumnAfter(lastCol2);
        shCad.getRange(1, lastCol2 + 1).setValue('updated_at');
        headers = shCad.getRange(1,1,1, shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
        idxUpd  = headers.indexOf('updated_at');
      }

      var last = shCad.getLastRow();
      if (last < 2) return jsonOut_({ ok:false, error:'no_rows' });

      var rng  = shCad.getRange(2,1, last-1, shCad.getLastColumn());
      var rows = rng.getValues();

      var updated = false;
      for (var i = 0; i < rows.length; i++) {
        var slugRow = normalizeSlug_(String(rows[i][idxSite] || ''));
        if (slugRow === site) {
          rows[i][idxManual] = manualBlock ? 'TRUE' : '';                   // padrão Sheets
          if (idxUpd !== -1) rows[i][idxUpd] = new Date().toISOString();    // carimbo
          updated = true;
          break;
        }
      }
      if (!updated) return jsonOut_({ ok:false, error:'site_not_found' });

      rng.setValues(rows);
      return jsonOut_({ ok:true, siteSlug: site, manual_block: manualBlock });
    }

    /* ===================== AUTH ===================== */
    if (data.type === 'user_set_password')      { log_(ss,"route_user_set_password",{}); return userSetPassword_(ss, data); }
    if (data.type === 'user_login')             { log_(ss,"route_user_login",{});        return userLogin_(ss, data); }
    if (data.type === 'user_me')                { log_(ss,"route_user_me",{});           return userMe_(ss, data); }
    if (data.type === 'password_reset_request') { log_(ss,"route_pwd_reset_req",{});     return passwordResetRequest_(ss, data); }
    if (data.type === 'password_reset_confirm') { log_(ss,"route_pwd_reset_ok",{});      return passwordResetConfirm_(ss, data); }

    // **NOVO**: Billing do cliente
    if (data.type === 'client_billing')         { log_(ss,"route_client_billing",{});    return clientBilling_(ss, data); }

    // **NOVO**: Estrutura personalizada de sites
    if (data.action === 'get_site_structure')   { log_(ss,"route_get_site_structure",{}); return jsonOut_(get_site_structure(data.site)); }
    if (data.action === 'save_site_structure')  { log_(ss,"route_save_site_structure",{}); return jsonOut_(save_site_structure(data.site, data.structure)); }
    if (data.action === 'validate_vip_pin')     { log_(ss,"route_validate_vip_pin",{});   return jsonOut_(validate_vip_pin(data.site, data.pin)); }

    /* ===================== OVERRIDE (admin) ===================== */
    // aceita também "manual_block" ou "admin_toggle" como aliases de override
    if (data.type === 'override' || data.type === 'manual_block' || data.type === 'admin_toggle') {
      log_(ss,"route_override",{});
      return handleOverride_(data, shCad);
    }

    /* ==================== Eventos MP (webhook) ==================== */
    if (data.event === 'payment' || data.event === 'preapproval' || data.event) {
      log_(ss,"route_webhook", { event: data.event || "" });
      shDados.appendRow([
        new Date(),
        data.event||'',
        data.action||'',
        data.mp_id||data.payment_id||data.collection_id||'',
        data.preapproval_id||data.mp_preapproval_id||'',
        data.status||'',
        data.payer_email||'',
        data.amount||'',
        safeJson_(data)
      ]);

      // 🔄 Recalcular faturamento após salvar o evento
      try {
        var pre = data.preapproval_id || data.mp_preapproval_id || '';
        recomputeBillingOne_(pre); // por enquanto recalcula tudo
      } catch (err) {
        log_(ss, "billing_recompute_fail", { error: String(err) });
      }

      return jsonOut_({ ok:true, wrote:'dados' });
    }

    /* ===================== Cadastro ===================== */
    if (data.type === 'cadastro') {
      log_(ss,"route_cadastro_start", { email: data.email || "", slug: data.siteSlug || "" });

      const slug = normalizeSlug_(data.siteSlug || '');
      const cpf  = onlyDigits_(data.document || '');

      const errors = [];
      if (!slug) errors.push('siteSlug_obrigatorio');
      if (slug && (slug.length < 3 || slug.length > 30)) errors.push('siteSlug_tamanho_invalido');
      if (slug && !/^[A-Z0-9-]+$/.test(slug)) errors.push('siteSlug_caracteres_invalidos');
      if (slugExiste_(slug)) errors.push('siteSlug_ja_usado');
      if (cpf && !isValidCPF_(cpf)) errors.push('cpf_invalido');

      if (errors.length) {
        log_(ss,"route_cadastro_fail", { error: errors.join("|") });
        return jsonOut_({ ok:false, errors });
      }

      shCad.appendRow([
        new Date(),
        data.fullName||'',
        cpf||'',
        data.email||'',
        data.phone||'',
        data.company||'',
        slug,
        data.plan||'',
        data.brand||'',
        data.order||'',
        data.preapproval_id||'',
        '', // status
        '', // manual_block
        new Date().toISOString()
      ]);

      ensureUserRow_(data.email || '', slug);
      log_(ss,"route_cadastro_ok",{ slug });
      return jsonOut_({ ok:true, siteSlug: slug });
    }

    /* ===================== Onboarding ===================== */
    if (data.type === 'onboarding') {
      log_(ss,"route_onboarding_start", { email: data.email||"", slug: data.siteSlug||"", plan: data.plan||"" });
      const r = handleOnboarding_(ss, data);
      try {
        const out = JSON.parse(r.getContent() || "{}");
        log_(ss,"route_onboarding_done", { ok: String(out.ok), error: String(out.error||"") });
      } catch (_) {}
      return r;
    }

    // --- API do dashboard (POST)
    if (data.type === "save_settings") {
      return saveClientSettings_(ss, data);
    }
    // (único ponto de sections_upsert_defs já está acima)
    if (data.type === "record_hit") {
      return recordHit_(ss, data);
    }

    // CRIAR LEAD (POST)
    if (data.type === "lead_new") {
      return createLead_(ss, data);
    }

    // CRIAR FEEDBACK (POST)
    if (data.type === "feedback_new") {
      return createFeedback_(ss, data);
    }
    // Receber feedback público (site) — com email/phone opcionais
    if (data.type === "submit_feedback") {
      return createFeedback_(ss, data);
    }

    // Moderação: aprovar/ocultar (requer PIN salvo em settings_kv.security.vip_pin)
    if (data.type === "feedback_set_approval") {
      return feedbackSetApproval_(ss, data);
    }

    // ===== nada casou =====
    log_(ss,"ignored", {
      contentType,
      isMultipart: String(isMultipart),
      hasPD: String(hasPD),
      rawLen,
      type: data.type || "",
      event: data.event || "",
      keys: Object.keys(data||{}).join(",")
    });
    return jsonOut_({
      ok: false,
      error: 'ignored',
      debug: {
        hasPostData: hasPD,
        contentType,
        rawLen,
        paramType: (p && p.type) ? String(p.type) : '',
        seenKeys: Object.keys(data || {})
      }
    });

  } catch (err) {
    log_(ss,"fatal_error", { error: String(err) });
    return jsonOut_({ ok:false, error: String(err) });
  }
}

/** ================== OVERRIDE (admin) ================== */
function handleOverride_(data, shCad) {
  try {
    var props  = PropertiesService.getScriptProperties();
    var ADMIN  = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';
    var token  = String(data.token || '');
    if (!ADMIN || !token || token !== ADMIN) return jsonOut_({ ok:false, error:'unauthorized' });
    if (!shCad) return jsonOut_({ ok:false, error:'missing_sheet' });

    // ⚠️ headers TRIM para evitar espaços invisíveis
    var headers = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
    var idxSite   = headers.indexOf('siteSlug');       if (idxSite === -1) return jsonOut_({ ok:false, error:'missing_siteSlug_header' });
    var idxManual = headers.indexOf('manual_block');   // pode não existir
    var idxUpd    = headers.indexOf('updated_at');     // pode não existir

    // cria manual_block se estiver faltando
    if (idxManual === -1) {
      var lastCol = shCad.getLastColumn();
      shCad.insertColumnAfter(lastCol);
      shCad.getRange(1, lastCol + 1).setValue('manual_block');
      headers   = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
      idxManual = headers.indexOf('manual_block');
    }
    // cria updated_at se estiver faltando (carimbo útil para debug)
    if (idxUpd === -1) {
      var lastCol2 = shCad.getLastColumn();
      shCad.insertColumnAfter(lastCol2);
      shCad.getRange(1, lastCol2 + 1).setValue('updated_at');
      headers = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(function(h){ return String(h).trim(); });
      idxUpd  = headers.indexOf('updated_at');
    }

    var last = shCad.getLastRow(); if (last < 2) return jsonOut_({ ok:false, error:'no_rows' });
    var rows = shCad.getRange(2, 1, last-1, shCad.getLastColumn()).getValues();

    // rename (opcional)
    if (String(data.action || '') === 'rename') {
      var siteOld = normalizeSlug_(String(data.siteSlug || ''));
      var siteNew = normalizeSlug_(String(data.renameTo || ''));
      if (!siteOld || !siteNew) return jsonOut_({ ok:false, error:'missing_slugs' });
      if (siteNew.length < 3 || siteNew.length > 30) return jsonOut_({ ok:false, error:'siteSlug_tamanho_invalido' });
      if (!/^[A-Z0-9-]+$/.test(siteNew)) return jsonOut_({ ok:false, error:'siteSlug_caracteres_invalidos' });

      // impede duplicidade do novo slug
      for (var k = 0; k < rows.length; k++) {
        var s = String(rows[k][idxSite] || '').trim().toUpperCase();
        if (s === siteNew) return jsonOut_({ ok:false, error:'siteSlug_ja_usado' });
      }
      var renamed = false;
      for (var i = 0; i < rows.length; i++) {
        var sOld = String(rows[i][idxSite] || '').trim().toUpperCase();
        if (sOld === siteOld) {
          rows[i][idxSite] = siteNew;
          if (idxUpd !== -1) rows[i][idxUpd] = new Date().toISOString();
          renamed = true;
          break;
        }
      }
      if (!renamed) return jsonOut_({ ok:false, error:'site_not_found' });
      shCad.getRange(2, 1, last-1, shCad.getLastColumn()).setValues(rows);
      return jsonOut_({ ok:true, from:siteOld, to:siteNew });
    }

    // bloquear / desbloquear
    var site = normalizeSlug_(String(data.siteSlug || ''));
    var block = Boolean(data.block);
    if (!site) return jsonOut_({ ok:false, error:'missing_siteSlug' });

    var updated = false;
    for (var j = 0; j < rows.length; j++) {
      var slugJ = normalizeSlug_(String(rows[j][idxSite] || ''));
      if (slugJ === site) {
        // grava com string padrão do Sheets; vazio = desbloqueado
        rows[j][idxManual] = block ? 'TRUE' : '';
        if (idxUpd !== -1) rows[j][idxUpd] = new Date().toISOString();
        updated = true;
        break;
      }
    }
    if (!updated) return jsonOut_({ ok:false, error:'site_not_found' });

    shCad.getRange(2, 1, last-1, shCad.getLastColumn()).setValues(rows);
    return jsonOut_({ ok:true, siteSlug:site, manual_block:block });

  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

/* ================== AUTH (aba "usuarios") ================== */
function userSetPassword_(ss, data) {
  var props = PropertiesService.getScriptProperties();
  var ADMIN = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';
  var adminToken = String(data.adminToken || '');
  if (!ADMIN || adminToken !== ADMIN) return jsonOut_({ ok:false, error:'unauthorized' });

  var email = String(data.email || '').trim().toLowerCase();
  var role  = String(data.role  || 'client').trim().toLowerCase();
  var site  = normalizeSlug_(String(data.siteSlug || ''));
  var pwd   = String(data.password || '');
  if (!email || !pwd) return jsonOut_({ ok:false, error:'missing_email_or_password' });
  if (role !== 'admin' && !site) return jsonOut_({ ok:false, error:'missing_siteSlug' });

  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email);
  var salt = makeSalt_();
  var hash = sha256Hex_(salt + pwd);

  if (idx === -1) sh.appendRow([email, site, role, hash, salt, '', '', '', '', '', '', '', '', '']);
  else {
    var row = idx + 2;
    sh.getRange(row, 2).setValue(site);
    sh.getRange(row, 3).setValue(role);
    sh.getRange(row, 4).setValue(hash);
    sh.getRange(row, 5).setValue(salt);
  }
  return jsonOut_({ ok:true, email, role, siteSlug:site });
}

function userLogin_(ss, data) {
  var email = String(data.email || '').trim().toLowerCase();
  var pwd   = String(data.password || '');
  if (!email || !pwd) return jsonOut_({ ok:false, error:'missing_email_or_password' });

  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email);
  if (idx === -1) return jsonOut_({ ok:false, error:'not_found' });

  var row = idx + 2;
  var hash = String(sh.getRange(row, 4).getValue() || '').trim();
  var salt = String(sh.getRange(row, 5).getValue() || '').trim();

  var test = sha256Hex_(salt + pwd);
  if (test !== hash) return jsonOut_({ ok:false, error:'invalid_credentials' });

  sh.getRange(row, 6).setValue(new Date());
  return jsonOut_({ ok:true, email });
}

function userMe_(ss, data) {
  var email = String(data.email || '').trim().toLowerCase();
  if (!email) return jsonOut_({ ok:false, error:'missing_email' });

  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email);
  if (idx === -1) return jsonOut_({ ok:false, error:'not_found' });

  var row = idx + 2;
  ensureBillingColumns_(sh);
  var map = headerIndexMap_(sh);

  var site = String(sh.getRange(row, map.siteSlug+1).getValue() || '').trim().toUpperCase();
  var role = String(sh.getRange(row, map.role+1).getValue() || '').trim();

  var planSaved = String(sh.getRange(row, map.plan+1).getValue() || '');
  if (!planSaved) {
    var planFromCad = getPlanForUser_(ss, email, site);
    if (planFromCad) {
      planSaved = planFromCad;
      sh.getRange(row, map.plan+1).setValue(planSaved);
    }
  }
  var planLc = String(planSaved || '').toLowerCase();
  var plan   = planLc.indexOf('vip') !== -1 ? 'vip' : (planLc ? 'essential' : '');

  var last = sh.getRange(row, map.last_login+1).getValue();
  return jsonOut_({
    ok:true, email, role, siteSlug:site,
    plan: plan || 'essential',
    last_login: last ? new Date(last).toISOString() : ''
  });
}

function passwordResetRequest_(ss, data) {
  var email = String(data.email || '').trim().toLowerCase();
  if (!email) return jsonOut_({ ok:true });

  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email);
  if (idx === -1) return jsonOut_({ ok:true });

  var row = idx + 2;
  var token = Utilities.getUuid().replace(/-/g,'').substring(0,32);
  var expires = new Date(Date.now() + 1000*60*30);

  ensureResetColumns_(sh);
  var map = headerIndexMap_(sh);
  sh.getRange(row, map.reset_token+1).setValue(token);
  sh.getRange(row, map.reset_expires+1).setValue(expires);

  var link = "https://SEU-SITE/reset?email=" + encodeURIComponent(email) + "&token=" + token;
  return jsonOut_({ ok:true, token: token, link: link });
}

function passwordResetConfirm_(ss, data) {
  var email = String(data.email || '').trim().toLowerCase();
  var token = String(data.token || '');
  var password = String(data.password || '');
  if (!email || !token || !password) return jsonOut_({ ok:false, error:'missing_params' });

  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email);
  if (idx === -1) return jsonOut_({ ok:false, error:'not_found' });

  var row = idx + 2;
  ensureResetColumns_(sh);
  var map = headerIndexMap_(sh);

  var savedTok = String(sh.getRange(row, map.reset_token+1).getValue() || '');
  var expVal   = sh.getRange(row, map.reset_expires+1).getValue();

  if (!savedTok || savedTok !== token)  return jsonOut_({ ok:false, error:'invalid_token' });
  if (expVal && new Date(expVal).getTime() < Date.now()) return jsonOut_({ ok:false, error:'expired_token' });

  var salt = makeSalt_();
  var hash = sha256Hex_(salt + password);

  sh.getRange(row, map.salt+1).setValue(salt);
  sh.getRange(row, map.password_hash+1).setValue(hash);
  sh.getRange(row, map.reset_token+1).setValue('');
  sh.getRange(row, map.reset_expires+1).setValue('');

  return jsonOut_({ ok:true });
}

/* ================== HELPERS E UTILIDADES ================== */
function ensureUsuariosSheet_(ss) {
  var sh = ss.getSheetByName('usuarios');
  if (!sh) sh = ss.insertSheet('usuarios');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['email','siteSlug','role','password_hash','salt','last_login','reset_token','reset_expires','plan','billing_status','billing_next','billing_amount','billing_currency','billing_provider']);
  }
  return sh;
}

function ensureUserRow_(email, site) {
  if (!email) return;
  var ss = openSS_();
  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email.trim().toLowerCase());
  if (idx === -1) sh.appendRow([email.trim().toLowerCase(), site, 'client', '', '', '', '', '', '', '', '', '', '', '']);
}

function ensureResetColumns_(sh){
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  function ensure(name){
    if (!headers.includes(name)) {
      sh.getRange(1, sh.getLastColumn()+1).setValue(name);
      headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    }
  }
  ensure('reset_token');
  ensure('reset_expires');
}

function ensureBillingColumns_(sh){
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);

  function ensure(name){
    if (!headers.includes(name)) {
      sh.getRange(1, sh.getLastColumn()+1).setValue(name);
      headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    }
  }

  ensure('plan');
  ensure('billing_status');
  ensure('billing_next');
  ensure('billing_amount');
  ensure('billing_currency');
  ensure('billing_provider');
}

function headerIndexMap_(sh){
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var map = {}; for (var i=0;i<h.length;i++){ map[h[i]] = i; }
  map.email = map.email ?? 0; 
  map.siteSlug = map.siteSlug ?? 1; 
  map.role = map.role ?? 2;
  map.password_hash = map.password_hash ?? 3; 
  map.salt = map.salt ?? 4; 
  map.last_login = map.last_login ?? 5;
  map.reset_token = (typeof map['reset_token'] === 'number') ? map['reset_token'] : 6;
  map.reset_expires = (typeof map['reset_expires'] === 'number') ? map['reset_expires'] : 7;
  map.plan = (typeof map['plan'] === 'number') ? map['plan'] : 8;
  map.billing_status = (typeof map['billing_status'] === 'number') ? map['billing_status'] : 9;
  map.billing_next = (typeof map['billing_next'] === 'number') ? map['billing_next'] : 10;
  map.billing_amount = (typeof map['billing_amount'] === 'number') ? map['billing_amount'] : 11;
  map.billing_currency = (typeof map['billing_currency'] === 'number') ? map['billing_currency'] : 12;
  map.billing_provider = (typeof map['billing_provider'] === 'number') ? map['billing_provider'] : 13;
  return map;
}

function findUserRowByEmail_(sh, emailLc) {
  var last = sh.getLastRow(); if (last < 2) return -1;
  var values = sh.getRange(2,1,last-1,1).getValues();
  for (var i=0;i<values.length;i++) {
    var v = String(values[i][0] || '').trim().toLowerCase();
    if (v === emailLc) return i;
  }
  return -1;
}

function getPlanForUser_(ss, emailLc, siteSlug) {
  try {
    var sh = ss.getSheetByName('cadastros'); 
    if (!sh) return '';
    var last = sh.getLastRow(); if (last < 2) return '';
    var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    var idxEmail = headers.indexOf('email');
    var idxSite  = headers.indexOf('siteSlug');
    var idxPlan  = headers.indexOf('plan');
    if (idxPlan === -1) return '';
    var rows = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();

    var plan = '';
    for (var i = rows.length - 1; i >= 0; i--) {
      var r = rows[i];
      var e = String(r[idxEmail]||'').trim().toLowerCase();
      var s = String(r[idxSite]||'').trim().toUpperCase();
      if ((emailLc && e === emailLc) || (siteSlug && s === siteSlug)) {
        plan = String(r[idxPlan]||'');
        break;
      }
    }
    return plan;
  } catch (_) { return ''; }
}

function makeSalt_() {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, Utilities.getUuid());
  return bytesToHex_(bytes).substring(0, 32);
}

function sha256Hex_(txt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt);
  return bytesToHex_(raw);
}

function bytesToHex_(bytes) {
  var hex = '';
  for (var i=0;i<bytes.length;i++) {
    var val = bytes[i]; if (val < 0) val += 256;
    var b = val.toString(16); if (b.length === 1) hex += '0';
    hex += b;
  }
  return hex;
}

function isValidCPF_(cpf) {
  cpf = onlyDigits_(cpf); if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  var soma = 0, resto;
  for (var i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i), 10) * (11 - i);
  resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;
  soma = 0;
  for (var j = 1; j <= 10; j++) soma += parseInt(cpf.substring(j-1, j), 10) * (12 - j);
  resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11), 10)) return false;
  return true;
}

function getOrCreateSub_(root, name) {
  try {
    var it = root.getFoldersByName(name);
    return it.hasNext() ? it.next() : root.createFolder(name);
  } catch (e) {
    console.error("Error in getOrCreateSub_ for " + name + ":", e);
    return null;
  }
}

function slugExiste_(slug) {
  const ss = openSS_();
  const shCad = ss.getSheetByName('cadastros'); if (!shCad) return false;
  const last = shCad.getLastRow(); if (last < 2) return false;
  const headers = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(String);
  const idxSite = headers.indexOf('siteSlug'); if (idxSite === -1) return false;
  const vals = shCad.getRange(2, idxSite+1, last-1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    const s = String(vals[i][0] || '').trim().toUpperCase();
    if (s === slug) return true;
  }
  return false;
}

function safeJson_(o) {
  try { return JSON.stringify(o || {}); } catch (e) { return '{"ok":false,"error":"json_stringify"}'; }
}

/* ================== ONBOARDING (texto + prompt por plano) ================== */
function handleOnboarding_(ss, data) {
  var email = String(data.email || "").trim().toLowerCase();
  var site  = normalizeSlug_(String(data.siteSlug || data.site || ""));
  if (!email || !site) return jsonOut_({ ok:false, error:"missing_email_or_siteSlug" });

  if (!gateAllowOnboarding_(ss, data)) {
    return jsonOut_({ ok:false, error:"forbidden_onboarding" });
  }

  var plan    = String(data.plan || "").trim();
  var logoUrl = String(data.logoUrl || "");
  var fotosUrl= String(data.fotosUrl || data.fotosUrls || "");
  var historia= String(data.historia || "");
  var produtos= String(data.produtos || "");
  var fundacao= String(data.fundacao || "");
  var paleta  = String(data.paleta || data.paletteId || "");
  var template= String(data.template || data.templateId || "");
  var whatsapp= String(data.whatsapp || data.phone || "");
  var empresa = String(data.empresa || data.company || "");
  var enderecoRaw = data.endereco || data.address || "";
  var endereco = "";
  try {
    if (typeof enderecoRaw === 'object') {
      endereco = JSON.stringify(enderecoRaw);
    } else {
      endereco = String(enderecoRaw).trim();
    }
  } catch (e) {
    endereco = String(enderecoRaw).trim();
  }
  var driveFolderUrl = String(data.drive_folder_url || "");

  var sh = ensureOnboardingSheet_(ss);

  // Usar driveFolderUrl do payload ou criar novo
  if (!driveFolderUrl) {
    driveFolderUrl = ensureClientFolderUrl_(site);
  }
  var lovablePrompt = buildLovablePrompt_({
    plan: plan,
    email: email,
    siteSlug: site,
    logoUrl: logoUrl,
    fotosUrl: fotosUrl,
    historia: historia,
    produtos: produtos,
    fundacao: fundacao,
    paleta: paleta,
    template: template
  });

  sh.appendRow([
    new Date(), email, site, plan,
    logoUrl, fotosUrl, historia, produtos,
    fundacao, paleta, template,
    driveFolderUrl, lovablePrompt
  ]);

  try {
    var props = PropertiesService.getScriptProperties();
    var TEAM = props.getProperty('TEAM_EMAIL') || 'matheusmartinss@icloud.com';
    MailApp.sendEmail({
      to: TEAM,
      subject: '[Elevea] Novo onboarding - ' + site,
      htmlBody:
        '<p><b>Cliente:</b> ' + email + '</p>' +
        '<p><b>Site:</b> ' + site + '</p>' +
        (plan ? '<p><b>Plano:</b> ' + plan + '</p>' : '') +
        (driveFolderUrl ? ('<p><b>Pasta no Drive:</b> <a href="'+driveFolderUrl+'">'+driveFolderUrl+'</a></p>') : '') +
        '<hr><p><b>Prompt Lovable:</b></p><pre style="white-space:pre-wrap">'+lovablePrompt.replace(/</g,'&lt;')+'</pre>'
    });
  } catch (_) {}

  return jsonOut_({ ok:true });
}

function gateAllowOnboarding_(ss, data) {
  var props  = PropertiesService.getScriptProperties();
  var strict = String(props.getProperty("STRICT_ONBOARDING") || "").toLowerCase() === "true";
  if (!strict) return true;

  var mpid = String(data.payment_id || data.collection_id || data.mp_payment_id || "");
  var pre  = String(data.preapproval_id || data.mp_preapproval_id || "");
  var email = String(data.email || "").trim().toLowerCase();
  var site  = normalizeSlug_(String(data.siteSlug || ""));

  // 1) Caminho clássico: veio payment/preapproval → valida no "dados"
  if (mpid || pre) {
    var ok = hasApprovedEventForIds_(ss, mpid, pre);
    if (!ok) return false;

    // (Opcional) se quiser exigir matching por e-mail também quando vier id:
    if (email && !emailMatchesEvent_(ss, email, mpid, pre)) return false;

    return true;
  }

  // 2) Sem ids → fallback por e-mail recente aprovado
  if (!email) return false;

  var days = parseInt(String(props.getProperty("STRICT_ONBOARDING_EMAIL_DAYS") || "7"), 10);
  if (isNaN(days) || days <= 0) days = 7;

  var unique = String(props.getProperty("STRICT_ONBOARDING_EMAIL_UNIQUE") || "false").toLowerCase() === "true";

  var okRecent = hasRecentApprovedEventForEmail_(ss, email, days);
  if (!okRecent) return false;

  // 3) (Opcional) Se UNIQUE=true, não permitir onboarding com esse e-mail já usado em outro site
  if (unique && !emailAvailableForOnboarding_(ss, email, site)) return false;

  return true;
}

/* ======= NOVOS HELPERS para o AdminDashboard (sites/status) ======= */
function getSiteSlugs_() {
  try {
    const ss = openSS_();
    const shCad = ss.getSheetByName("cadastros");
    if (!shCad) return [];

    const data = shCad.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idxSite = headers.indexOf("siteSlug");

    if (idxSite === -1) return [];

    return data.slice(1)
      .map(row => String(row[idxSite] || "").trim())
      .filter(slug => slug.length > 0);
  } catch (e) {
    console.error("getSiteSlugs_ error:", e);
    return [];
  }
}

/** Status de cobrança considerado "ativo" (helper único usado em todo o dash) */
function isActiveStatus_(s) {
  s = String(s || '').toLowerCase();
  return s === 'approved' || s === 'authorized' || s === 'accredited' ||
         s === 'recurring_charges' || s === 'active';
}

function getStatusForSite_(slug) {
  try {
    const ss = openSS_();
    const shCad = ss.getSheetByName("cadastros");
    if (!shCad) return { ok: false, error: "missing_sheet_cadastros" };

    const data = shCad.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idxSite = headers.indexOf("siteSlug");
    const idxEmail = headers.indexOf("email");
    const idxManual = headers.indexOf("manual_block");
    const idxActive = headers.indexOf("active");
    const idxPreapproval = headers.indexOf("preapproval_id");

    if (idxSite === -1) return { ok: false, error: "missing_siteSlug_header" };

    const row = data.find(r => normalizeSlug_(String(r[idxSite] || "")) === slug);
    if (!row) return { ok: false, error: "site_not_found" };

    const email = String(row[idxEmail] || "");
    const manualBlock = String(row[idxManual] || "").toLowerCase() === "true";
    const active = String(row[idxActive] || "").toLowerCase() === "true";
    const preapprovalId = String(row[idxPreapproval] || "");

    return {
      ok: true,
      active: active,
      manualBlock: manualBlock,
      status: "active",
      preapproval_id: preapprovalId,
      email: email,
      updatedAt: new Date().toISOString()
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** ======= POLÍTICA DE COBRANÇA ======= */
const GRACE_DAYS = 3;                   // margem após a data da renovação
const RENEWAL_INTERVAL_DAYS = 30;       // recorrência
const AUTO_BLOCK_OVER_GRACE = true;     // se true, marca manual_block=TRUE ao cancelar

function addDays_(date, days) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function clampToMidnight_(d) {
  var x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

function clientBilling_(ss, data){
  var email = String(data.email || '').trim().toLowerCase();
  if (!email) return jsonOut_({ ok:false, error:'missing_email' });

  var sh = ensureUsuariosSheet_(ss);
  var idx = findUserRowByEmail_(sh, email);
  if (idx === -1) return jsonOut_({ ok:false, error:'not_found' });
  ensureBillingColumns_(sh);
  var row = idx + 2;
  var map = headerIndexMap_(sh);

  // plano (com fallback do cadastro)
  var plan = String(sh.getRange(row, map.plan+1).getValue() || '');
  if (!plan) {
    var site = String(sh.getRange(row, map.siteSlug+1).getValue() || '').trim().toUpperCase();
    var planFromCad = getPlanForUser_(ss, email, site);
    if (planFromCad) { 
      plan = planFromCad; 
      sh.getRange(row, map.plan+1).setValue(plan); 
    }
  }

  // lê valores existentes
  var status   = String(sh.getRange(row, map.billing_status+1).getValue() || '') || '';
  var next     = sh.getRange(row, map.billing_next+1).getValue();
  var amount   = Number(sh.getRange(row, map.billing_amount+1).getValue() || 0) || 0;
  var currency = String(sh.getRange(row, map.billing_currency+1).getValue() || '') || 'BRL';
  var provider = String(sh.getRange(row, map.billing_provider+1).getValue() || '') || 'mercadopago';
  var siteSlug = String(sh.getRange(row, map.siteSlug+1).getValue() || '').trim().toUpperCase();

  /* ---------- FALLBACKS DE STATUS ---------- */
  var statusLower = String(status).toLowerCase();
  var isActive = isActiveStatus_(statusLower);

  // 1) Se vazio ou inativo, tenta do cadastro
  if (!isActive) {
    var s = siteSlug ? getStatusForSite_(siteSlug) : { ok:false };
    if (s && s.ok && s.status) {
      statusLower = String(s.status).toLowerCase();
      isActive = isActiveStatus_(statusLower);
    }
  }
  // 2) Se ainda não, tenta ver se há aprovação recente no histórico por e-mail
  if (!isActive) {
    var lastApprovedByMail = getLastApprovedPaymentDateForEmail_(ss, email);
    if (lastApprovedByMail) {
      statusLower = 'approved';
      isActive = true;
      // também calcula next caso não exista
      if (!next) {
        var dNext = addDays_(clampToMidnight_(lastApprovedByMail), RENEWAL_INTERVAL_DAYS);
        sh.getRange(row, map.billing_next+1).setValue(dNext);
        next = dNext;
      }
    }
  }

  // Persistir status caso tenha mudado
  if (statusLower && statusLower !== String(status).toLowerCase()) {
    sh.getRange(row, map.billing_status+1).setValue(statusLower);
  }

  // next padrão se continuar vazio
  if (!next) {
    var d = new Date(Date.now() + 1000*60*60*24*30);
    sh.getRange(row, map.billing_next+1).setValue(d);
    next = d;
  }

  // amount padrão por plano
  if (amount === 0) {
    amount = String(plan).toLowerCase().indexOf('vip') !== -1 ? 99.9 : 39.9;
    sh.getRange(row, map.billing_amount+1).setValue(amount);
  }

  // grava sempre currency/provider
  sh.getRange(row, map.billing_currency+1).setValue(currency);
  sh.getRange(row, map.billing_provider+1).setValue(provider);

  return jsonOut_({
    ok:true,
    plan: (String(plan).toLowerCase().indexOf('vip')!==-1 ? 'vip':'essential'),
    status: statusLower || 'pending',
    provider,
    next_renewal: next ? new Date(next).toISOString() : null,
    last_payment: amount > 0 ? { date: new Date().toISOString(), amount: amount } : null,
    amount, currency
  });
}

/** ================== Sheets / Drive helpers ================== */
function ensureOnboardingSheet_(ss) {
  var sh = ss.getSheetByName("onboarding");
  if (!sh) sh = ss.insertSheet("onboarding");
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      "timestamp","email","siteSlug","plan",
      "logoUrl","fotosUrl","historia","produtos","fundacao","paleta","template",
      "drive_folder_url","lovable_prompt"
    ]);
  }
  return sh;
}

function ensureClientFolderUrl_(site) {
  try {
    site = normalizeSlug_(String(site || ""));
    if (!site) return "";

    // pasta raiz única da Elevea
    var it = DriveApp.getFoldersByName("Elevea Sites");
    var parent = it.hasNext() ? it.next() : DriveApp.createFolder("Elevea Sites");

    var folderName = "SITE-" + site;
    var it2 = parent.getFoldersByName(folderName);
    var folder = it2.hasNext() ? it2.next() : parent.createFolder(folderName);

    // subpastas
    function ensureSub(name) {
      try {
        var s = folder.getFoldersByName(name);
        return s.hasNext() ? s.next() : folder.createFolder(name);
      } catch (subErr) {
        console.error("Error creating subfolder " + name + ":", subErr);
        return null;
      }
    }
    ensureSub("logo");
    ensureSub("fotos");

    return folder.getUrl();
  } catch (e) {
    console.error("Error in ensureClientFolderUrl_:", e);
    return "";
  }
}

/** ===== Paletas & Templates (catálogo) ===== */
function paletteMap_(id) {
  var map = {
    "dourado":  { name: "Dourado elegante", colors: ["#b98a2f","#111","#f6f3ee"] },
    "azul":     { name: "Azul confiança",   colors: ["#1e3a8a","#0f172a","#f1f5f9"] },
    "verde":    { name: "Verde natural",    colors: ["#166534","#081f0f","#def7e7"] },
    "vermelho": { name: "Vermelho vibrante",colors: ["#b91c1c","#111","#fa7a22"] },
    "preto":    { name: "Preto & Branco",   colors: ["#111","#fff","#e5e7eb"] },
    "escuro":   { name: "Dark/Neon",        colors: ["#0b1220","#0c151c","#39ff88"] },
    "claro":    { name: "Light clean",      colors: ["#ffffff","#111827","#e5e7eb"] },
  };
  return map[id] || { name:"Personalizada", colors:[] };
}

function templateMap_(id) {
  var map = {
    "classico":  { name:"Clássico",  descricao:"Hero simples, seção sobre, serviços em cards, CTA WhatsApp." },
    "moderno":   { name:"Moderno",   descricao:"Grid de serviços, depoimentos, destaque para WhatsApp e mapa." },
    "minimal":   { name:"Minimal",   descricao:"Seções amplas, tipografia forte e foco no CTA." },
    "navegacao": { name:"Âncoras",   descricao:"Nav flutuante com rolagem por sessões." },
  };
  return map[id] || { name:"Custom", descricao:"" };
}

/** ================== PROMPT (Lovable) – CLIENTE ================== */
function buildLovablePrompt_(ctx) {
  var plan      = String(ctx.plan || "").toLowerCase();          // "vip" | "essential"
  var site      = String(ctx.siteSlug || "").toUpperCase();
  var email     = String(ctx.email || "");
  var logoUrl   = String(ctx.logoUrl || "");
  var fotosUrl  = String(ctx.fotosUrl || "");
  var historia  = String(ctx.historia || "");
  var produtos  = String(ctx.produtos || "");
  var fundacao  = String(ctx.fundacao || "");
  var paletaId  = String(ctx.paleta || "");
  var template  = String(ctx.template || "");

  var L = [];

  /* — Objetivo */
  L.push("Crie uma landing institucional (one-page) completa para um pequeno negócio local.");
  L.push("Use Vite + React + TypeScript + Tailwind. Uma única rota pública '/' (sem telas logadas).");
  L.push("Hospedagem Netlify. O repositório terá `src/elevea.sections.json` e um script de pós-deploy que envia esse JSON ao meu GAS.");

  /* — ENV VARS (Netlify) que você deve ler no build/runtime */
  L.push("Variáveis do Netlify que DEVEM ser usadas:");
  L.push("- ELEVEA_SITE_SLUG      → slug MAIÚSCULO do site (ex.: ACME-MOTOS)");
  L.push("- ELEVEA_GAS_URL        → URL do GAS (/exec)");
  L.push("- ELEVEA_ADMIN_TOKEN    → token igual ao ADMIN_DASH_TOKEN no GAS (para publicar sections)");
  L.push("- ELEVEA_STATUS_URL     → (opcional) mesma URL do GAS para checar status e carregar settings");

  /* — Detecção automática do tipo de negócio */
  var businessText = [historia, produtos].filter(Boolean).join(" ");
  var businessDetection = detectBusinessType(businessText);
  var businessCategory = businessDetection.category;
  
  L.push("TIPO DE NEGÓCIO DETECTADO: " + businessCategory.toUpperCase());
  L.push("Palavras-chave: " + businessDetection.keywords.join(", "));
  
  /* — Mapa de sessões personalizadas por tipo de negócio */
  var sectionsConfig = generateSectionsForBusiness_(businessCategory, { historia: historia, produtos: produtos });
  
  L.push("Gere um arquivo **src/elevea.sections.json** com um array de sessões personalizadas para " + businessCategory + ":");
  L.push(JSON.stringify(sectionsConfig, null, 2));

  /* — Script pós-deploy (Netlify onSuccess) para publicar defs no GAS */
  L.push("Crie `tools/elevea-sync-sections.mjs` (Node 18+, sem libs externas): lê `src/elevea.sections.json` e POST em ELEVEA_GAS_URL:");
  L.push(`
import fs from "node:fs";
const GAS=process.env.ELEVEA_GAS_URL, SITE=process.env.ELEVEA_SITE_SLUG, ADMIN=process.env.ELEVEA_ADMIN_TOKEN;
if (GAS && SITE && ADMIN && fs.existsSync("src/elevea.sections.json")) {
  const defs = JSON.parse(fs.readFileSync("src/elevea.sections.json","utf8"));
  console.log("🔄 Enviando defs ao GAS:", SITE);
  const res = await fetch(GAS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "sections_upsert_defs", site: SITE, token: ADMIN, defs })
  });
  const txt = await res.text();
  console.log(res.status, txt);
} else console.log("❌ ENV vars ausentes ou arquivo sections.json não encontrado.");
`);

  /* — Paleta/tema */
  var pal = paletteMap_(paletaId);
  if (pal.colors && pal.colors.length >= 3) {
    L.push("PALETA: " + pal.name + " → Primary: " + pal.colors[0] + ", Dark: " + pal.colors[1] + ", Light: " + pal.colors[2]);
  }

  /* — Template */
  var tpl = templateMap_(template);
  if (tpl.name && tpl.name !== "Custom") {
    L.push("TEMPLATE: " + tpl.name + " → " + tpl.descricao);
  }

  /* — Conteúdo cliente */
  L.push("===== CONTEÚDO DO CLIENTE =====");
  if (email)    L.push("Email: " + email);
  if (empresa)  L.push("Empresa: " + empresa);
  if (historia) L.push("História: " + historia);
  if (produtos) L.push("Produtos/Serviços: " + produtos);
  if (fundacao) L.push("Fundação: " + fundacao);
  if (logoUrl)  L.push("Logo URL: " + logoUrl);
  if (fotosUrl) L.push("Fotos URL: " + fotosUrl);

  return L.join("\n");
}