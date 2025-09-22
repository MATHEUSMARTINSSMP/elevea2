/**
 * INSTRUÇÕES ESPECÍFICAS: ONDE FAZER CADA MODIFICAÇÃO NO SEU CÓDIGO GAS
 * 
 * COMO USAR ESTE GUIA:
 * 1. Abra seu código GAS de 4000 linhas
 * 2. Use Ctrl+F para buscar cada item abaixo
 * 3. Faça as modificações exatamente onde indicado
 */

// ============================================================================
// MODIFICAÇÃO 1: LOCALIZAR E MODIFICAR function doPost()
// ============================================================================

/**
 * BUSCAR NO SEU CÓDIGO GAS:
 * Ctrl+F: "function doPost"
 * 
 * ENCONTRARÁ algo como:
 * function doPost(e) {
 *   try {
 *     const postData = e.postData.contents;
 *     const data = JSON.parse(postData);
 *     
 * MODIFICAR PARA:
 * function doPost(e) {
 *   try {
 *     const postData = e.postData ? e.postData.contents : null;
 *     if (!postData) {
 *       return jsonOut_({ ok: false, error: "No data received" });
 *     }
 *     
 *     const data = JSON.parse(postData);
 *     
 *     // ✅ ADICIONAR ESTAS 4 LINHAS AQUI:
 *     const type = data.type || data.action;
 *     const site = data.site || data.siteSlug;
 *     const normalizedData = { ...data, type, site };
 *     log_(`doPost: type=${type}, site=${site}`);
 *     
 *     // ✅ TROCAR "data" por "normalizedData" no switch:
 *     switch (type) { // era switch(data.type)
 *       // seus cases existentes...
 */

// ============================================================================
// MODIFICAÇÃO 2: LOCALIZAR E MODIFICAR switch(type) OU switch(data.type)
// ============================================================================

/**
 * BUSCAR NO SEU CÓDIGO GAS:
 * Ctrl+F: "switch("
 * OU
 * Ctrl+F: "case 'list_leads':"
 * 
 * ENCONTRARÁ algo como:
 * switch(data.type) {
 *   case 'list_leads':
 *     return list_leads(data);
 *   case 'list_feedbacks':
 *     return list_feedbacks(data);
 *   case 'get_traffic':
 *     return get_traffic(data);
 *   case 'status':
 *     return status(data);
 *   case 'sites':
 *     return sites(data);
 *   case 'admin_set':
 *     return admin_set(data);
 *   case 'client_billing':
 *     return client_billing(data);
 * 
 * MODIFICAR PARA:
 * switch(type) { // trocar data.type por type
 *   // ✅ MANTER TODOS OS CASES EXISTENTES (trocar data por normalizedData):
 *   case 'list_leads':
 *     return list_leads(normalizedData);
 *   case 'list_feedbacks':
 *     return list_feedbacks(normalizedData);
 *   case 'get_traffic':
 *     return get_traffic(normalizedData);
 *   case 'status':
 *     return status(normalizedData);
 *   case 'sites':
 *     return sites(normalizedData);
 *   case 'admin_set':
 *     return admin_set(normalizedData);
 *   case 'client_billing':
 *     return client_billing(normalizedData);
 * 
 *   // ✅ ADICIONAR AQUI OS 37 NOVOS CASES:
 *   
 *   // CONTROLE ADMIN
 *   case 'admin_get_client_features':
 *     return admin_get_client_features(e, normalizedData);
 *   case 'admin_update_client_features':
 *     return admin_update_client_features(e, normalizedData);
 *   case 'admin_toggle_client_feature':
 *     return admin_toggle_client_feature(e, normalizedData);
 *   case 'admin_update_client_plan':
 *     return admin_update_client_plan(e, normalizedData);
 * 
 *   // MULTI-IDIOMA
 *   case 'multi_language_get_settings':
 *     return multi_language_get_settings(e, normalizedData);
 *   case 'multi_language_update_settings':
 *     return multi_language_update_settings(e, normalizedData);
 *   case 'multi_language_translate_content':
 *     return multi_language_translate_content(e, normalizedData);
 * 
 *   // AGENDAMENTO
 *   case 'appointment_get_settings':
 *     return appointment_get_settings(e, normalizedData);
 *   case 'appointment_create':
 *     return appointment_create(e, normalizedData);
 *   case 'appointment_get_availability':
 *     return appointment_get_availability(e, normalizedData);
 * 
 *   // E-COMMERCE
 *   case 'ecommerce_get_products':
 *     return ecommerce_get_products(e, normalizedData);
 *   case 'ecommerce_create_product':
 *     return ecommerce_create_product(e, normalizedData);
 *   case 'ecommerce_update_product':
 *     return ecommerce_update_product(e, normalizedData);
 *   case 'ecommerce_delete_product':
 *     return ecommerce_delete_product(e, normalizedData);
 *   case 'ecommerce_get_orders':
 *     return ecommerce_get_orders(e, normalizedData);
 *   case 'ecommerce_create_order':
 *     return ecommerce_create_order(e, normalizedData);
 *   case 'ecommerce_update_order_status':
 *     return ecommerce_update_order_status(e, normalizedData);
 *   case 'ecommerce_get_store_settings':
 *     return ecommerce_get_store_settings(e, normalizedData);
 *   case 'ecommerce_update_store_settings':
 *     return ecommerce_update_store_settings(e, normalizedData);
 *   case 'ecommerce_get_analytics':
 *     return ecommerce_get_analytics(e, normalizedData);
 * 
 *   // WHITE-LABEL
 *   case 'white_label_create_reseller':
 *     return white_label_create_reseller(e, normalizedData);
 *   case 'white_label_get_reseller':
 *     return white_label_get_reseller(e, normalizedData);
 *   case 'white_label_update_reseller':
 *     return white_label_update_reseller(e, normalizedData);
 *   case 'white_label_get_branding':
 *     return white_label_get_branding(e, normalizedData);
 *   case 'white_label_update_branding':
 *     return white_label_update_branding(e, normalizedData);
 *   case 'white_label_get_clients':
 *     return white_label_get_clients(e, normalizedData);
 *   case 'white_label_add_client':
 *     return white_label_add_client(e, normalizedData);
 *   case 'white_label_generate_site':
 *     return white_label_generate_site(e, normalizedData);
 *   case 'white_label_get_analytics':
 *     return white_label_get_analytics(e, normalizedData);
 *   case 'white_label_check_slug':
 *     return white_label_check_slug(e, normalizedData);
 *   case 'white_label_update_domain':
 *     return white_label_update_domain(e, normalizedData);
 *   case 'white_label_get_commission_report':
 *     return white_label_get_commission_report(e, normalizedData);
 * 
 *   // TEMPLATE MARKETPLACE
 *   case 'marketplace_get_templates':
 *     return marketplace_get_templates(e, normalizedData);
 *   case 'marketplace_get_template':
 *     return marketplace_get_template(e, normalizedData);
 *   case 'marketplace_purchase_template':
 *     return marketplace_purchase_template(e, normalizedData);
 *   case 'marketplace_apply_template':
 *     return marketplace_apply_template(e, normalizedData);
 *   case 'marketplace_rate_template':
 *     return marketplace_rate_template(e, normalizedData);
 *   case 'marketplace_get_categories':
 *     return marketplace_get_categories(e, normalizedData);
 *   case 'marketplace_get_purchases':
 *     return marketplace_get_purchases(e, normalizedData);
 * 
 *   // AUDIT LOGS
 *   case 'audit_log_event':
 *     return audit_log_event(e, normalizedData);
 *   case 'audit_get_logs':
 *     return audit_get_logs(e, normalizedData);
 *   case 'audit_get_security_alerts':
 *     return audit_get_security_alerts(e, normalizedData);
 *   case 'audit_generate_report':
 *     return audit_generate_report(e, normalizedData);
 *   case 'audit_resolve_alert':
 *     return audit_resolve_alert(e, normalizedData);
 *   case 'audit_get_statistics':
 *     return audit_get_statistics(e, normalizedData);
 * 
 *   // ✅ MANTER O default: EXISTENTE
 *   default:
 *     return jsonOut_({ ok: false, error: "unknown_type" });
 */

// ============================================================================
// MODIFICAÇÃO 3: LOCALIZAR CONSTANTES NO INÍCIO DO ARQUIVO
// ============================================================================

/**
 * BUSCAR NO SEU CÓDIGO GAS:
 * Ctrl+F: "const " (linhas bem no início do arquivo)
 * OU
 * Buscar onde você tem outras configurações/constantes
 * 
 * LOCALIZAÇÃO: Normalmente nas primeiras 50-100 linhas
 * 
 * ADICIONAR DEPOIS DAS SUAS CONSTANTES EXISTENTES:
 */

// ✅ ADICIONAR ESTAS CONFIGURAÇÕES:
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
// MODIFICAÇÃO 4: LOCALIZAR FUNÇÕES UTILITÁRIAS (utilities/helpers)
// ============================================================================

/**
 * BUSCAR NO SEU CÓDIGO GAS:
 * Ctrl+F: "function " (procurar por outras funções auxiliares)
 * OU
 * Ctrl+F: "function log_"
 * OU
 * Ctrl+F: "function jsonOut_"
 * 
 * LOCALIZAÇÃO: Normalmente depois das funções principais ou antes do final
 * 
 * ADICIONAR ESTAS FUNÇÕES DEPOIS DAS SUAS FUNÇÕES AUXILIARES EXISTENTES:
 */

// ✅ ADICIONAR ESTAS FUNÇÕES UTILITÁRIAS:
function getOrCreateSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = NEW_SHEET_HEADERS[sheetName];
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      log_(`Created sheet: ${sheetName} with headers: ${headers.join(', ')}`);
    }
  }
  
  return sheet;
}

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
    log_(`Erro ao buscar dados de ${sheetName}: ${error}`);
    return [];
  }
}

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
      
      log_(`Updated row in ${sheetName}: ${JSON.stringify(filters)} -> ${JSON.stringify(updates)}`);
      return true;
    } else {
      return addSheetRow_(sheetName, { ...filters, ...updates });
    }
    
  } catch (error) {
    log_(`Erro ao atualizar ${sheetName}: ${error}`);
    return false;
  }
}

function generateUniqueId_() {
  return Utilities.getUuid();
}

// ============================================================================
// MODIFICAÇÃO 5: SE VOCÊ TEM function doGet() (opcional)
// ============================================================================

/**
 * BUSCAR NO SEU CÓDIGO GAS:
 * Ctrl+F: "function doGet"
 * 
 * SE ENCONTRAR, MODIFICAR PARA:
 * function doGet(e) {
 *   try {
 *     const params = e.parameter || {};
 *     
 *     // ✅ ADICIONAR ESTAS LINHAS:
 *     const type = params.type || params.action;
 *     const site = params.site || params.siteSlug;
 *     
 *     log_(`doGet: type=${type}, site=${site}`);
 *     
 *     const normalizedData = { ...params, type, site };
 *     
 *     return doPost({
 *       postData: {
 *         contents: JSON.stringify(normalizedData)
 *       }
 *     });
 *     
 *   } catch (error) {
 *     log_(`Erro no doGet: ${error}`);
 *     return jsonOut_({ ok: false, error: 'Erro interno do servidor' });
 *   }
 * }
 * 
 * SE NÃO ENCONTRAR, PULAR ESTA ETAPA.
 */

// ============================================================================
// MODIFICAÇÃO 6: NO FINAL DO ARQUIVO (últimas linhas)
// ============================================================================

/**
 * LOCALIZAÇÃO: No final do arquivo, antes da última linha ou depois da última função
 * 
 * COPIAR E COLAR TODO O CONTEÚDO DO ARQUIVO "NOVAS_FUNCOES_GAS.js"
 * MAS FAZENDO ESTAS SUBSTITUIÇÕES:
 * 
 * Trocar:
 * - findSheetData() -> findSheetData_()
 * - addSheetRow() -> addSheetRow_()
 * - updateSheetRow() -> updateSheetRow_()
 * - getOrCreateSheet() -> getOrCreateSheet_()
 * - Utilities.getUuid() -> generateUniqueId_()
 * 
 * TOTAL: Adicionar 37 novas funções no final do arquivo
 */

// ============================================================================
// RESUMO VISUAL DE ONDE FAZER CADA MODIFICAÇÃO:
// ============================================================================

/**
 * SEU ARQUIVO GAS (4000 linhas) FICARÁ ASSIM:
 * 
 * Linhas 1-50:    [suas constantes existentes] + NEW_FEATURES_CONFIG
 * Linhas 51-200:  [outras funções existentes]
 * Linhas 201-250: function doPost() MODIFICADA (normalização)
 * Linhas 251-300: switch(type) com cases existentes + 37 NOVOS CASES
 * Linhas 301-3800: [suas funções existentes como list_leads, status, etc]
 * Linhas 3801-3900: [suas funções auxiliares existentes] + NOVAS UTILITIES
 * Linhas 3901-4000+: 37 NOVAS FUNÇÕES (admin, multi-idioma, etc)
 * 
 * TOTAL DE MODIFICAÇÕES:
 * ✅ 6 locais diferentes no arquivo
 * ✅ Aproximadamente 37 novos cases + 37 novas funções + 6 utilities
 * ✅ Tudo compatível com seu código existente
 */

// ============================================================================
// TESTE RÁPIDO APÓS IMPLEMENTAR:
// ============================================================================

/**
 * PARA TESTAR SE DEU CERTO:
 * 
 * 1. Salve o GAS e faça deploy
 * 2. Teste uma função existente (ex: list_leads) - deve continuar funcionando
 * 3. Teste uma função nova: admin_get_client_features
 * 4. Verifique se as planilhas novas são criadas automaticamente
 * 
 * SE DER ERRO:
 * - Verifique se todos os "case" têm "return" antes
 * - Verifique se não esqueceu nenhuma vírgula
 * - Verifique se o switch(type) está correto
 */