import type { Handler } from '@netlify/functions';
import { verifyVipAccess, rateLimitMiddleware } from './shared/security';

// Google Apps Script integration  
const GAS_BASE_URL = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL || process.env.SHEETS_WEBAPP_URL || '';

async function callGAS(type: string, data: any) {
  if (!GAS_BASE_URL) {
    throw new Error('Google Apps Script URL not configured');
  }

  const response = await fetch(GAS_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...data })
  });

  if (!response.ok) {
    throw new Error(`GAS request failed: ${response.status}`);
  }

  return await response.json();
}

interface ResellerAccount {
  id: string;
  agencyName: string;
  agencySlug: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  website?: string;
  logo?: string;
  brandingConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    customDomain?: string;
    companyName: string;
    footerText?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    clientLimit: number;
    currentClients: number;
    nextBilling: string;
    monthlyRevenue: number;
  };
  commission: {
    rate: number; // Percentual de comissão
    totalEarned: number;
    thisMonth: number;
    lastPayout: string;
    paymentMethod: 'bank_transfer' | 'pix' | 'paypal';
    accountDetails: any;
  };
  features: {
    customBranding: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    subResellerNetwork: boolean;
  };
  settings: {
    autoClientApproval: boolean;
    requireClientApproval: boolean;
    defaultClientPlan: 'essential' | 'vip';
    customPricing: boolean;
    allowTrials: boolean;
    maxTrialDays: number;
  };
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'active' | 'suspended';
}

interface ClientAccount {
  id: string;
  siteSlug: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  plan: 'essential' | 'vip';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  resellerId: string;
  resellerName: string;
  monthlyRevenue: number;
  trialEndsAt?: string;
  createdAt: string;
  lastLogin?: string;
  features: string[];
  customPricing?: {
    monthlyPrice: number;
    currency: string;
  };
}

const headers = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
    await rateLimitMiddleware('white-label', event)
    
    const body = JSON.parse(event.body || '{}')
    const { action, siteSlug, vipPin } = body

    if (!siteSlug || !vipPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'Site e PIN VIP são obrigatórios' 
        })
      }
    }

    // Verificar acesso VIP
    const isVipValid = await verifyVipAccess(siteSlug, vipPin)
    if (!isVipValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'Acesso VIP inválido' })
      }
    }

      switch (action) {
        // GESTÃO DE REVENDEDORES
        case 'create_reseller':
          return createResellerAccount(body.resellerData);
        
        case 'get_reseller_profile':
          return getResellerProfile(body.resellerId);
        
        case 'update_reseller_profile':
          return updateResellerProfile(body.resellerId, body.profileData);
        
        case 'get_reseller_branding':
          return getResellerBranding(body.resellerId);
        
        case 'update_reseller_branding':
          return updateResellerBranding(body.resellerId, body.brandingData);
        
        // GESTÃO DE CLIENTES DO REVENDEDOR
        case 'get_reseller_clients':
          return getResellerClients(body.resellerId, body.filters);
        
        case 'add_client_to_reseller':
          return addClientToReseller(body.resellerId, body.clientData);
        
        case 'update_client_plan':
          return updateClientPlan(body.resellerId, body.clientId, body.planData);
        
        case 'suspend_client':
          return suspendClient(body.resellerId, body.clientId);
        
        // ANALYTICS E COMISSÕES
        case 'get_reseller_analytics':
          return getResellerAnalytics(body.resellerId, body.period);
        
        case 'get_commission_report':
          return getCommissionReport(body.resellerId, body.period);
        
        case 'request_payout':
          return requestPayout(body.resellerId, body.amount);
        
        // CONFIGURAÇÕES DE MARCA
        case 'generate_white_label_site':
          return generateWhiteLabelSite(body.resellerId);
        
        case 'update_custom_domain':
          return updateCustomDomain(body.resellerId, body.domain);
        
        case 'get_branding_preview':
          return getBrandingPreview(body.resellerId);

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ ok: false, error: 'Ação inválida' })
          }
      }

  } catch (error) {
    console.error('Erro no sistema white-label:', error)
    
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
};

// ================= GESTÃO DE REVENDEDORES =================

async function createResellerAccount(resellerData: any) {
  try {
    // Validar dados obrigatórios
    if (!resellerData.agencyName || !resellerData.ownerEmail || !resellerData.agencySlug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Nome da agência, email e slug são obrigatórios'
        })
      };
    }

    // Verificar se slug já existe
    const existingReseller = await callGAS('white_label_check_slug', {
      slug: resellerData.agencySlug
    });

    if (existingReseller.exists) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Slug da agência já está em uso'
        })
      };
    }

    const newReseller: ResellerAccount = {
      id: generateResellerId(),
      agencyName: resellerData.agencyName,
      agencySlug: resellerData.agencySlug,
      ownerName: resellerData.ownerName,
      ownerEmail: resellerData.ownerEmail,
      phone: resellerData.phone,
      website: resellerData.website,
      logo: resellerData.logo,
      brandingConfig: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#10B981',
        companyName: resellerData.agencyName,
        footerText: `© ${new Date().getFullYear()} ${resellerData.agencyName}. Todos os direitos reservados.`,
        metaTitle: `${resellerData.agencyName} - Soluções Digitais`,
        metaDescription: `Criamos websites profissionais e soluções digitais completas para o seu negócio.`
      },
      subscription: {
        plan: 'starter',
        status: 'active',
        clientLimit: 10,
        currentClients: 0,
        nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        monthlyRevenue: 0
      },
      commission: {
        rate: 30, // 30% de comissão padrão
        totalEarned: 0,
        thisMonth: 0,
        lastPayout: '',
        paymentMethod: 'pix',
        accountDetails: {}
      },
      features: {
        customBranding: true,
        whiteLabel: true,
        customDomain: false,
        advancedAnalytics: false,
        prioritySupport: true,
        apiAccess: false,
        subResellerNetwork: false
      },
      settings: {
        autoClientApproval: false,
        requireClientApproval: true,
        defaultClientPlan: 'essential',
        customPricing: false,
        allowTrials: true,
        maxTrialDays: 7
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending'
    };

    // Salvar no Google Sheets
    const gasResponse = await callGAS('white_label_create_reseller', {
      reseller: newReseller
    });

    if (!gasResponse.ok) {
      throw new Error('Falha ao criar conta de revendedor');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        reseller: newReseller,
        message: 'Conta de revendedor criada com sucesso. Aguarde aprovação.',
        nextSteps: [
          'Aguardar aprovação da equipe Elevea',
          'Configurar branding personalizado',
          'Definir domínio customizado (opcional)',
          'Começar a adicionar clientes'
        ]
      })
    };

  } catch (error) {
    console.error('Erro ao criar revendedor:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

function generateResellerId(): string {
  return `reseller_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getResellerProfile(resellerId: string) {
  try {
    const gasResponse = await callGAS('white_label_get_reseller', {
      resellerId: resellerId
    });

    if (gasResponse.ok && gasResponse.reseller) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          reseller: gasResponse.reseller
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Revendedor não encontrado'
      })
    };

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function updateResellerProfile(resellerId: string, profileData: any) {
  try {
    const gasResponse = await callGAS('white_label_update_reseller', {
      resellerId: resellerId,
      updates: {
        ...profileData,
        updatedAt: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        message: 'Perfil atualizado com sucesso',
        reseller: gasResponse.reseller
      })
    };

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

// ================= BRANDING CUSTOMIZADO =================

async function getResellerBranding(resellerId: string) {
  try {
    const gasResponse = await callGAS('white_label_get_branding', {
      resellerId: resellerId
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          branding: gasResponse.branding,
          previewUrl: `https://${gasResponse.branding.agencySlug}.elevea.app`
        })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({
        success: false,
        error: 'Configuração de marca não encontrada'
      })
    };

  } catch (error) {
    console.error('Erro ao buscar branding:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function updateResellerBranding(resellerId: string, brandingData: any) {
  try {
    // Validar cores
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (brandingData.primaryColor && !colorRegex.test(brandingData.primaryColor)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Cor primária deve estar no formato hexadecimal (#FFFFFF)'
        })
      };
    }

    const gasResponse = await callGAS('white_label_update_branding', {
      resellerId: resellerId,
      branding: brandingData
    });

    // Regenerar site white-label com novo branding
    await generateWhiteLabelSite(resellerId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Branding atualizado com sucesso',
        branding: gasResponse.branding,
        previewUrl: `https://${gasResponse.branding.agencySlug}.elevea.app`
      })
    };

  } catch (error) {
    console.error('Erro ao atualizar branding:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

// ================= GESTÃO DE CLIENTES =================

async function getResellerClients(resellerId: string, filters?: any) {
  try {
    const gasResponse = await callGAS('white_label_get_clients', {
      resellerId: resellerId,
      filters: filters
    });

    if (gasResponse.ok) {
      const clients = gasResponse.clients || [];
      
      // Calcular métricas
      const metrics = {
        totalClients: clients.length,
        activeClients: clients.filter((c: ClientAccount) => c.status === 'active').length,
        trialClients: clients.filter((c: ClientAccount) => c.status === 'trial').length,
        monthlyRevenue: clients.reduce((sum: number, c: ClientAccount) => sum + c.monthlyRevenue, 0),
        averageRevenue: clients.length > 0 ? clients.reduce((sum: number, c: ClientAccount) => sum + c.monthlyRevenue, 0) / clients.length : 0
      };

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          clients: clients,
          metrics: metrics,
          pagination: gasResponse.pagination
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        clients: [],
        metrics: {
          totalClients: 0,
          activeClients: 0,
          trialClients: 0,
          monthlyRevenue: 0,
          averageRevenue: 0
        }
      })
    };

  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function addClientToReseller(resellerId: string, clientData: any) {
  try {
    // Verificar limite de clientes
    const resellerProfile = await callGAS('white_label_get_reseller', {
      resellerId: resellerId
    });

    if (!resellerProfile.ok) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Revendedor não encontrado'
        })
      };
    }

    const reseller = resellerProfile.reseller;
    if (reseller.subscription.currentClients >= reseller.subscription.clientLimit) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Limite de clientes atingido. Faça upgrade do seu plano.',
          currentLimit: reseller.subscription.clientLimit
        })
      };
    }

    const newClient: ClientAccount = {
      id: generateClientId(),
      siteSlug: clientData.siteSlug,
      businessName: clientData.businessName,
      ownerName: clientData.ownerName,
      ownerEmail: clientData.ownerEmail,
      phone: clientData.phone,
      plan: clientData.plan || reseller.settings.defaultClientPlan,
      status: reseller.settings.autoClientApproval ? 'active' : 'trial',
      resellerId: resellerId,
      resellerName: reseller.agencyName,
      monthlyRevenue: clientData.customPricing?.monthlyPrice || (clientData.plan === 'vip' ? 97 : 29),
      trialEndsAt: reseller.settings.allowTrials ? 
        new Date(Date.now() + reseller.settings.maxTrialDays * 24 * 60 * 60 * 1000).toISOString() : 
        undefined,
      createdAt: new Date().toISOString(),
      features: clientData.features || [],
      customPricing: clientData.customPricing
    };

    const gasResponse = await callGAS('white_label_add_client', {
      resellerId: resellerId,
      client: newClient
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        client: newClient,
        message: 'Cliente adicionado com sucesso'
      })
    };

  } catch (error) {
    console.error('Erro ao adicionar cliente:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ================= ANALYTICS E COMISSÕES =================

async function getResellerAnalytics(resellerId: string, period: string) {
  try {
    const gasResponse = await callGAS('white_label_get_analytics', {
      resellerId: resellerId,
      period: period
    });

    if (gasResponse.ok) {
      // Calcular métricas adicionais
      const analytics = {
        ...gasResponse.analytics,
        growth: {
          clientsGrowth: calculateGrowth(gasResponse.analytics.currentPeriod.clients, gasResponse.analytics.previousPeriod.clients),
          revenueGrowth: calculateGrowth(gasResponse.analytics.currentPeriod.revenue, gasResponse.analytics.previousPeriod.revenue),
          commissionGrowth: calculateGrowth(gasResponse.analytics.currentPeriod.commission, gasResponse.analytics.previousPeriod.commission)
        },
        projections: {
          nextMonthRevenue: gasResponse.analytics.currentPeriod.revenue * 1.1,
          yearEndRevenue: gasResponse.analytics.currentPeriod.revenue * 12,
          potentialCommission: gasResponse.analytics.currentPeriod.revenue * (gasResponse.analytics.commissionRate / 100)
        }
      };

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          analytics: analytics
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        analytics: {
          currentPeriod: { clients: 0, revenue: 0, commission: 0 },
          previousPeriod: { clients: 0, revenue: 0, commission: 0 },
          growth: { clientsGrowth: 0, revenueGrowth: 0, commissionGrowth: 0 },
          projections: { nextMonthRevenue: 0, yearEndRevenue: 0, potentialCommission: 0 }
        }
      })
    };

  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

async function getCommissionReport(resellerId: string, period: string) {
  try {
    const gasResponse = await callGAS('white_label_get_commission_report', {
      resellerId: resellerId,
      period: period
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        report: gasResponse.report || {
          totalEarned: 0,
          pendingPayout: 0,
          thisMonth: 0,
          transactions: []
        }
      })
    };

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

// ================= GERAÇÃO DE SITE WHITE-LABEL =================

async function generateWhiteLabelSite(resellerId: string) {
  try {
    const resellerData = await callGAS('white_label_get_reseller', {
      resellerId: resellerId
    });

    if (!resellerData.ok) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Revendedor não encontrado'
        })
      };
    }

    const reseller = resellerData.reseller;
    const branding = reseller.brandingConfig;

    // Gerar estrutura do site white-label
    const siteStructure = {
      agencySlug: reseller.agencySlug,
      siteData: {
        title: branding.metaTitle || `${branding.companyName} - Soluções Digitais`,
        description: branding.metaDescription || `Criamos websites profissionais e soluções digitais completas para o seu negócio.`,
        hero: {
          title: `Transforme seu negócio com ${branding.companyName}`,
          subtitle: 'Criamos websites profissionais que convertem visitantes em clientes.',
          cta: 'Começar Agora',
          backgroundImage: '/images/hero-bg.jpg'
        },
        services: [
          {
            title: 'Websites Profissionais',
            description: 'Sites responsivos e otimizados para conversão',
            icon: 'globe'
          },
          {
            title: 'Marketing Digital',
            description: 'Estratégias para aumentar sua presença online',
            icon: 'megaphone'
          },
          {
            title: 'Automação',
            description: 'Processos automáticos para economizar tempo',
            icon: 'automation'
          }
        ],
        contact: {
          email: reseller.ownerEmail,
          phone: reseller.phone,
          whatsapp: reseller.phone
        },
        branding: {
          logo: branding.logoUrl,
          colors: {
            primary: branding.primaryColor,
            secondary: branding.secondaryColor,
            accent: branding.accentColor
          },
          companyName: branding.companyName,
          footerText: branding.footerText
        }
      }
    };

    // Salvar estrutura do site
    const gasResponse = await callGAS('white_label_generate_site', {
      resellerId: resellerId,
      siteStructure: siteStructure
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Site white-label gerado com sucesso',
        siteUrl: `https://${reseller.agencySlug}.elevea.app`,
        customDomain: branding.customDomain ? `https://${branding.customDomain}` : null,
        structure: siteStructure
      })
    };

  } catch (error) {
    console.error('Erro ao gerar site:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function updateCustomDomain(resellerId: string, domain: string) {
  try {
    // Validar formato do domínio
    const domainRegex = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Formato de domínio inválido'
        })
      };
    }

    const gasResponse = await callGAS('white_label_update_domain', {
      resellerId: resellerId,
      domain: domain
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Domínio customizado configurado',
        domain: domain,
        instructions: [
          'Configure os seguintes registros DNS:',
          `CNAME: www.${domain} -> elevea-proxy.netlify.app`,
          `A: ${domain} -> 75.2.60.5`,
          'Aguarde até 24h para propagação'
        ]
      })
    };

  } catch (error) {
    console.error('Erro ao configurar domínio:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function getBrandingPreview(resellerId: string) {
  try {
    const resellerData = await callGAS('white_label_get_reseller', {
      resellerId: resellerId
    });

    if (resellerData.ok) {
      const branding = resellerData.reseller.brandingConfig;
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          preview: {
            colors: {
              primary: branding.primaryColor,
              secondary: branding.secondaryColor,
              accent: branding.accentColor
            },
            logo: branding.logoUrl,
            companyName: branding.companyName,
            previewUrl: `https://${resellerData.reseller.agencySlug}.elevea.app`,
            mockup: generateBrandingMockup(branding)
          }
        })
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({
        success: false,
        error: 'Configuração não encontrada'
      })
    };

  } catch (error) {
    console.error('Erro ao gerar preview:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

function generateBrandingMockup(branding: any) {
  return {
    header: {
      backgroundColor: branding.primaryColor,
      logo: branding.logoUrl,
      companyName: branding.companyName
    },
    hero: {
      backgroundColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      title: `Transforme seu negócio com ${branding.companyName}`,
      subtitle: 'Criamos websites profissionais que convertem visitantes em clientes.'
    },
    footer: {
      backgroundColor: branding.primaryColor,
      text: branding.footerText
    }
  };
}

// Funções auxiliares para outras operações
async function updateClientPlan(resellerId: string, clientId: string, planData: any) {
  try {
    const gasResponse = await callGAS('white_label_update_client_plan', {
      resellerId,
      clientId,
      planData
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Plano do cliente atualizado',
        client: gasResponse.client
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function suspendClient(resellerId: string, clientId: string) {
  try {
    const gasResponse = await callGAS('white_label_suspend_client', {
      resellerId,
      clientId
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Cliente suspenso',
        client: gasResponse.client
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}

async function requestPayout(resellerId: string, amount: number) {
  try {
    const gasResponse = await callGAS('white_label_request_payout', {
      resellerId,
      amount
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Solicitação de saque enviada',
        payout: gasResponse.payout
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
}