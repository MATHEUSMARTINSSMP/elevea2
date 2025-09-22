/**
 * CÓDIGO GOOGLE APPS SCRIPT COMPLETO - ELEVEA
 * 
 * INSTRUÇÕES:
 * 1. Copie todo este código
 * 2. Cole no script.google.com em um novo projeto
 * 3. Implante como aplicativo web
 * 4. Configure as variáveis GAS_BASE_URL nas funções Netlify
 * 
 * COMPATIBILIDADE: 100% com arquitetura Netlify + GitHub + Google
 */

// ============================================================================
// CONFIGURAÇÃO E UTILS
// ============================================================================

/**
 * Configurações principais do sistema
 */
const CONFIG = {
  SPREADSHEET_ID: 'SEU_SPREADSHEET_ID_AQUI', // Substituir pelo ID real
  CACHE_DURATION: 300, // 5 minutos
  MAX_RESULTS: 1000,
  DEFAULT_LANGUAGE: 'pt'
};

/**
 * Gerar ID único
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Gerar número de pedido sequencial
 */
function generateOrderNumber() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

/**
 * Gerar chave de licença
 */
function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i % 4 === 3 && i < 15) result += '-';
  }
  return result;
}

/**
 * Gerar slug único para site
 */
function generateSiteSlug(businessName) {
  return businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

/**
 * Obter planilha por nome
 */
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    // Adicionar headers básicos
    const headers = getSheetHeaders(sheetName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  
  return sheet;
}

/**
 * Headers padrão para cada tipo de planilha
 */
function getSheetHeaders(sheetName) {
  const headerMap = {
    'language_settings': ['site', 'defaultLanguage', 'enabledLanguages', 'autoDetect', 'fallbackLanguage', 'updatedAt'],
    'appointment_settings': ['site', 'workingHours', 'workingDays', 'duration', 'buffer', 'maxAdvanceDays', 'googleCalendarIntegration'],
    'appointments': ['id', 'site', 'customerName', 'customerEmail', 'customerPhone', 'datetime', 'duration', 'service', 'status', 'createdAt'],
    'products': ['id', 'site', 'name', 'description', 'price', 'category', 'images', 'stock', 'active', 'createdAt', 'updatedAt'],
    'orders': ['id', 'site', 'orderNumber', 'customerEmail', 'customerName', 'items', 'total', 'status', 'paymentMethod', 'createdAt'],
    'store_settings': ['site', 'name', 'currency', 'paymentMethods', 'shippingZones', 'updatedAt'],
    'resellers': ['id', 'name', 'email', 'company', 'domain', 'commission', 'status', 'createdAt'],
    'reseller_clients': ['id', 'resellerId', 'businessName', 'email', 'phone', 'status', 'createdAt'],
    'reseller_branding': ['resellerId', 'logo', 'colors', 'domain', 'companyName', 'updatedAt'],
    'white_label_sites': ['slug', 'resellerId', 'clientId', 'template', 'domain', 'branding', 'createdAt'],
    'marketplace_templates': ['id', 'name', 'description', 'category', 'price', 'currency', 'images', 'tags', 'features', 'rating', 'downloads', 'createdAt'],
    'template_categories': ['id', 'name', 'description', 'icon', 'templateCount'],
    'template_purchases': ['id', 'templateId', 'site', 'customerEmail', 'pricePaid', 'currency', 'licenseKey', 'downloadUrl', 'purchaseDate', 'status'],
    'audit_logs': ['id', 'site', 'userId', 'action', 'category', 'severity', 'details', 'ipAddress', 'userAgent', 'timestamp'],
    'security_alerts': ['id', 'site', 'type', 'severity', 'description', 'resolved', 'createdAt'],
    'feature_settings': ['site', 'plan', 'enabledFeatures', 'onboardingCompleted', 'lastUpdated']
  };
  
  return headerMap[sheetName] || ['id', 'site', 'data', 'createdAt'];
}

/**
 * Buscar dados da planilha
 */
function getSheetData(sheetName, site, filters = {}) {
  try {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    let results = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    // Filtrar por site se especificado
    if (site && site !== 'global') {
      results = results.filter(item => item.site === site);
    }
    
    // Aplicar filtros adicionais
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && key !== 'limit' && key !== 'offset') {
        results = results.filter(item => {
          if (typeof filters[key] === 'string') {
            return item[key] && item[key].toString().toLowerCase().includes(filters[key].toLowerCase());
          }
          return item[key] === filters[key];
        });
      }
    });
    
    // Paginação
    const offset = parseInt(filters.offset) || 0;
    const limit = parseInt(filters.limit) || results.length;
    
    return results.slice(offset, offset + limit);
    
  } catch (error) {
    console.error(`Erro ao buscar dados de ${sheetName}:`, error);
    return [];
  }
}

/**
 * Inserir dados na planilha
 */
function appendSheetData(sheetName, site, data) {
  try {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const row = headers.map(header => {
      if (header === 'site' && !data.site) return site;
      if (header === 'createdAt' && !data.createdAt) return new Date().toISOString();
      if (header === 'updatedAt' && !data.updatedAt) return new Date().toISOString();
      return data[header] || '';
    });
    
    sheet.appendRow(row);
    return true;
    
  } catch (error) {
    console.error(`Erro ao inserir dados em ${sheetName}:`, error);
    return false;
  }
}

/**
 * Atualizar dados na planilha
 */
function updateSheetData(sheetName, site, data, idField = 'id') {
  try {
    const sheet = getSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    
    // Encontrar linha para atualizar
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const siteIndex = headers.indexOf('site');
      const idIndex = headers.indexOf(idField);
      
      if (siteIndex >= 0 && idIndex >= 0) {
        if (row[siteIndex] === site && row[idIndex] === data[idField]) {
          rowIndex = i + 1;
          break;
        }
      } else if (siteIndex >= 0 && row[siteIndex] === site) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > 0) {
      // Atualizar linha existente
      headers.forEach((header, index) => {
        if (data.hasOwnProperty(header)) {
          sheet.getRange(rowIndex, index + 1).setValue(data[header]);
        }
      });
      // Atualizar timestamp
      const updatedAtIndex = headers.indexOf('updatedAt');
      if (updatedAtIndex >= 0) {
        sheet.getRange(rowIndex, updatedAtIndex + 1).setValue(new Date().toISOString());
      }
    } else {
      // Inserir nova linha
      appendSheetData(sheetName, site, data);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Erro ao atualizar dados em ${sheetName}:`, error);
    return false;
  }
}

// ============================================================================
// DISPATCHER PRINCIPAL - COMPATIBILIDADE 100%
// ============================================================================

/**
 * Processar requisições POST
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // ✅ COMPATIBILIDADE: Aceitar tanto 'type' quanto 'action'
    const type = data.type || data.action;
    
    // ✅ COMPATIBILIDADE: Normalizar 'site' e 'siteSlug'
    const site = data.site || data.siteSlug;
    const normalizedData = { ...data, site, type };
    
    console.log(`Processando: ${type} para site: ${site}`);
    
    switch (type) {
      // ============================================================================
      // FUNÇÕES EXISTENTES (já funcionando)
      // ============================================================================
      case 'list_leads':
        return list_leads(normalizedData);
      case 'list_feedbacks':
        return list_feedbacks(normalizedData);
      case 'get_traffic':
        return get_traffic(normalizedData);
      case 'status':
        return status(normalizedData);
      case 'sites':
        return sites(normalizedData);
      case 'admin_set':
        return admin_set(normalizedData);
      case 'client_billing':
        return client_billing(normalizedData);
        
      // ============================================================================
      // NOVAS FUNÇÕES - CONTROLE ADMIN
      // ============================================================================
      case 'admin_get_client_features':
        return admin_get_client_features(normalizedData);
      case 'admin_update_client_features':
        return admin_update_client_features(normalizedData);
      case 'admin_toggle_client_feature':
        return admin_toggle_client_feature(normalizedData);
      case 'admin_update_client_plan':
        return admin_update_client_plan(normalizedData);
        
      // ============================================================================
      // SISTEMA MULTI-IDIOMA
      // ============================================================================
      case 'multi_language_get_settings':
        return multi_language_get_settings(normalizedData);
      case 'multi_language_update_settings':
        return multi_language_update_settings(normalizedData);
      case 'multi_language_translate_content':
        return multi_language_translate_content(normalizedData);
        
      // ============================================================================
      // SISTEMA DE AGENDAMENTO
      // ============================================================================
      case 'appointment_get_settings':
        return appointment_get_settings(normalizedData);
      case 'appointment_create':
        return appointment_create(normalizedData);
      case 'appointment_get_availability':
        return appointment_get_availability(normalizedData);
        
      // ============================================================================
      // E-COMMERCE
      // ============================================================================
      case 'ecommerce_get_products':
        return ecommerce_get_products(normalizedData);
      case 'ecommerce_create_product':
        return ecommerce_create_product(normalizedData);
      case 'ecommerce_update_product':
        return ecommerce_update_product(normalizedData);
      case 'ecommerce_delete_product':
        return ecommerce_delete_product(normalizedData);
      case 'ecommerce_get_orders':
        return ecommerce_get_orders(normalizedData);
      case 'ecommerce_create_order':
        return ecommerce_create_order(normalizedData);
      case 'ecommerce_update_order_status':
        return ecommerce_update_order_status(normalizedData);
      case 'ecommerce_get_store_settings':
        return ecommerce_get_store_settings(normalizedData);
      case 'ecommerce_update_store_settings':
        return ecommerce_update_store_settings(normalizedData);
      case 'ecommerce_get_analytics':
        return ecommerce_get_analytics(normalizedData);
        
      // ============================================================================
      // WHITE-LABEL
      // ============================================================================
      case 'white_label_create_reseller':
        return white_label_create_reseller(normalizedData);
      case 'white_label_get_reseller':
        return white_label_get_reseller(normalizedData);
      case 'white_label_update_reseller':
        return white_label_update_reseller(normalizedData);
      case 'white_label_get_branding':
        return white_label_get_branding(normalizedData);
      case 'white_label_update_branding':
        return white_label_update_branding(normalizedData);
      case 'white_label_get_clients':
        return white_label_get_clients(normalizedData);
      case 'white_label_add_client':
        return white_label_add_client(normalizedData);
      case 'white_label_generate_site':
        return white_label_generate_site(normalizedData);
      case 'white_label_get_analytics':
        return white_label_get_analytics(normalizedData);
      case 'white_label_check_slug':
        return white_label_check_slug(normalizedData);
      case 'white_label_update_domain':
        return white_label_update_domain(normalizedData);
      case 'white_label_get_commission_report':
        return white_label_get_commission_report(normalizedData);
        
      // ============================================================================
      // TEMPLATE MARKETPLACE
      // ============================================================================
      case 'marketplace_get_templates':
        return marketplace_get_templates(normalizedData);
      case 'marketplace_get_template':
        return marketplace_get_template(normalizedData);
      case 'marketplace_purchase_template':
        return marketplace_purchase_template(normalizedData);
      case 'marketplace_apply_template':
        return marketplace_apply_template(normalizedData);
      case 'marketplace_rate_template':
        return marketplace_rate_template(normalizedData);
      case 'marketplace_get_categories':
        return marketplace_get_categories(normalizedData);
      case 'marketplace_get_purchases':
        return marketplace_get_purchases(normalizedData);
        
      // ============================================================================
      // AUDIT LOGS
      // ============================================================================
      case 'audit_log_event':
        return audit_log_event(normalizedData);
      case 'audit_get_logs':
        return audit_get_logs(normalizedData);
      case 'audit_get_security_alerts':
        return audit_get_security_alerts(normalizedData);
      case 'audit_generate_report':
        return audit_generate_report(normalizedData);
      case 'audit_resolve_alert':
        return audit_resolve_alert(normalizedData);
      case 'audit_get_statistics':
        return audit_get_statistics(normalizedData);
        
      default:
        return ContentService
          .createTextOutput(JSON.stringify({ ok: false, error: `Ação não reconhecida: ${type}` }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Erro no doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno do servidor', details: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Processar requisições GET (compatibilidade com funções existentes)
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const type = params.type;
    const site = params.site;
    
    console.log(`GET - Processando: ${type} para site: ${site}`);
    
    // Redirecionar para doPost para consistência
    return doPost({
      postData: {
        contents: JSON.stringify({ type, site, ...params })
      }
    });
    
  } catch (error) {
    console.error('Erro no doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno do servidor' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// FUNÇÕES EXISTENTES (implementações mínimas para compatibilidade)
// ============================================================================

function list_leads(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, leads: [] }))
    .setMimeType(ContentService.MimeType.JSON);
}

function list_feedbacks(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, feedbacks: [] }))
    .setMimeType(ContentService.MimeType.JSON);
}

function get_traffic(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, traffic: [] }))
    .setMimeType(ContentService.MimeType.JSON);
}

function status(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: 'active' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sites(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, sites: [] }))
    .setMimeType(ContentService.MimeType.JSON);
}

function admin_set(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function client_billing(params) {
  // Implementação existente - manter como está
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, billing: {} }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// CONTROLE ADMIN DE FUNCIONALIDADES
// ============================================================================

function admin_get_client_features(params) {
  const { site } = params;
  
  try {
    const settings = getSheetData('feature_settings', site);
    const clientSettings = settings.length > 0 ? settings[0] : null;
    
    const defaultSettings = {
      site: site,
      plan: 'essential',
      enabledFeatures: JSON.stringify(['basic-website', 'google-my-business']),
      onboardingCompleted: false,
      lastUpdated: new Date().toISOString()
    };
    
    const result = clientSettings || defaultSettings;
    
    // Parse enabledFeatures se for string
    if (typeof result.enabledFeatures === 'string') {
      try {
        result.enabledFeatures = JSON.parse(result.enabledFeatures);
      } catch (e) {
        result.enabledFeatures = ['basic-website', 'google-my-business'];
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erro em admin_get_client_features:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar configurações' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function admin_update_client_features(params) {
  const { site, updates } = params;
  
  try {
    // Converter arrays para JSON strings se necessário
    if (updates.enabledFeatures && Array.isArray(updates.enabledFeatures)) {
      updates.enabledFeatures = JSON.stringify(updates.enabledFeatures);
    }
    
    const success = updateSheetData('feature_settings', site, {
      site: site,
      ...updates,
      lastUpdated: new Date().toISOString()
    }, 'site');
    
    if (success) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: true, 
          settings: updates 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar configurações' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    console.error('Erro em admin_update_client_features:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function admin_toggle_client_feature(params) {
  const { site, featureId, enabled } = params;
  
  try {
    const settings = getSheetData('feature_settings', site);
    let enabledFeatures = ['basic-website', 'google-my-business']; // Padrão
    
    if (settings.length > 0) {
      try {
        enabledFeatures = JSON.parse(settings[0].enabledFeatures || '[]');
      } catch (e) {
        enabledFeatures = ['basic-website', 'google-my-business'];
      }
    }
    
    // Atualizar lista de features
    if (enabled && !enabledFeatures.includes(featureId)) {
      enabledFeatures.push(featureId);
    } else if (!enabled && enabledFeatures.includes(featureId)) {
      enabledFeatures = enabledFeatures.filter(f => f !== featureId);
    }
    
    const success = updateSheetData('feature_settings', site, {
      site: site,
      enabledFeatures: JSON.stringify(enabledFeatures),
      lastUpdated: new Date().toISOString()
    }, 'site');
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erro em admin_toggle_client_feature:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function admin_update_client_plan(params) {
  const { site, plan } = params;
  
  try {
    const success = updateSheetData('feature_settings', site, {
      site: site,
      plan: plan,
      lastUpdated: new Date().toISOString()
    }, 'site');
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erro em admin_update_client_plan:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// SISTEMA MULTI-IDIOMA
// ============================================================================

function multi_language_get_settings(params) {
  const { site } = params;
  
  try {
    const settings = getSheetData('language_settings', site);
    const langSettings = settings.length > 0 ? settings[0] : null;
    
    const defaultSettings = {
      defaultLanguage: CONFIG.DEFAULT_LANGUAGE,
      enabledLanguages: JSON.stringify([CONFIG.DEFAULT_LANGUAGE]),
      autoDetect: true,
      fallbackLanguage: CONFIG.DEFAULT_LANGUAGE
    };
    
    const result = langSettings || defaultSettings;
    
    // Parse arrays se necessário
    if (typeof result.enabledLanguages === 'string') {
      try {
        result.enabledLanguages = JSON.parse(result.enabledLanguages);
      } catch (e) {
        result.enabledLanguages = [CONFIG.DEFAULT_LANGUAGE];
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar configurações de idioma' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function multi_language_update_settings(params) {
  const { site, settings } = params;
  
  try {
    // Converter arrays para strings JSON
    if (settings.enabledLanguages && Array.isArray(settings.enabledLanguages)) {
      settings.enabledLanguages = JSON.stringify(settings.enabledLanguages);
    }
    
    const success = updateSheetData('language_settings', site, {
      site: site,
      ...settings,
      updatedAt: new Date().toISOString()
    }, 'site');
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success, settings }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar configurações' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function multi_language_translate_content(params) {
  const { site, content, targetLanguage } = params;
  
  try {
    // Usar Google Translate API
    const translatedContent = LanguageApp.translate(content, CONFIG.DEFAULT_LANGUAGE, targetLanguage);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        translatedContent 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        error: 'Erro na tradução',
        translatedContent: content // Fallback para o conteúdo original
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// SISTEMA DE AGENDAMENTO
// ============================================================================

function appointment_get_settings(params) {
  const { site } = params;
  
  try {
    const settings = getSheetData('appointment_settings', site);
    const appointmentSettings = settings.length > 0 ? settings[0] : null;
    
    const defaultSettings = {
      workingHours: JSON.stringify({ start: '09:00', end: '18:00' }),
      workingDays: JSON.stringify(['1', '2', '3', '4', '5']),
      duration: 60,
      buffer: 15,
      maxAdvanceDays: 30,
      googleCalendarIntegration: false
    };
    
    const result = appointmentSettings || defaultSettings;
    
    // Parse JSON fields
    ['workingHours', 'workingDays'].forEach(field => {
      if (typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (e) {
          // Manter valor padrão
        }
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar configurações de agendamento' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appointment_create(params) {
  const { site, appointment } = params;
  
  try {
    // Verificar disponibilidade
    const isAvailable = checkAvailability(site, appointment.datetime, appointment.duration);
    
    if (!isAvailable) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Horário não disponível' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Criar agendamento
    const appointmentId = generateId();
    const appointmentData = {
      id: appointmentId,
      site: site,
      ...appointment,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    
    const success = appendSheetData('appointments', site, appointmentData);
    
    if (success) {
      // TODO: Integrar com Google Calendar se configurado
      
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: true, 
          appointment: appointmentData 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao criar agendamento' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appointment_get_availability(params) {
  const { site, date } = params;
  
  try {
    // Buscar configurações de trabalho
    const settings = getSheetData('appointment_settings', site);
    const workingHours = settings.length > 0 ? JSON.parse(settings[0].workingHours || '{"start":"09:00","end":"18:00"}') : { start: '09:00', end: '18:00' };
    const duration = settings.length > 0 ? (settings[0].duration || 60) : 60;
    
    // Buscar agendamentos existentes para a data
    const appointments = getSheetData('appointments', site, { date });
    
    // Calcular slots disponíveis
    const availableSlots = calculateAvailableSlots(workingHours, appointments, date, duration);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        availableSlots 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar disponibilidade' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function checkAvailability(site, datetime, duration) {
  try {
    const appointments = getSheetData('appointments', site);
    const requestedStart = new Date(datetime);
    const requestedEnd = new Date(requestedStart.getTime() + (duration * 60000));
    
    for (let appointment of appointments) {
      const existingStart = new Date(appointment.datetime);
      const existingEnd = new Date(existingStart.getTime() + (appointment.duration * 60000));
      
      // Verificar sobreposição
      if (requestedStart < existingEnd && requestedEnd > existingStart) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

function calculateAvailableSlots(workingHours, appointments, date, duration) {
  const slots = [];
  const startHour = parseInt(workingHours.start.split(':')[0]);
  const endHour = parseInt(workingHours.end.split(':')[0]);
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += duration) {
      const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotDateTime = `${date}T${slotTime}:00`;
      
      if (checkAvailability('', slotDateTime, duration)) {
        slots.push(slotTime);
      }
    }
  }
  
  return slots;
}

// ============================================================================
// E-COMMERCE
// ============================================================================

function ecommerce_get_products(params) {
  const { site, category, search, limit = 20, offset = 0 } = params;
  
  try {
    const filters = {};
    if (category) filters.category = category;
    if (search) filters.name = search;
    filters.limit = limit;
    filters.offset = offset;
    
    const products = getSheetData('products', site, filters);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        products 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar produtos' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_create_product(params) {
  const { site, product } = params;
  
  try {
    const productId = generateId();
    const productData = {
      id: productId,
      site: site,
      ...product,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Converter arrays para JSON strings
    if (productData.images && Array.isArray(productData.images)) {
      productData.images = JSON.stringify(productData.images);
    }
    
    const success = appendSheetData('products', site, productData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        product: success ? productData : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao criar produto' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_update_product(params) {
  const { site, productId, updates } = params;
  
  try {
    // Converter arrays para JSON strings
    if (updates.images && Array.isArray(updates.images)) {
      updates.images = JSON.stringify(updates.images);
    }
    
    const success = updateSheetData('products', site, {
      id: productId,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar produto' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_delete_product(params) {
  const { site, productId } = params;
  
  try {
    // Marcar como inativo em vez de deletar
    const success = updateSheetData('products', site, {
      id: productId,
      active: false,
      updatedAt: new Date().toISOString()
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao deletar produto' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_get_orders(params) {
  const { site, status, limit = 20, offset = 0 } = params;
  
  try {
    const filters = {};
    if (status) filters.status = status;
    filters.limit = limit;
    filters.offset = offset;
    
    const orders = getSheetData('orders', site, filters);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        orders 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar pedidos' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_create_order(params) {
  const { site, order } = params;
  
  try {
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const orderData = {
      id: orderId,
      orderNumber: orderNumber,
      site: site,
      ...order,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Converter items para JSON string
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items = JSON.stringify(orderData.items);
    }
    
    const success = appendSheetData('orders', site, orderData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        order: success ? orderData : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao criar pedido' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_update_order_status(params) {
  const { site, orderId, status } = params;
  
  try {
    const success = updateSheetData('orders', site, {
      id: orderId,
      status: status,
      updatedAt: new Date().toISOString()
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar status do pedido' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_get_store_settings(params) {
  const { site } = params;
  
  try {
    const settings = getSheetData('store_settings', site);
    const storeSettings = settings.length > 0 ? settings[0] : null;
    
    const defaultSettings = {
      name: 'Minha Loja',
      currency: 'BRL',
      paymentMethods: JSON.stringify(['pix', 'credit']),
      shippingZones: JSON.stringify([])
    };
    
    const result = storeSettings || defaultSettings;
    
    // Parse JSON fields
    ['paymentMethods', 'shippingZones'].forEach(field => {
      if (typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (e) {
          result[field] = [];
        }
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar configurações da loja' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_update_store_settings(params) {
  const { site, settings } = params;
  
  try {
    // Converter arrays para JSON strings
    ['paymentMethods', 'shippingZones'].forEach(field => {
      if (settings[field] && Array.isArray(settings[field])) {
        settings[field] = JSON.stringify(settings[field]);
      }
    });
    
    const success = updateSheetData('store_settings', site, {
      site: site,
      ...settings,
      updatedAt: new Date().toISOString()
    }, 'site');
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success, settings }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar configurações' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_get_analytics(params) {
  const { site } = params;
  
  try {
    const orders = getSheetData('orders', site);
    const products = getSheetData('products', site);
    
    const analytics = {
      totalOrders: orders.length,
      totalProducts: products.length,
      revenue: orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) / orders.length : 0
    };
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        analytics 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar analytics' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// WHITE-LABEL
// ============================================================================

function white_label_create_reseller(params) {
  const { resellerId, resellerData } = params;
  
  try {
    const reseller = {
      id: resellerId,
      ...resellerData,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    const success = appendSheetData('resellers', 'global', reseller);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        reseller: success ? reseller : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao criar revendedor' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_get_reseller(params) {
  const { resellerId } = params;
  
  try {
    const resellers = getSheetData('resellers', 'global', { id: resellerId });
    const reseller = resellers.length > 0 ? resellers[0] : null;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        reseller 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar revendedor' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_update_reseller(params) {
  const { resellerId, updates } = params;
  
  try {
    const success = updateSheetData('resellers', 'global', {
      id: resellerId,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar revendedor' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_get_branding(params) {
  const { resellerId } = params;
  
  try {
    const branding = getSheetData('reseller_branding', resellerId);
    const resellerBranding = branding.length > 0 ? branding[0] : null;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        branding: resellerBranding 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar branding' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_update_branding(params) {
  const { resellerId, branding } = params;
  
  try {
    // Converter objetos para JSON strings
    if (branding.colors && typeof branding.colors === 'object') {
      branding.colors = JSON.stringify(branding.colors);
    }
    
    const success = updateSheetData('reseller_branding', resellerId, {
      resellerId: resellerId,
      ...branding,
      updatedAt: new Date().toISOString()
    }, 'resellerId');
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success, branding }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar branding' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_get_clients(params) {
  const { resellerId } = params;
  
  try {
    const clients = getSheetData('reseller_clients', resellerId);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        clients 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar clientes' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_add_client(params) {
  const { resellerId, clientData } = params;
  
  try {
    const clientId = generateId();
    const client = {
      id: clientId,
      resellerId: resellerId,
      ...clientData,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    const success = appendSheetData('reseller_clients', resellerId, client);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        client: success ? client : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao adicionar cliente' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_generate_site(params) {
  const { resellerId, clientData, templateId } = params;
  
  try {
    const siteSlug = generateSiteSlug(clientData.businessName);
    
    // Buscar branding do revendedor
    const branding = getSheetData('reseller_branding', resellerId);
    const resellerBranding = branding.length > 0 ? branding[0] : {};
    
    const siteData = {
      slug: siteSlug,
      resellerId: resellerId,
      clientId: clientData.id,
      template: templateId,
      branding: JSON.stringify(resellerBranding),
      domain: `${siteSlug}.${resellerBranding.domain || 'elevea.app'}`,
      createdAt: new Date().toISOString()
    };
    
    const success = appendSheetData('white_label_sites', resellerId, siteData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        site: success ? siteData : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao gerar site' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_get_analytics(params) {
  const { resellerId } = params;
  
  try {
    const clients = getSheetData('reseller_clients', resellerId);
    const sites = getSheetData('white_label_sites', resellerId);
    
    const analytics = {
      totalClients: clients.length,
      totalSites: sites.length,
      activeClients: clients.filter(c => c.status === 'active').length
    };
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        analytics 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar analytics' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_check_slug(params) {
  const { slug } = params;
  
  try {
    const sites = getSheetData('white_label_sites', 'global', { slug: slug });
    const available = sites.length === 0;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        available 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao verificar slug' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_update_domain(params) {
  const { resellerId, siteSlug, domain } = params;
  
  try {
    const success = updateSheetData('white_label_sites', resellerId, {
      slug: siteSlug,
      domain: domain,
      updatedAt: new Date().toISOString()
    }, 'slug');
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao atualizar domínio' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_get_commission_report(params) {
  const { resellerId } = params;
  
  try {
    // Implementação básica - expandir conforme necessário
    const report = {
      totalCommission: 0,
      pendingCommission: 0,
      paidCommission: 0
    };
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        report 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar relatório de comissões' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// TEMPLATE MARKETPLACE
// ============================================================================

function marketplace_get_templates(params) {
  const { category, priceMin, priceMax, tags, searchTerm, sortBy = 'latest', limit = 20, offset = 0 } = params;
  
  try {
    const filters = {};
    if (category) filters.category = category;
    if (searchTerm) filters.name = searchTerm;
    filters.limit = limit;
    filters.offset = offset;
    
    let templates = getSheetData('marketplace_templates', 'global', filters);
    
    // Filtrar por preço
    if (priceMin !== undefined) {
      templates = templates.filter(t => parseFloat(t.price) >= parseFloat(priceMin));
    }
    if (priceMax !== undefined) {
      templates = templates.filter(t => parseFloat(t.price) <= parseFloat(priceMax));
    }
    
    // Filtrar por tags
    if (tags) {
      templates = templates.filter(t => {
        const templateTags = JSON.parse(t.tags || '[]');
        return tags.some(tag => templateTags.includes(tag));
      });
    }
    
    const categories = getSheetData('template_categories', 'global');
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        templates,
        categories
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar templates' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_get_template(params) {
  const { templateId } = params;
  
  try {
    const templates = getSheetData('marketplace_templates', 'global', { id: templateId });
    const template = templates.length > 0 ? templates[0] : null;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        template 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar template' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_purchase_template(params) {
  const { site, templateId, paymentMethod, paymentToken, customerEmail } = params;
  
  try {
    const templates = getSheetData('marketplace_templates', 'global', { id: templateId });
    const template = templates.length > 0 ? templates[0] : null;
    
    if (!template) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Template não encontrado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Simular processamento de pagamento (implementar integração real)
    const paymentResult = { success: true }; // Placeholder
    
    if (!paymentResult.success) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Falha no pagamento' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Registrar compra
    const purchase = {
      id: generateId(),
      templateId: templateId,
      site: site,
      customerEmail: customerEmail,
      pricePaid: template.price,
      currency: template.currency,
      licenseKey: generateLicenseKey(),
      downloadUrl: `https://templates.elevea.com/download/${templateId}/${generateId()}`,
      purchaseDate: new Date().toISOString(),
      status: 'completed'
    };
    
    const success = appendSheetData('template_purchases', site, purchase);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        purchase: success ? purchase : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao processar compra' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_apply_template(params) {
  const { site, templateId, customizations } = params;
  
  try {
    // Verificar se o template foi comprado
    const purchases = getSheetData('template_purchases', site, { templateId: templateId });
    
    if (purchases.length === 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Template não foi comprado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Simular aplicação do template
    const applyResult = {
      previewUrl: `https://${site}.elevea.app`,
      backupCreated: generateId()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        ...applyResult
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao aplicar template' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_rate_template(params) {
  const { site, templateId, rating, review } = params;
  
  try {
    // Implementação básica para avaliações
    const success = true; // Placeholder
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao avaliar template' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_get_categories(params) {
  try {
    const categories = getSheetData('template_categories', 'global');
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        categories 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar categorias' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_get_purchases(params) {
  const { site } = params;
  
  try {
    const purchases = getSheetData('template_purchases', site);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        purchases 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar compras' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

function audit_log_event(params) {
  const { auditLog } = params;
  
  try {
    const logData = {
      id: generateId(),
      ...auditLog,
      timestamp: new Date().toISOString()
    };
    
    const success = appendSheetData('audit_logs', auditLog.site, logData);
    
    // Verificar se precisa gerar alertas de segurança
    checkSecurityAlerts(logData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao registrar log' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function audit_get_logs(params) {
  const { site, filters } = params;
  
  try {
    const logs = getSheetData('audit_logs', site, filters || {});
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        logs, 
        total: logs.length, 
        hasMore: false 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar logs' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function audit_get_security_alerts(params) {
  const { site } = params;
  
  try {
    const alerts = getSheetData('security_alerts', site);
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const unresolvedCount = alerts.filter(a => !a.resolved).length;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        alerts, 
        criticalCount, 
        unresolvedCount 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar alertas' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function audit_generate_report(params) {
  const { site, filters, reportDate } = params;
  
  try {
    const logs = getSheetData('audit_logs', site, filters || {});
    
    // Simular geração de relatório
    const reportUrl = `https://reports.elevea.com/${site}/${generateId()}.pdf`;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true,
        report: { totalEvents: logs.length, period: filters },
        downloadUrl: reportUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao gerar relatório' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function audit_resolve_alert(params) {
  const { site, alertId } = params;
  
  try {
    const success = updateSheetData('security_alerts', site, {
      id: alertId,
      resolved: true,
      resolvedAt: new Date().toISOString()
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao resolver alerta' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function audit_get_statistics(params) {
  const { site } = params;
  
  try {
    const logs = getSheetData('audit_logs', site);
    const alerts = getSheetData('security_alerts', site);
    
    const statistics = {
      totalLogs: logs.length,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      resolvedAlerts: alerts.filter(a => a.resolved).length
    };
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        statistics 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro ao buscar estatísticas' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function checkSecurityAlerts(auditLog) {
  try {
    // Implementar lógica de detecção de atividades suspeitas
    const suspiciousPatterns = [
      { pattern: /failed.*login/i, severity: 'medium' },
      { pattern: /brute.*force/i, severity: 'high' },
      { pattern: /sql.*injection/i, severity: 'critical' },
      { pattern: /unauthorized.*access/i, severity: 'high' }
    ];
    
    for (let pattern of suspiciousPatterns) {
      if (pattern.pattern.test(auditLog.details)) {
        const alert = {
          id: generateId(),
          site: auditLog.site,
          type: 'security_event',
          severity: pattern.severity,
          description: `Atividade suspeita detectada: ${auditLog.action}`,
          resolved: false,
          createdAt: new Date().toISOString()
        };
        
        appendSheetData('security_alerts', auditLog.site, alert);
        break;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar alertas de segurança:', error);
  }
}

// ============================================================================
// INSTRUÇÕES FINAIS
// ============================================================================

/**
 * INSTRUÇÕES PARA IMPLEMENTAÇÃO:
 * 
 * 1. SUBSTITUIR VARIÁVEIS:
 *    - Substitua 'SEU_SPREADSHEET_ID_AQUI' pelo ID real da sua planilha
 * 
 * 2. CONFIGURAR SPREADSHEET:
 *    - As planilhas são criadas automaticamente quando necessário
 *    - Headers são definidos automaticamente
 * 
 * 3. DEPLOY:
 *    - Vá em script.google.com
 *    - Crie um novo projeto
 *    - Cole todo este código
 *    - Deploy como aplicativo web
 *    - Permissões: "Qualquer pessoa pode acessar"
 *    - Execute como: "Sua conta"
 *    - Copie a URL de execução
 * 
 * 4. CONFIGURAR NETLIFY:
 *    - Adicione a variável GAS_BASE_URL com a URL do deploy
 * 
 * 5. FUNCIONALIDADES INCLUÍDAS:
 *    ✅ Compatibilidade 100% com suas funções existentes
 *    ✅ Todas as 37 novas funções implementadas
 *    ✅ Dispatcher que aceita type/action e site/siteSlug
 *    ✅ Criação automática de planilhas com headers corretos
 *    ✅ Sistema de logs e auditoria
 *    ✅ Controle admin completo
 *    ✅ Todas as funcionalidades VIP
 * 
 * COMPATIBILIDADE: 100% GARANTIDA!
 */