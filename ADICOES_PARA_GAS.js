/**
 * ESTE ARQUIVO CONTÉM TODAS AS ADIÇÕES NECESSÁRIAS PARA O GAS-LIMPO-ORGANIZADO.js
 * 
 * INSTRUÇÕES DE IMPLEMENTAÇÃO:
 * 1. Adicionar CONFIGURAÇÕES após linha 3
 * 2. Adicionar NORMALIZAÇÃO após linha 269 no doPost
 * 3. Adicionar NOVOS IF STATEMENTS após linha 549 no doPost
 * 4. Adicionar FUNÇÕES UTILITÁRIAS antes das funções existentes
 * 5. Adicionar NOVAS FUNÇÕES no final do arquivo
 */

// ============================================================================
// 1. CONFIGURAÇÕES PARA ADICIONAR APÓS LINHA 3 (após "/** ============================= CONFIGURAÇÕES E CONSTANTES ============================= */")
// ============================================================================

/**
 * ============================= CONFIGURAÇÕES PARA NOVAS FUNCIONALIDADES =============================
 */

/** === Configurações para as novas funcionalidades VIP === */
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

/** === Headers para as novas planilhas === */
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

// ============================================================================
// 2. NORMALIZAÇÃO PARA ADICIONAR APÓS LINHA 269 NO doPost (após "data = {};")
// ============================================================================

/**
 * ADICIONAR ESTAS LINHAS APÓS A LINHA 269:
 * 
 *   // ✅ COMPATIBILIDADE: Normalizar 'type'/'action' e 'site'/'siteSlug'
 *   const type = data.type || data.action;
 *   const site = data.site || data.siteSlug;
 *   const normalizedData = { ...data, type, site };
 *   
 *   log_(ss, "normalized", {
 *     originalType: data.type || "",
 *     originalAction: data.action || "",
 *     normalizedType: type || "",
 *     originalSite: data.site || "",
 *     originalSiteSlug: data.siteSlug || "",
 *     normalizedSite: site || ""
 *   });
 * 
 * E DEPOIS TROCAR EM TODAS AS LINHAS: 
 * - "data.type" por "type" 
 * - "data.action" por "type"
 * - "data" por "normalizedData" nas chamadas de função
 */

// ============================================================================
// 3. NOVOS IF STATEMENTS PARA ADICIONAR APÓS LINHA 549 NO doPost (antes de "// ===== nada casou =====")
// ============================================================================

/**
 * ADICIONAR ESTES IF STATEMENTS APÓS A LINHA 549:
 * 
 *     // ============================= NOVAS FUNCIONALIDADES VIP =============================
 *     
 *     // === CONTROLE ADMIN DE FUNCIONALIDADES ===
 *     if (type === 'admin_get_client_features') {
 *       log_(ss, "route_admin_get_client_features", {});
 *       return admin_get_client_features(e, normalizedData);
 *     }
 *     if (type === 'admin_update_client_features') {
 *       log_(ss, "route_admin_update_client_features", {});
 *       return admin_update_client_features(e, normalizedData);
 *     }
 *     if (type === 'admin_toggle_client_feature') {
 *       log_(ss, "route_admin_toggle_client_feature", {});
 *       return admin_toggle_client_feature(e, normalizedData);
 *     }
 *     if (type === 'admin_update_client_plan') {
 *       log_(ss, "route_admin_update_client_plan", {});
 *       return admin_update_client_plan(e, normalizedData);
 *     }
 * 
 *     // === SISTEMA MULTI-IDIOMA ===
 *     if (type === 'multi_language_get_settings') {
 *       log_(ss, "route_multi_language_get_settings", {});
 *       return multi_language_get_settings(e, normalizedData);
 *     }
 *     if (type === 'multi_language_update_settings') {
 *       log_(ss, "route_multi_language_update_settings", {});
 *       return multi_language_update_settings(e, normalizedData);
 *     }
 *     if (type === 'multi_language_translate_content') {
 *       log_(ss, "route_multi_language_translate_content", {});
 *       return multi_language_translate_content(e, normalizedData);
 *     }
 * 
 *     // === SISTEMA DE AGENDAMENTO ===
 *     if (type === 'appointment_get_settings') {
 *       log_(ss, "route_appointment_get_settings", {});
 *       return appointment_get_settings(e, normalizedData);
 *     }
 *     if (type === 'appointment_create') {
 *       log_(ss, "route_appointment_create", {});
 *       return appointment_create(e, normalizedData);
 *     }
 *     if (type === 'appointment_get_availability') {
 *       log_(ss, "route_appointment_get_availability", {});
 *       return appointment_get_availability(e, normalizedData);
 *     }
 * 
 *     // === E-COMMERCE ===
 *     if (type === 'ecommerce_get_products') {
 *       log_(ss, "route_ecommerce_get_products", {});
 *       return ecommerce_get_products(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_create_product') {
 *       log_(ss, "route_ecommerce_create_product", {});
 *       return ecommerce_create_product(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_update_product') {
 *       log_(ss, "route_ecommerce_update_product", {});
 *       return ecommerce_update_product(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_delete_product') {
 *       log_(ss, "route_ecommerce_delete_product", {});
 *       return ecommerce_delete_product(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_get_orders') {
 *       log_(ss, "route_ecommerce_get_orders", {});
 *       return ecommerce_get_orders(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_create_order') {
 *       log_(ss, "route_ecommerce_create_order", {});
 *       return ecommerce_create_order(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_update_order_status') {
 *       log_(ss, "route_ecommerce_update_order_status", {});
 *       return ecommerce_update_order_status(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_get_store_settings') {
 *       log_(ss, "route_ecommerce_get_store_settings", {});
 *       return ecommerce_get_store_settings(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_update_store_settings') {
 *       log_(ss, "route_ecommerce_update_store_settings", {});
 *       return ecommerce_update_store_settings(e, normalizedData);
 *     }
 *     if (type === 'ecommerce_get_analytics') {
 *       log_(ss, "route_ecommerce_get_analytics", {});
 *       return ecommerce_get_analytics(e, normalizedData);
 *     }
 * 
 *     // === WHITE-LABEL ===
 *     if (type === 'white_label_create_reseller') {
 *       log_(ss, "route_white_label_create_reseller", {});
 *       return white_label_create_reseller(e, normalizedData);
 *     }
 *     if (type === 'white_label_get_reseller') {
 *       log_(ss, "route_white_label_get_reseller", {});
 *       return white_label_get_reseller(e, normalizedData);
 *     }
 *     if (type === 'white_label_update_reseller') {
 *       log_(ss, "route_white_label_update_reseller", {});
 *       return white_label_update_reseller(e, normalizedData);
 *     }
 *     if (type === 'white_label_get_branding') {
 *       log_(ss, "route_white_label_get_branding", {});
 *       return white_label_get_branding(e, normalizedData);
 *     }
 *     if (type === 'white_label_update_branding') {
 *       log_(ss, "route_white_label_update_branding", {});
 *       return white_label_update_branding(e, normalizedData);
 *     }
 *     if (type === 'white_label_get_clients') {
 *       log_(ss, "route_white_label_get_clients", {});
 *       return white_label_get_clients(e, normalizedData);
 *     }
 *     if (type === 'white_label_add_client') {
 *       log_(ss, "route_white_label_add_client", {});
 *       return white_label_add_client(e, normalizedData);
 *     }
 *     if (type === 'white_label_generate_site') {
 *       log_(ss, "route_white_label_generate_site", {});
 *       return white_label_generate_site(e, normalizedData);
 *     }
 *     if (type === 'white_label_get_analytics') {
 *       log_(ss, "route_white_label_get_analytics", {});
 *       return white_label_get_analytics(e, normalizedData);
 *     }
 *     if (type === 'white_label_check_slug') {
 *       log_(ss, "route_white_label_check_slug", {});
 *       return white_label_check_slug(e, normalizedData);
 *     }
 *     if (type === 'white_label_update_domain') {
 *       log_(ss, "route_white_label_update_domain", {});
 *       return white_label_update_domain(e, normalizedData);
 *     }
 *     if (type === 'white_label_get_commission_report') {
 *       log_(ss, "route_white_label_get_commission_report", {});
 *       return white_label_get_commission_report(e, normalizedData);
 *     }
 * 
 *     // === TEMPLATE MARKETPLACE ===
 *     if (type === 'marketplace_get_templates') {
 *       log_(ss, "route_marketplace_get_templates", {});
 *       return marketplace_get_templates(e, normalizedData);
 *     }
 *     if (type === 'marketplace_get_template') {
 *       log_(ss, "route_marketplace_get_template", {});
 *       return marketplace_get_template(e, normalizedData);
 *     }
 *     if (type === 'marketplace_purchase_template') {
 *       log_(ss, "route_marketplace_purchase_template", {});
 *       return marketplace_purchase_template(e, normalizedData);
 *     }
 *     if (type === 'marketplace_apply_template') {
 *       log_(ss, "route_marketplace_apply_template", {});
 *       return marketplace_apply_template(e, normalizedData);
 *     }
 *     if (type === 'marketplace_rate_template') {
 *       log_(ss, "route_marketplace_rate_template", {});
 *       return marketplace_rate_template(e, normalizedData);
 *     }
 *     if (type === 'marketplace_get_categories') {
 *       log_(ss, "route_marketplace_get_categories", {});
 *       return marketplace_get_categories(e, normalizedData);
 *     }
 *     if (type === 'marketplace_get_purchases') {
 *       log_(ss, "route_marketplace_get_purchases", {});
 *       return marketplace_get_purchases(e, normalizedData);
 *     }
 * 
 *     // === AUDIT LOGS ===
 *     if (type === 'audit_log_event') {
 *       log_(ss, "route_audit_log_event", {});
 *       return audit_log_event(e, normalizedData);
 *     }
 *     if (type === 'audit_get_logs') {
 *       log_(ss, "route_audit_get_logs", {});
 *       return audit_get_logs(e, normalizedData);
 *     }
 *     if (type === 'audit_get_security_alerts') {
 *       log_(ss, "route_audit_get_security_alerts", {});
 *       return audit_get_security_alerts(e, normalizedData);
 *     }
 *     if (type === 'audit_generate_report') {
 *       log_(ss, "route_audit_generate_report", {});
 *       return audit_generate_report(e, normalizedData);
 *     }
 *     if (type === 'audit_resolve_alert') {
 *       log_(ss, "route_audit_resolve_alert", {});
 *       return audit_resolve_alert(e, normalizedData);
 *     }
 *     if (type === 'audit_get_statistics') {
 *       log_(ss, "route_audit_get_statistics", {});
 *       return audit_get_statistics(e, normalizedData);
 *     }
 */

// ============================================================================
// 4. FUNÇÕES UTILITÁRIAS PARA ADICIONAR (antes das funções existentes)
// ============================================================================

/**
 * ============================= FUNÇÕES UTILITÁRIAS PARA NOVAS FUNCIONALIDADES =============================
 */

/** === Obter ou criar planilha === */
function getOrCreateSheet_(sheetName) {
  const ss = openSS_();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = NEW_SHEET_HEADERS[sheetName];
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      log_(ss, "sheet_created", { sheetName: sheetName, headers: headers.join(', ') });
    }
  }
  
  return sheet;
}

/** === Buscar dados em planilha === */
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
      return Object.values(obj).some(val => val !== '');
    });
    
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
    log_(openSS_(), "findSheetData_error", { sheetName: sheetName, error: String(error) });
    return [];
  }
}

/** === Adicionar linha em planilha === */
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
    log_(openSS_(), "sheet_row_added", { sheetName: sheetName, data: JSON.stringify(rowData) });
    
    return true;
  } catch (error) {
    log_(openSS_(), "addSheetRow_error", { sheetName: sheetName, error: String(error) });
    return false;
  }
}

/** === Atualizar linha em planilha === */
function updateSheetRow_(sheetName, filters, updates) {
  try {
    const sheet = getOrCreateSheet_(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
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
      Object.keys(updates).forEach(updateKey => {
        const colIndex = headers.indexOf(updateKey);
        if (colIndex >= 0) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(updates[updateKey]);
        }
      });
      
      const timestampFields = ['lastUpdated', 'updatedAt'];
      timestampFields.forEach(field => {
        const colIndex = headers.indexOf(field);
        if (colIndex >= 0) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(new Date().toISOString());
        }
      });
      
      log_(openSS_(), "sheet_row_updated", { 
        sheetName: sheetName, 
        filters: JSON.stringify(filters), 
        updates: JSON.stringify(updates) 
      });
      return true;
    } else {
      return addSheetRow_(sheetName, { ...filters, ...updates });
    }
    
  } catch (error) {
    log_(openSS_(), "updateSheetRow_error", { sheetName: sheetName, error: String(error) });
    return false;
  }
}

/** === Gerar ID único === */
function generateUniqueId_() {
  return Utilities.getUuid();
}

/** === Gerar número de pedido === */
function generateOrderNumber_() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

/** === Gerar chave de licença === */
function generateLicenseKey_() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i % 4 === 3 && i < 15) result += '-';
  }
  return result;
}

/** === Verificar disponibilidade de agendamento === */
function checkAppointmentAvailability_(site, datetime, duration) {
  try {
    const appointments = findSheetData_('appointments', { site: site });
    const requestedStart = new Date(datetime);
    const requestedEnd = new Date(requestedStart.getTime() + (duration * 60000));
    
    for (let appointment of appointments) {
      if (appointment.status === 'cancelled') continue;
      
      const existingStart = new Date(appointment.datetime);
      const existingEnd = new Date(existingStart.getTime() + ((appointment.duration || 60) * 60000));
      
      if (requestedStart < existingEnd && requestedEnd > existingStart) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log_(openSS_(), "checkAppointmentAvailability_error", { error: String(error) });
    return false;
  }
}

/** === Verificar alertas de segurança === */
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
        log_(openSS_(), "security_alert_created", { 
          type: pattern.type, 
          site: auditLog.site, 
          severity: pattern.severity 
        });
        break;
      }
    }
  } catch (error) {
    log_(openSS_(), "checkSecurityAlerts_error", { error: String(error) });
  }
}

// ============================================================================
// 5. NOVAS FUNÇÕES PRINCIPAIS PARA ADICIONAR NO FINAL DO ARQUIVO
// ============================================================================

/**
 * ============================= CONTROLE ADMIN DE FUNCIONALIDADES =============================
 */

function admin_get_client_features(e, data) {
  try {
    const site = data.site || data.siteSlug;
    
    if (!site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const settings = findSheetData_('feature_settings', { site: site });
    let clientSettings = settings.length > 0 ? settings[0] : null;
    
    if (!clientSettings) {
      clientSettings = {
        site: site,
        plan: NEW_FEATURES_CONFIG.DEFAULT_PLAN,
        enabledFeatures: JSON.stringify(NEW_FEATURES_CONFIG.CORE_FEATURES),
        onboardingCompleted: false,
        lastUpdated: new Date().toISOString()
      };
      
      addSheetRow_('feature_settings', clientSettings);
    }
    
    if (typeof clientSettings.enabledFeatures === 'string') {
      try {
        clientSettings.enabledFeatures = JSON.parse(clientSettings.enabledFeatures);
      } catch (e) {
        clientSettings.enabledFeatures = NEW_FEATURES_CONFIG.CORE_FEATURES;
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: clientSettings
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function admin_update_client_features(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const updates = data.updates;
    
    if (!site || !updates) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site e updates obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (updates.enabledFeatures && Array.isArray(updates.enabledFeatures)) {
      updates.enabledFeatures = JSON.stringify(updates.enabledFeatures);
    }
    
    const success = updateSheetRow_('feature_settings', { site: site }, updates);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        settings: updates 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function admin_toggle_client_feature(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const featureId = data.featureId;
    const enabled = data.enabled;
    
    if (!site || !featureId || typeof enabled !== 'boolean') {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Parâmetros inválidos' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const settings = findSheetData_('feature_settings', { site: site });
    let enabledFeatures = NEW_FEATURES_CONFIG.CORE_FEATURES.slice();
    
    if (settings.length > 0) {
      try {
        enabledFeatures = JSON.parse(settings[0].enabledFeatures || '[]');
      } catch (e) {
        enabledFeatures = NEW_FEATURES_CONFIG.CORE_FEATURES.slice();
      }
    }
    
    if (enabled && !enabledFeatures.includes(featureId)) {
      enabledFeatures.push(featureId);
    } else if (!enabled && enabledFeatures.includes(featureId)) {
      enabledFeatures = enabledFeatures.filter(f => f !== featureId);
    }
    
    const success = updateSheetRow_('feature_settings', { site: site }, {
      enabledFeatures: JSON.stringify(enabledFeatures)
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function admin_update_client_plan(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const plan = data.plan;
    
    if (!site || !plan || !['essential', 'vip'].includes(plan)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site e plano válido obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const success = updateSheetRow_('feature_settings', { site: site }, { plan: plan });
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ============================= SISTEMA MULTI-IDIOMA =============================
 */

function multi_language_get_settings(e, data) {
  try {
    const site = data.site || data.siteSlug;
    
    if (!site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const settings = findSheetData_('language_settings', { site: site });
    let langSettings = settings.length > 0 ? settings[0] : null;
    
    if (!langSettings) {
      langSettings = {
        defaultLanguage: NEW_FEATURES_CONFIG.DEFAULT_LANGUAGE,
        enabledLanguages: JSON.stringify([NEW_FEATURES_CONFIG.DEFAULT_LANGUAGE]),
        autoDetect: true,
        fallbackLanguage: NEW_FEATURES_CONFIG.DEFAULT_LANGUAGE
      };
    }
    
    if (typeof langSettings.enabledLanguages === 'string') {
      try {
        langSettings.enabledLanguages = JSON.parse(langSettings.enabledLanguages);
      } catch (e) {
        langSettings.enabledLanguages = [NEW_FEATURES_CONFIG.DEFAULT_LANGUAGE];
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: langSettings
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function multi_language_update_settings(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const settings = data.settings;
    
    if (!site || !settings) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site e configurações obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (settings.enabledLanguages && Array.isArray(settings.enabledLanguages)) {
      settings.enabledLanguages = JSON.stringify(settings.enabledLanguages);
    }
    
    const success = updateSheetRow_('language_settings', { site: site }, settings);
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success, settings }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function multi_language_translate_content(e, data) {
  try {
    const content = data.content;
    const targetLanguage = data.targetLanguage;
    
    if (!content || !targetLanguage) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Conteúdo e idioma obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let translatedContent;
    try {
      translatedContent = LanguageApp.translate(content, 'pt', targetLanguage);
    } catch (error) {
      translatedContent = content;
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        translatedContent 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro na tradução' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ============================= SISTEMA DE AGENDAMENTO =============================
 */

function appointment_get_settings(e, data) {
  try {
    const site = data.site || data.siteSlug;
    
    if (!site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const settings = findSheetData_('appointment_settings', { site: site });
    let appointmentSettings = settings.length > 0 ? settings[0] : null;
    
    if (!appointmentSettings) {
      appointmentSettings = {
        workingHours: JSON.stringify(NEW_FEATURES_CONFIG.WORKING_HOURS_DEFAULT),
        workingDays: JSON.stringify(NEW_FEATURES_CONFIG.WORKING_DAYS_DEFAULT),
        duration: NEW_FEATURES_CONFIG.APPOINTMENT_DURATION_DEFAULT,
        buffer: 15,
        maxAdvanceDays: 30,
        googleCalendarIntegration: false
      };
    }
    
    ['workingHours', 'workingDays'].forEach(field => {
      if (typeof appointmentSettings[field] === 'string') {
        try {
          appointmentSettings[field] = JSON.parse(appointmentSettings[field]);
        } catch (e) {
          // Manter valor padrão se erro no parse
        }
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: appointmentSettings
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appointment_create(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const appointment = data.appointment;
    
    if (!site || !appointment) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site e dados do agendamento obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const existingAppointments = findSheetData_('appointments', { 
      site: site, 
      datetime: appointment.datetime 
    });
    
    if (existingAppointments.length > 0) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Horário não disponível' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const appointmentData = {
      id: generateUniqueId_(),
      site: site,
      ...appointment,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    
    const success = addSheetRow_('appointments', appointmentData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        appointment: success ? appointmentData : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appointment_get_availability(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const date = data.date;
    
    if (!site || !date) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site e data obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const settings = findSheetData_('appointment_settings', { site: site });
    const workingHours = settings.length > 0 ? 
      JSON.parse(settings[0].workingHours || '{"start":"09:00","end":"18:00"}') : 
      NEW_FEATURES_CONFIG.WORKING_HOURS_DEFAULT;
    
    const appointments = findSheetData_('appointments', { site: site });
    const dayAppointments = appointments.filter(apt => apt.datetime && apt.datetime.startsWith(date));
    
    const availableSlots = [];
    const startHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      const slotDateTime = `${date}T${timeSlot}:00`;
      
      const isOccupied = dayAppointments.some(apt => 
        apt.datetime && apt.datetime.includes(timeSlot)
      );
      
      if (!isOccupied) {
        availableSlots.push(timeSlot);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        availableSlots 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ============================= E-COMMERCE =============================
 */

function ecommerce_get_products(e, data) {
  try {
    const site = data.site || data.siteSlug;
    
    if (!site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const filters = { site: site };
    if (data.category) filters.category = data.category;
    
    const products = findSheetData_('products', filters);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        products 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_create_product(e, data) {
  try {
    const site = data.site || data.siteSlug;
    const product = data.product;
    
    if (!site || !product) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site e produto obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const productData = {
      id: generateUniqueId_(),
      site: site,
      ...product,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (productData.images && Array.isArray(productData.images)) {
      productData.images = JSON.stringify(productData.images);
    }
    
    const success = addSheetRow_('products', productData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        product: success ? productData : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ecommerce_get_store_settings(e, data) {
  try {
    const site = data.site || data.siteSlug;
    
    if (!site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const settings = findSheetData_('store_settings', { site: site });
    let storeSettings = settings.length > 0 ? settings[0] : null;
    
    if (!storeSettings) {
      storeSettings = {
        name: 'Minha Loja',
        currency: NEW_FEATURES_CONFIG.STORE_CURRENCY_DEFAULT,
        paymentMethods: JSON.stringify(['pix', 'credit']),
        shippingZones: JSON.stringify([])
      };
    }
    
    ['paymentMethods', 'shippingZones'].forEach(field => {
      if (typeof storeSettings[field] === 'string') {
        try {
          storeSettings[field] = JSON.parse(storeSettings[field]);
        } catch (e) {
          storeSettings[field] = [];
        }
      }
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        settings: storeSettings
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Placeholder functions para E-commerce (implementar conforme necessário)
function ecommerce_update_product(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function ecommerce_delete_product(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function ecommerce_get_orders(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function ecommerce_create_order(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function ecommerce_update_order_status(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function ecommerce_update_store_settings(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function ecommerce_get_analytics(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================= WHITE-LABEL =============================
 */

function white_label_create_reseller(e, data) {
  try {
    const resellerId = data.resellerId;
    const resellerData = data.resellerData;
    
    if (!resellerId || !resellerData) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'ID e dados do revendedor obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const reseller = {
      id: resellerId,
      ...resellerData,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    const success = addSheetRow_('resellers', reseller);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: success, 
        reseller: success ? reseller : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function white_label_get_reseller(e, data) {
  try {
    const resellerId = data.resellerId;
    
    if (!resellerId) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'ID do revendedor obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const resellers = findSheetData_('resellers', { id: resellerId });
    const reseller = resellers.length > 0 ? resellers[0] : null;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        reseller 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Placeholder functions para White-label (implementar conforme necessário)
function white_label_update_reseller(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_get_branding(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_update_branding(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_get_clients(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_add_client(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_generate_site(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_get_analytics(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_check_slug(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_update_domain(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function white_label_get_commission_report(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================= TEMPLATE MARKETPLACE =============================
 */

function marketplace_get_templates(e, data) {
  try {
    const filters = {};
    if (data.category) filters.category = data.category;
    
    const templates = findSheetData_('marketplace_templates', filters);
    const categories = findSheetData_('template_categories', {});
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        templates,
        categories
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function marketplace_get_template(e, data) {
  try {
    const templateId = data.templateId;
    
    if (!templateId) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'ID do template obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const templates = findSheetData_('marketplace_templates', { id: templateId });
    const template = templates.length > 0 ? templates[0] : null;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        template 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Placeholder functions para Marketplace (implementar conforme necessário)
function marketplace_purchase_template(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function marketplace_apply_template(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function marketplace_rate_template(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function marketplace_get_categories(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function marketplace_get_purchases(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================= AUDIT LOGS =============================
 */

function audit_log_event(e, data) {
  try {
    const auditLog = data.auditLog;
    
    if (!auditLog || !auditLog.site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Dados de auditoria obrigatórios' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const logData = {
      id: generateUniqueId_(),
      ...auditLog,
      timestamp: new Date().toISOString()
    };
    
    const success = addSheetRow_('audit_logs', logData);
    
    // Verificar se deve gerar alertas de segurança
    if (success) {
      checkSecurityAlerts_(logData);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: success }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function audit_get_logs(e, data) {
  try {
    const site = data.site || data.siteSlug;
    
    if (!site) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Site obrigatório' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const logs = findSheetData_('audit_logs', { site: site });
    
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
      .createTextOutput(JSON.stringify({ ok: false, error: 'Erro interno' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Placeholder functions para Audit (implementar conforme necessário)
function audit_get_security_alerts(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function audit_generate_report(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function audit_resolve_alert(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}
function audit_get_statistics(e, data) { 
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Função não implementada' })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================= FIM DAS NOVAS FUNCIONALIDADES =============================
 */