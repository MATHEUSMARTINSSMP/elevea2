/**
 * TODAS AS MODIFICAÇÕES NECESSÁRIAS NO GOOGLE APPS SCRIPT EXISTENTE
 * 
 * INSTRUÇÕES:
 * Este arquivo mostra TODAS as modificações que devem ser distribuídas 
 * pelo seu código GAS existente de 4000 linhas, não apenas no final.
 * 
 * COMPATIBILIDADE: 100% com código existente
 */

// ============================================================================
// 1. MODIFICAR A FUNÇÃO doPost() EXISTENTE (início da função)
// ============================================================================

/*
LOCALIZAR sua função doPost() existente e MODIFICAR o início para:

function doPost(e) {
  try {
    const postData = e.postData ? e.postData.contents : null;
    if (!postData) {
      return jsonOut_({ ok: false, error: "No data received" });
    }

    // ✅ ADICIONAR ESTA NORMALIZAÇÃO NO INÍCIO:
    const data = JSON.parse(postData);
    
    // ✅ COMPATIBILIDADE: Aceitar tanto 'type' quanto 'action'
    const type = data.type || data.action;
    
    // ✅ COMPATIBILIDADE: Normalizar 'site' e 'siteSlug'  
    const site = data.site || data.siteSlug;
    
    // ✅ NORMALIZAR dados para passar para as funções
    const normalizedData = { ...data, type, site };
    
    log_(`doPost: type=${type}, site=${site}`);

    // ✅ CONTINUAR com seu switch(type) existente...
    switch (type) {
      // ... seus cases existentes ...
*/

// ============================================================================
// 2. ADICIONAR NOVOS CASES NO SWITCH EXISTENTE
// ============================================================================

/*
LOCALIZAR o switch(type) dentro do seu doPost() e ADICIONAR estes cases:

      // ============================================================================
      // ✅ NOVOS CASES - CONTROLE ADMIN
      // ============================================================================
      case 'admin_get_client_features':
        return admin_get_client_features(e, normalizedData);
      case 'admin_update_client_features':
        return admin_update_client_features(e, normalizedData);
      case 'admin_toggle_client_feature':
        return admin_toggle_client_feature(e, normalizedData);
      case 'admin_update_client_plan':
        return admin_update_client_plan(e, normalizedData);

      // ============================================================================
      // ✅ NOVOS CASES - SISTEMA MULTI-IDIOMA
      // ============================================================================
      case 'multi_language_get_settings':
        return multi_language_get_settings(e, normalizedData);
      case 'multi_language_update_settings':
        return multi_language_update_settings(e, normalizedData);
      case 'multi_language_translate_content':
        return multi_language_translate_content(e, normalizedData);

      // ============================================================================
      // ✅ NOVOS CASES - SISTEMA DE AGENDAMENTO
      // ============================================================================
      case 'appointment_get_settings':
        return appointment_get_settings(e, normalizedData);
      case 'appointment_create':
        return appointment_create(e, normalizedData);
      case 'appointment_get_availability':
        return appointment_get_availability(e, normalizedData);

      // ============================================================================
      // ✅ NOVOS CASES - E-COMMERCE
      // ============================================================================
      case 'ecommerce_get_products':
        return ecommerce_get_products(e, normalizedData);
      case 'ecommerce_create_product':
        return ecommerce_create_product(e, normalizedData);
      case 'ecommerce_update_product':
        return ecommerce_update_product(e, normalizedData);
      case 'ecommerce_delete_product':
        return ecommerce_delete_product(e, normalizedData);
      case 'ecommerce_get_orders':
        return ecommerce_get_orders(e, normalizedData);
      case 'ecommerce_create_order':
        return ecommerce_create_order(e, normalizedData);
      case 'ecommerce_update_order_status':
        return ecommerce_update_order_status(e, normalizedData);
      case 'ecommerce_get_store_settings':
        return ecommerce_get_store_settings(e, normalizedData);
      case 'ecommerce_update_store_settings':
        return ecommerce_update_store_settings(e, normalizedData);
      case 'ecommerce_get_analytics':
        return ecommerce_get_analytics(e, normalizedData);

      // ============================================================================
      // ✅ NOVOS CASES - WHITE-LABEL
      // ============================================================================
      case 'white_label_create_reseller':
        return white_label_create_reseller(e, normalizedData);
      case 'white_label_get_reseller':
        return white_label_get_reseller(e, normalizedData);
      case 'white_label_update_reseller':
        return white_label_update_reseller(e, normalizedData);
      case 'white_label_get_branding':
        return white_label_get_branding(e, normalizedData);
      case 'white_label_update_branding':
        return white_label_update_branding(e, normalizedData);
      case 'white_label_get_clients':
        return white_label_get_clients(e, normalizedData);
      case 'white_label_add_client':
        return white_label_add_client(e, normalizedData);
      case 'white_label_generate_site':
        return white_label_generate_site(e, normalizedData);
      case 'white_label_get_analytics':
        return white_label_get_analytics(e, normalizedData);
      case 'white_label_check_slug':
        return white_label_check_slug(e, normalizedData);
      case 'white_label_update_domain':
        return white_label_update_domain(e, normalizedData);
      case 'white_label_get_commission_report':
        return white_label_get_commission_report(e, normalizedData);

      // ============================================================================
      // ✅ NOVOS CASES - TEMPLATE MARKETPLACE
      // ============================================================================
      case 'marketplace_get_templates':
        return marketplace_get_templates(e, normalizedData);
      case 'marketplace_get_template':
        return marketplace_get_template(e, normalizedData);
      case 'marketplace_purchase_template':
        return marketplace_purchase_template(e, normalizedData);
      case 'marketplace_apply_template':
        return marketplace_apply_template(e, normalizedData);
      case 'marketplace_rate_template':
        return marketplace_rate_template(e, normalizedData);
      case 'marketplace_get_categories':
        return marketplace_get_categories(e, normalizedData);
      case 'marketplace_get_purchases':
        return marketplace_get_purchases(e, normalizedData);

      // ============================================================================
      // ✅ NOVOS CASES - AUDIT LOGS
      // ============================================================================
      case 'audit_log_event':
        return audit_log_event(e, normalizedData);
      case 'audit_get_logs':
        return audit_get_logs(e, normalizedData);
      case 'audit_get_security_alerts':
        return audit_get_security_alerts(e, normalizedData);
      case 'audit_generate_report':
        return audit_generate_report(e, normalizedData);
      case 'audit_resolve_alert':
        return audit_resolve_alert(e, normalizedData);
      case 'audit_get_statistics':
        return audit_get_statistics(e, normalizedData);

      // ... continuar com seus cases existentes ...
*/

// ============================================================================
// 3. ADICIONAR CONFIGURAÇÕES NO TOPO DO ARQUIVO (após outras configurações)
// ============================================================================

/*
LOCALIZAR onde você tem outras configurações/constantes e ADICIONAR:

// ✅ CONFIGURAÇÕES PARA NOVAS FUNCIONALIDADES
const NEW_FEATURES_CONFIG = {
  DEFAULT_LANGUAGE: 'pt',
  SUPPORTED_LANGUAGES: ['pt', 'en', 'es', 'fr', 'it', 'de'],
  DEFAULT_PLAN: 'essential',
  CORE_FEATURES: ['basic-website', 'google-my-business'],
  VIP_FEATURES: [
    'ai-copywriter', 'auto-seo', 'lead-scoring', 'whatsapp-chatbot',
    'appointment-scheduling', 'multi-language', 'ecommerce', 
    'premium-templates', 'white-label', 'audit-logs'
  ],
  WORKING_HOURS_DEFAULT: { start: '09:00', end: '18:00' },
  WORKING_DAYS_DEFAULT: ['1', '2', '3', '4', '5'],
  APPOINTMENT_DURATION_DEFAULT: 60,
  STORE_CURRENCY_DEFAULT: 'BRL'
};

// ✅ MAPEAMENTO DE HEADERS PARA NOVAS PLANILHAS
const NEW_SHEET_HEADERS = {
  'feature_settings': ['site', 'plan', 'enabledFeatures', 'onboardingCompleted', 'lastUpdated'],
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
  'security_alerts': ['id', 'site', 'type', 'severity', 'description', 'resolved', 'createdAt']
};
*/

// ============================================================================
// 4. ADICIONAR/VERIFICAR FUNÇÕES UTILITÁRIAS (seção de utilities)
// ============================================================================

/*
LOCALIZAR onde você tem outras funções utilitárias e ADICIONAR estas (se não existirem):

// ✅ FUNÇÃO PARA OBTER/CRIAR PLANILHA (se não existir similar)
function getOrCreateSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Adicionar headers se definidos
    const headers = NEW_SHEET_HEADERS[sheetName];
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      log_(`Created sheet: ${sheetName} with headers: ${headers.join(', ')}`);
    }
  }
  
  return sheet;
}

// ✅ FUNÇÃO PARA BUSCAR DADOS DA PLANILHA (se não existir similar)
function findSheetData_(sheetName, filters = {}) {
  try {
    const sheet = getOrCreateSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    let results = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    }).filter(obj => {
      // Filtrar linhas vazias
      return Object.values(obj).some(val => val !== '');
    });
    
    // Aplicar filtros
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        results = results.filter(item => {
          const itemValue = item[key];
          const filterValue = filters[key];
          
          if (typeof filterValue === 'string') {
            return itemValue && itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
          }
          return itemValue === filterValue;
        });
      }
    });
    
    return results;
    
  } catch (error) {
    log_(`Erro ao buscar dados de ${sheetName}: ${error}`);
    return [];
  }
}

// ✅ FUNÇÃO PARA ADICIONAR LINHA (se não existir similar)
function addSheetRow_(sheetName, rowData) {
  try {
    const sheet = getOrCreateSheet_(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const row = headers.map(header => {
      if (header === 'createdAt' && !rowData[header]) {
        return new Date().toISOString();
      }
      if (header === 'updatedAt' && !rowData[header]) {
        return new Date().toISOString();
      }
      if (header === 'lastUpdated' && !rowData[header]) {
        return new Date().toISOString();
      }
      return rowData[header] || '';
    });
    
    sheet.appendRow(row);
    log_(`Added row to ${sheetName}: ${JSON.stringify(rowData)}`);
    
    return true;
  } catch (error) {
    log_(`Erro ao adicionar linha em ${sheetName}: ${error}`);
    return false;
  }
}

// ✅ FUNÇÃO PARA ATUALIZAR LINHA (se não existir similar)
function updateSheetRow_(sheetName, filters, updates) {
  try {
    const sheet = getOrCreateSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Encontrar linha para atualizar
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let matches = true;
      
      Object.keys(filters).forEach(filterKey => {
        const colIndex = headers.indexOf(filterKey);
        if (colIndex >= 0 && row[colIndex] !== filters[filterKey]) {
          matches = false;
        }
      });
      
      if (matches) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > 0) {
      // Atualizar campos
      Object.keys(updates).forEach(updateKey => {
        const colIndex = headers.indexOf(updateKey);
        if (colIndex >= 0) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(updates[updateKey]);
        }
      });
      
      // Atualizar timestamp
      const timestampFields = ['lastUpdated', 'updatedAt'];
      timestampFields.forEach(field => {
        const colIndex = headers.indexOf(field);
        if (colIndex >= 0) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(new Date().toISOString());
        }
      });
      
      log_(`Updated row in ${sheetName}: ${JSON.stringify(filters)} -> ${JSON.stringify(updates)}`);
      return true;
    } else {
      // Criar nova linha se não encontrou
      return addSheetRow_(sheetName, { ...filters, ...updates });
    }
    
  } catch (error) {
    log_(`Erro ao atualizar ${sheetName}: ${error}`);
    return false;
  }
}

// ✅ FUNÇÃO PARA GERAR IDs ÚNICOS (se não existir similar)
function generateUniqueId_() {
  return Utilities.getUuid();
}

// ✅ FUNÇÃO PARA GERAR NÚMERO DE PEDIDO (se não existir similar)
function generateOrderNumber_() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

// ✅ FUNÇÃO PARA GERAR CHAVE DE LICENÇA (se não existir similar)
function generateLicenseKey_() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i % 4 === 3 && i < 15) result += '-';
  }
  return result;
}

// ✅ FUNÇÃO PARA VERIFICAR DISPONIBILIDADE DE AGENDAMENTO
function checkAppointmentAvailability_(site, datetime, duration) {
  try {
    const appointments = findSheetData_('appointments', { site: site });
    const requestedStart = new Date(datetime);
    const requestedEnd = new Date(requestedStart.getTime() + (duration * 60000));
    
    for (let appointment of appointments) {
      if (appointment.status === 'cancelled') continue;
      
      const existingStart = new Date(appointment.datetime);
      const existingEnd = new Date(existingStart.getTime() + ((appointment.duration || 60) * 60000));
      
      // Verificar sobreposição
      if (requestedStart < existingEnd && requestedEnd > existingStart) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log_(`Erro ao verificar disponibilidade: ${error}`);
    return false;
  }
}

// ✅ FUNÇÃO PARA ALERTAS DE SEGURANÇA
function checkSecurityAlerts_(auditLog) {
  try {
    const suspiciousPatterns = [
      { pattern: /failed.*login/i, severity: 'medium', type: 'failed_login' },
      { pattern: /brute.*force/i, severity: 'high', type: 'brute_force' },
      { pattern: /sql.*injection/i, severity: 'critical', type: 'sql_injection' },
      { pattern: /unauthorized.*access/i, severity: 'high', type: 'unauthorized_access' },
      { pattern: /multiple.*failed.*attempts/i, severity: 'high', type: 'multiple_failures' }
    ];
    
    for (let pattern of suspiciousPatterns) {
      if (pattern.pattern.test(auditLog.details || auditLog.action)) {
        const alert = {
          id: generateUniqueId_(),
          site: auditLog.site,
          type: pattern.type,
          severity: pattern.severity,
          description: `Atividade suspeita detectada: ${auditLog.action}`,
          resolved: false,
          createdAt: new Date().toISOString()
        };
        
        addSheetRow_('security_alerts', alert);
        log_(`Security alert created: ${pattern.type} for site ${auditLog.site}`);
        break;
      }
    }
  } catch (error) {
    log_(`Erro ao verificar alertas de segurança: ${error}`);
  }
}
*/

// ============================================================================
// 5. MODIFICAR A FUNÇÃO doGet() EXISTENTE (se existir)
// ============================================================================

/*
Se você tem uma função doGet(), MODIFICAR para compatibilidade:

function doGet(e) {
  try {
    const params = e.parameter || {};
    
    // ✅ COMPATIBILIDADE: Normalizar parâmetros
    const type = params.type || params.action;
    const site = params.site || params.siteSlug;
    
    log_(`doGet: type=${type}, site=${site}`);
    
    // ✅ REDIRECIONAR para doPost para consistência
    const normalizedData = { ...params, type, site };
    
    return doPost({
      postData: {
        contents: JSON.stringify(normalizedData)
      }
    });
    
  } catch (error) {
    log_(`Erro no doGet: ${error}`);
    return jsonOut_({ ok: false, error: 'Erro interno do servidor' });
  }
}
*/

// ============================================================================
// 6. ADICIONAR NO FINAL - TODAS AS NOVAS FUNÇÕES
// ============================================================================

/*
NO FINAL do arquivo, ADICIONAR todas as funções do arquivo NOVAS_FUNCOES_GAS.js
Mas com pequenas modificações para usar as funções utilitárias com _ :

Por exemplo, trocar:
- findSheetData() -> findSheetData_()
- addSheetRow() -> addSheetRow_()
- updateSheetRow() -> updateSheetRow_()
- generateUniqueId() -> generateUniqueId_()
- etc.

E usar as configurações NEW_FEATURES_CONFIG onde apropriado.
*/

// ============================================================================
// RESUMO DAS MODIFICAÇÕES NECESSÁRIAS:
// ============================================================================

/**
 * 1. INÍCIO DO doPost(): Adicionar normalização type/action e site/siteSlug
 * 2. SWITCH DO doPost(): Adicionar todos os novos cases
 * 3. TOPO DO ARQUIVO: Adicionar configurações NEW_FEATURES_CONFIG
 * 4. SEÇÃO UTILITIES: Adicionar funções utilitárias com _
 * 5. doGet() (se existir): Modificar para compatibilidade
 * 6. FINAL DO ARQUIVO: Adicionar todas as novas funções
 * 
 * TOTAL: 6 modificações distribuídas pelo arquivo
 * 
 * DEPOIS DE IMPLEMENTAR:
 * - Testar algumas funções básicas primeiro
 * - Verificar se as planilhas são criadas corretamente
 * - Testar compatibilidade com funções existentes
 * - Fazer deploy quando tudo estiver funcionando
 */