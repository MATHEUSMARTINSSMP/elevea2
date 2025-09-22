const BUILD = 'debug-2025-09-11';

/** ============================= CONFIGURAÇÕES E CONSTANTES ============================= */

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

/** ============================= HANDLERS PRINCIPAIS ============================= */

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

  // ✅ COMPATIBILIDADE: Normalizar 'type'/'action' e 'site'/'siteSlug'
  const type = data.type || data.action;
  const site = data.site || data.siteSlug;
  const normalizedData = { ...data, type, site };
  
  log_(ss, "normalized", {
    originalType: data.type || "",
    originalAction: data.action || "",
    normalizedType: type || "",
    originalSite: data.site || "",
    originalSiteSlug: data.siteSlug || "",
    normalizedSite: site || ""
  });


  // Ping rápido
  if (type === "ping") {
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
    if (type === "save_onboarding" || String(e.parameter && e.parameter.type || "") === "save_onboarding") {
      return handleSaveOnboarding_(ss, data);
    }

    // ===== Gerar/atualizar apenas o prompt do Lovable (a partir do que já está em settings) =====
    if (type === "generate_prompt" || String(e.parameter && e.parameter.type || "") === "generate_prompt") {
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
    if (type === "upload_base64") {
      log_(ss, "route_upload_base64", {});
      return handleUploadBase64_(ss, data);
    }

    // ===== SESSIONS: receber defs do Lovable (Netlify onSuccess) =====
    if (type === "sections_upsert_defs") {
      // delega auth e persistência para a própria função (único ponto — removido duplicado)
      return sectionsUpsertDefs_(ss, data);
    }

    // ===== SESSIONS: inicializar conteúdo (data) a partir do onboarding =====
    if (type === "sections_bootstrap_from_onboarding") {
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
    if (type === "admin_set") {
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
    if (type === "save_settings") {
      return saveClientSettings_(ss, data);
    }
    // (único ponto de sections_upsert_defs já está acima)
    if (type === "record_hit") {
      return recordHit_(ss, data);
    }

    // CRIAR LEAD (POST)
    if (type === "lead_new") {
      return createLead_(ss, data);
    }

    // CRIAR FEEDBACK (POST)
    if (type === "feedback_new") {
      return createFeedback_(ss, data);
    }
    // Receber feedback público (site) — com email/phone opcionais
    if (type === "submit_feedback") {
      return createFeedback_(ss, data);
    }

    // Moderação: aprovar/ocultar (requer PIN salvo em settings_kv.security.vip_pin)
    if (type === "feedback_set_approval") {
      return feedbackSetApproval_(ss, data);
    }

    // ============================= NOVAS FUNCIONALIDADES VIP =============================
    
    // === CONTROLE ADMIN DE FUNCIONALIDADES ===
    if (type === 'admin_get_client_features') {
      log_(ss, "route_admin_get_client_features", {});
      return admin_get_client_features(e, normalizedData);
    }
    if (type === 'admin_update_client_features') {
      log_(ss, "route_admin_update_client_features", {});
      return admin_update_client_features(e, normalizedData);
    }
    if (type === 'admin_toggle_client_feature') {
      log_(ss, "route_admin_toggle_client_feature", {});
      return admin_toggle_client_feature(e, normalizedData);
    }
    if (type === 'admin_update_client_plan') {
      log_(ss, "route_admin_update_client_plan", {});
      return admin_update_client_plan(e, normalizedData);
    }

    // === SISTEMA MULTI-IDIOMA ===
    if (type === 'multi_language_get_settings') {
      log_(ss, "route_multi_language_get_settings", {});
      return multi_language_get_settings(e, normalizedData);
    }
    if (type === 'multi_language_update_settings') {
      log_(ss, "route_multi_language_update_settings", {});
      return multi_language_update_settings(e, normalizedData);
    }
    if (type === 'multi_language_translate_content') {
      log_(ss, "route_multi_language_translate_content", {});
      return multi_language_translate_content(e, normalizedData);
    }

    // === SISTEMA DE AGENDAMENTO ===
    if (type === 'appointment_get_settings') {
      log_(ss, "route_appointment_get_settings", {});
      return appointment_get_settings(e, normalizedData);
    }
    if (type === 'appointment_create') {
      log_(ss, "route_appointment_create", {});
      return appointment_create(e, normalizedData);
    }
    if (type === 'appointment_get_availability') {
      log_(ss, "route_appointment_get_availability", {});
      return appointment_get_availability(e, normalizedData);
    }

    // === E-COMMERCE ===
    if (type === 'ecommerce_get_products') {
      log_(ss, "route_ecommerce_get_products", {});
      return ecommerce_get_products(e, normalizedData);
    }
    if (type === 'ecommerce_create_product') {
      log_(ss, "route_ecommerce_create_product", {});
      return ecommerce_create_product(e, normalizedData);
    }
    if (type === 'ecommerce_update_product') {
      log_(ss, "route_ecommerce_update_product", {});
      return ecommerce_update_product(e, normalizedData);
    }
    if (type === 'ecommerce_delete_product') {
      log_(ss, "route_ecommerce_delete_product", {});
      return ecommerce_delete_product(e, normalizedData);
    }
    if (type === 'ecommerce_get_orders') {
      log_(ss, "route_ecommerce_get_orders", {});
      return ecommerce_get_orders(e, normalizedData);
    }
    if (type === 'ecommerce_create_order') {
      log_(ss, "route_ecommerce_create_order", {});
      return ecommerce_create_order(e, normalizedData);
    }
    if (type === 'ecommerce_update_order_status') {
      log_(ss, "route_ecommerce_update_order_status", {});
      return ecommerce_update_order_status(e, normalizedData);
    }
    if (type === 'ecommerce_get_store_settings') {
      log_(ss, "route_ecommerce_get_store_settings", {});
      return ecommerce_get_store_settings(e, normalizedData);
    }
    if (type === 'ecommerce_update_store_settings') {
      log_(ss, "route_ecommerce_update_store_settings", {});
      return ecommerce_update_store_settings(e, normalizedData);
    }
    if (type === 'ecommerce_get_analytics') {
      log_(ss, "route_ecommerce_get_analytics", {});
      return ecommerce_get_analytics(e, normalizedData);
    }

    // === WHITE-LABEL ===
    if (type === 'white_label_create_reseller') {
      log_(ss, "route_white_label_create_reseller", {});
      return white_label_create_reseller(e, normalizedData);
    }
    if (type === 'white_label_get_reseller') {
      log_(ss, "route_white_label_get_reseller", {});
      return white_label_get_reseller(e, normalizedData);
    }
    if (type === 'white_label_update_reseller') {
      log_(ss, "route_white_label_update_reseller", {});
      return white_label_update_reseller(e, normalizedData);
    }
    if (type === 'white_label_get_branding') {
      log_(ss, "route_white_label_get_branding", {});
      return white_label_get_branding(e, normalizedData);
    }
    if (type === 'white_label_update_branding') {
      log_(ss, "route_white_label_update_branding", {});
      return white_label_update_branding(e, normalizedData);
    }
    if (type === 'white_label_get_clients') {
      log_(ss, "route_white_label_get_clients", {});
      return white_label_get_clients(e, normalizedData);
    }
    if (type === 'white_label_add_client') {
      log_(ss, "route_white_label_add_client", {});
      return white_label_add_client(e, normalizedData);
    }
    if (type === 'white_label_generate_site') {
      log_(ss, "route_white_label_generate_site", {});
      return white_label_generate_site(e, normalizedData);
    }
    if (type === 'white_label_get_analytics') {
      log_(ss, "route_white_label_get_analytics", {});
      return white_label_get_analytics(e, normalizedData);
    }
    if (type === 'white_label_check_slug') {
      log_(ss, "route_white_label_check_slug", {});
      return white_label_check_slug(e, normalizedData);
    }
    if (type === 'white_label_update_domain') {
      log_(ss, "route_white_label_update_domain", {});
      return white_label_update_domain(e, normalizedData);
    }
    if (type === 'white_label_get_commission_report') {
      log_(ss, "route_white_label_get_commission_report", {});
      return white_label_get_commission_report(e, normalizedData);
    }

    // === TEMPLATE MARKETPLACE ===
    if (type === 'marketplace_get_templates') {
      log_(ss, "route_marketplace_get_templates", {});
      return marketplace_get_templates(e, normalizedData);
    }
    if (type === 'marketplace_get_template') {
      log_(ss, "route_marketplace_get_template", {});
      return marketplace_get_template(e, normalizedData);
    }
    if (type === 'marketplace_purchase_template') {
      log_(ss, "route_marketplace_purchase_template", {});
      return marketplace_purchase_template(e, normalizedData);
    }
    if (type === 'marketplace_apply_template') {
      log_(ss, "route_marketplace_apply_template", {});
      return marketplace_apply_template(e, normalizedData);
    }
    if (type === 'marketplace_rate_template') {
      log_(ss, "route_marketplace_rate_template", {});
      return marketplace_rate_template(e, normalizedData);
    }
    if (type === 'marketplace_get_categories') {
      log_(ss, "route_marketplace_get_categories", {});
      return marketplace_get_categories(e, normalizedData);
    }
    if (type === 'marketplace_get_purchases') {
      log_(ss, "route_marketplace_get_purchases", {});
      return marketplace_get_purchases(e, normalizedData);
    }

    // === AUDIT LOGS ===
    if (type === 'audit_log_event') {
      log_(ss, "route_audit_log_event", {});
      return audit_log_event(e, normalizedData);
    }
    if (type === 'audit_get_logs') {
      log_(ss, "route_audit_get_logs", {});
      return audit_get_logs(e, normalizedData);
    }
    if (type === 'audit_get_security_alerts') {
      log_(ss, "route_audit_get_security_alerts", {});
      return audit_get_security_alerts(e, normalizedData);
    }
    if (type === 'audit_generate_report') {
      log_(ss, "route_audit_generate_report", {});
      return audit_generate_report(e, normalizedData);
    }
    if (type === 'audit_resolve_alert') {
      log_(ss, "route_audit_resolve_alert", {});
      return audit_resolve_alert(e, normalizedData);
    }
    if (type === 'audit_get_statistics') {
      log_(ss, "route_audit_get_statistics", {});
      return audit_get_statistics(e, normalizedData);
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

/** ============================= AUTENTICAÇÃO ============================= */

/** ================== OVERRIDE (admin) ================== */
function handleOverride_(data, shCad) {
  try {
    const slug = normalizeSlug_(String(data.siteSlug || ''));
    const token = String(data.token || '');
    const manual = String(data.manualBlock || '').toLowerCase();
    const manualBlock = (manual === '1' || manual === 'true' || manual === 'yes' || manual === 'on');

    // Verify admin token
    var props = PropertiesService.getScriptProperties();
    var ADMIN = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';
    if (!ADMIN || token !== ADMIN) {
      return jsonOut_({ ok: false, error: 'unauthorized' });
    }

    if (!slug) return jsonOut_({ ok: false, error: 'missing_site' });
    if (!shCad) return jsonOut_({ ok: false, error: 'missing_sheet_cadastros' });

    const headers = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(String);
    const idxSite = headers.indexOf('siteSlug');
    if (idxSite === -1) return jsonOut_({ ok: false, error: 'missing_siteSlug_header' });

    let idxManual = headers.indexOf('manual_block');
    if (idxManual === -1) {
      // Create manual_block column
      const lastCol = shCad.getLastColumn();
      shCad.insertColumnAfter(lastCol);
      shCad.getRange(1, lastCol + 1).setValue('manual_block');
      idxManual = lastCol;
    }

    const last = shCad.getLastRow();
    if (last < 2) return jsonOut_({ ok: false, error: 'no_rows' });

    const range = shCad.getRange(2, 1, last - 1, shCad.getLastColumn());
    const rows = range.getValues();

    let updated = false;
    for (let i = 0; i < rows.length; i++) {
      const rowSlug = normalizeSlug_(String(rows[i][idxSite] || ''));
      if (rowSlug === slug) {
        rows[i][idxManual] = manualBlock ? 'TRUE' : '';
        updated = true;
        break;
      }
    }

    if (!updated) return jsonOut_({ ok: false, error: 'site_not_found' });

    range.setValues(rows);
    return jsonOut_({ ok: true, siteSlug: slug, manual_block: manualBlock });

  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function userSetPassword_(ss, data) {
  try {
    var email = String(data.email || '').trim().toLowerCase();
    var pwd = String(data.password || '').trim();
    if (!email || !pwd) return jsonOut_({ ok:false, error:'missing_fields' });

    var sh = ensureUsuariosSheet_(ss);
    ensureResetColumns_(sh);
    var map = headerIndexMap_(sh);
    var rowIdx = findUserRowByEmail_(sh, email);
    if (rowIdx === -1) return jsonOut_({ ok:false, error:'user_not_found' });

    var salt = makeSalt_();
    var hash = sha256Hex_(pwd + salt);
    var actualRow = rowIdx + 2;

    sh.getRange(actualRow, map.password_hash + 1).setValue(hash);
    sh.getRange(actualRow, map.salt + 1).setValue(salt);
    sh.getRange(actualRow, map.last_login + 1).setValue(new Date().toISOString());
    // reset token usado
    sh.getRange(actualRow, map.reset_token + 1).setValue('');
    sh.getRange(actualRow, map.reset_expires + 1).setValue('');

    return jsonOut_({ ok:true, message:'password_set' });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function userLogin_(ss, data) {
  try {
    var email = String(data.email || '').trim().toLowerCase();
    var pwd = String(data.password || '').trim();
    if (!email || !pwd) return jsonOut_({ ok:false, error:'missing_fields' });

    var sh = ensureUsuariosSheet_(ss);
    var map = headerIndexMap_(sh);
    var rowIdx = findUserRowByEmail_(sh, email);
    if (rowIdx === -1) return jsonOut_({ ok:false, error:'user_not_found' });

    var actualRow = rowIdx + 2;
    var storedHash = String(sh.getRange(actualRow, map.password_hash + 1).getValue() || '');
    var salt = String(sh.getRange(actualRow, map.salt + 1).getValue() || '');
    if (!storedHash) return jsonOut_({ ok:false, error:'no_password_set' });

    var computedHash = sha256Hex_(pwd + salt);
    if (computedHash !== storedHash) return jsonOut_({ ok:false, error:'invalid_credentials' });

    sh.getRange(actualRow, map.last_login + 1).setValue(new Date().toISOString());
    return jsonOut_({ ok:true, message:'login_success' });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function userMe_(ss, data) {
  try {
    var email = String(data.email || '').trim().toLowerCase();
    if (!email) return jsonOut_({ ok:false, error:'missing_email' });

    var sh = ensureUsuariosSheet_(ss);
    var map = headerIndexMap_(sh);
    var rowIdx = findUserRowByEmail_(sh, email);
    if (rowIdx === -1) return jsonOut_({ ok:false, error:'user_not_found' });

    var actualRow = rowIdx + 2;
    var siteSlug = String(sh.getRange(actualRow, map.siteSlug + 1).getValue() || '');
    var role = String(sh.getRange(actualRow, map.role + 1).getValue() || 'client');
    var plan = String(sh.getRange(actualRow, map.plan + 1).getValue() || 'essential');
    var lastLogin = String(sh.getRange(actualRow, map.last_login + 1).getValue() || '');

    return jsonOut_({
      ok: true,
      user: {
        email: email,
        siteSlug: siteSlug,
        role: role,
        plan: plan,
        lastLogin: lastLogin
      }
    });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function passwordResetRequest_(ss, data) {
  try {
    var email = String(data.email || '').trim().toLowerCase();
    if (!email) return jsonOut_({ ok:false, error:'missing_email' });

    var sh = ensureUsuariosSheet_(ss);
    ensureResetColumns_(sh);
    var map = headerIndexMap_(sh);
    var rowIdx = findUserRowByEmail_(sh, email);
    if (rowIdx === -1) return jsonOut_({ ok:false, error:'user_not_found' });

    var token = Utilities.getUuid();
    var expires = new Date(Date.now() + 24*60*60*1000).toISOString(); // 24h
    var actualRow = rowIdx + 2;

    sh.getRange(actualRow, map.reset_token + 1).setValue(token);
    sh.getRange(actualRow, map.reset_expires + 1).setValue(expires);

    var siteSlug = String(sh.getRange(actualRow, map.siteSlug + 1).getValue() || '');
    sendWelcomeEmailWithReset_(email, siteSlug, dashUrl_(), token);

    return jsonOut_({ ok:true, message:'reset_email_sent' });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function passwordResetConfirm_(ss, data) {
  try {
    var token = String(data.token || '').trim();
    var newPwd = String(data.password || '').trim();
    if (!token || !newPwd) return jsonOut_({ ok:false, error:'missing_fields' });

    var sh = ensureUsuariosSheet_(ss);
    ensureResetColumns_(sh);
    var map = headerIndexMap_(sh);
    var last = sh.getLastRow();
    if (last < 2) return jsonOut_({ ok:false, error:'no_users' });

    var values = sh.getRange(2, 1, last-1, sh.getLastColumn()).getValues();
    var foundRow = -1;
    for (var i = 0; i < values.length; i++) {
      var storedToken = String(values[i][map.reset_token] || '');
      var expires = String(values[i][map.reset_expires] || '');
      if (storedToken === token) {
        if (new Date(expires) > new Date()) {
          foundRow = i + 2;
          break;
        } else {
          return jsonOut_({ ok:false, error:'token_expired' });
        }
      }
    }

    if (foundRow === -1) return jsonOut_({ ok:false, error:'invalid_token' });

    var salt = makeSalt_();
    var hash = sha256Hex_(newPwd + salt);

    sh.getRange(foundRow, map.password_hash + 1).setValue(hash);
    sh.getRange(foundRow, map.salt + 1).setValue(salt);
    sh.getRange(foundRow, map.reset_token + 1).setValue('');
    sh.getRange(foundRow, map.reset_expires + 1).setValue('');

    return jsonOut_({ ok:true, message:'password_reset_success' });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

/** ============================= ESTRUTURA DE SITES ============================= */

/**
 * Busca a estrutura personalizada de um site
 */
function get_site_structure(site) {
  try {
    const ss = openSS_();
    let structureSheet = ss.getSheetByName("site_structure");

    if (!structureSheet) {
      return { ok: false, error: "Planilha site_structure não encontrada" };
    }

    const headers = structureSheet.getRange(1, 1, 1, structureSheet.getLastColumn()).getValues()[0];
    const siteIdx = headers.indexOf("siteSlug");
    const structureIdx = headers.indexOf("structure");
    const updatedIdx = headers.indexOf("lastUpdated");

    if (siteIdx === -1 || structureIdx === -1) {
      return { ok: false, error: "Headers obrigatórios não encontrados" };
    }

    const data = structureSheet.getRange(2, 1, structureSheet.getLastRow() - 1, structureSheet.getLastColumn()).getValues();

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
}

/**
 * Salva a estrutura personalizada de um site
 */
function save_site_structure(site, structure) {
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
}

/**
 * Valida PIN VIP de um site
 */
function validate_vip_pin(site, pin) {
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

    const data = usuariosSheet.getRange(2, 1, usuariosSheet.getLastRow() - 1, usuariosSheet.getLastColumn()).getValues();

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
}

/**
 * Cria estrutura de site padrão baseada no tipo de negócio detectado
 */
function createSiteStructureByType(site, businessCategory, onboardingData) {
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
        title: (onboardingData.empresa || site) + " - " + getBusinessTitle(businessCategory),
        subtitle: getBusinessSubtitle(businessCategory),
        description: onboardingData.historia || "Conhecimento e experiência para entregar resultados excepcionais.",
        cta_text: "Entre em Contato",
        cta_link: "#contato",
        background_image: onboardingData.fotosUrl || ""
      }
    }
  ];

  // Seções específicas por categoria de negócio
  let specificSections = [];

  switch (businessCategory) {
    case "health":
      specificSections = [
        {
          id: "sobre",
          name: "Sobre",
          visible: true,
          data: {
            title: "Sobre Nossa Clínica",
            content: onboardingData.historia || "Cuidando da sua saúde com profissionalismo e dedicação.",
            image: onboardingData.fotosUrl || ""
          }
        },
        {
          id: "especialidades",
          name: "Especialidades",
          visible: true,
          data: {
            title: "Nossas Especialidades",
            services: onboardingData.produtos || "Consultas, Exames, Tratamentos especializados"
          }
        },
        {
          id: "equipe",
          name: "Nossa Equipe",
          visible: true,
          data: {
            title: "Profissionais Qualificados",
            description: "Equipe médica experiente e comprometida com seu bem-estar"
          }
        }
      ];
      break;

    case "food":
      specificSections = [
        {
          id: "sobre",
          name: "Sobre",
          visible: true,
          data: {
            title: "Nossa História",
            content: onboardingData.historia || "Tradição e sabor que fazem a diferença.",
            image: onboardingData.fotosUrl || ""
          }
        },
        {
          id: "cardapio",
          name: "Cardápio",
          visible: true,
          data: {
            title: "Nosso Cardápio",
            items: onboardingData.produtos || "Pratos especiais, bebidas, sobremesas"
          }
        },
        {
          id: "galeria",
          name: "Galeria",
          visible: true,
          data: {
            title: "Nossos Pratos",
            images: onboardingData.fotosUrl || ""
          }
        }
      ];
      break;

    case "automotive":
      specificSections = [
        {
          id: "sobre",
          name: "Sobre",
          visible: true,
          data: {
            title: "Sobre Nossa Oficina",
            content: onboardingData.historia || "Experiência e qualidade em serviços automotivos.",
            image: onboardingData.fotosUrl || ""
          }
        },
        {
          id: "servicos",
          name: "Serviços",
          visible: true,
          data: {
            title: "Nossos Serviços",
            services: onboardingData.produtos || "Mecânica geral, elétrica, pintura, funilaria"
          }
        },
        {
          id: "diferenciais",
          name: "Diferenciais",
          visible: true,
          data: {
            title: "Por que nos escolher?",
            points: ["Profissionais qualificados", "Equipamentos modernos", "Preços justos", "Garantia nos serviços"]
          }
        }
      ];
      break;

    default:
      specificSections = [
        {
          id: "sobre",
          name: "Sobre",
          visible: true,
          data: {
            title: "Sobre Nós",
            content: onboardingData.historia || "Qualidade e excelência em nossos serviços.",
            image: onboardingData.fotosUrl || ""
          }
        },
        {
          id: "servicos",
          name: "Serviços",
          visible: true,
          data: {
            title: "Nossos Serviços",
            services: onboardingData.produtos || "Serviços de qualidade com foco na satisfação do cliente"
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
        title: "O que nossos clientes dizem",
        testimonials: []
      }
    },
    {
      id: "contato",
      name: "Contato",
      visible: true,
      data: {
        title: "Entre em Contato",
        phone: onboardingData.whatsapp || "",
        email: onboardingData.email || "",
        address: onboardingData.endereco || "",
        social: {
          instagram: "",
          facebook: "",
          whatsapp: onboardingData.whatsapp || ""
        }
      }
    }
  ];

  baseStructure.sections = [...commonSections, ...specificSections, ...finalSections];

  return baseStructure;
}

/** ============================= FUNÇÕES DE NEGÓCIO ============================= */

/**
 * Detecta automaticamente o tipo de negócio baseado no texto fornecido
 */
function detectBusinessType(businessText) {
  // Converte o input para objeto se for string
  var text = "";
  if (typeof businessText === "string") {
    text = businessText.toLowerCase();
  } else if (typeof businessText === "object" && businessText !== null) {
    // Concatena todos os campos de texto do objeto
    var fields = ["empresa", "historia", "produtos", "endereco", "descricao"];
    var textParts = [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (businessText[field]) {
        textParts.push(String(businessText[field]));
      }
    }
    text = textParts.join(" ").toLowerCase();
  }

  // Palavras-chave por categoria
  var categories = {
    health: {
      keywords: ["clinica", "medic", "saude", "hospital", "consulta", "exame", "tratamento", "enfermag", "fisioter", "odonto", "dentist", "psicolog", "nutri", "farmac", "laboratorio", "radiologia", "veterinari", "petshop"],
      weight: 1.0
    },
    food: {
      keywords: ["restaurante", "lanchonete", "pizzaria", "hamburgueria", "comida", "culinaria", "chef", "cozinha", "cardapio", "menu", "prato", "bebida", "delivery", "ifood", "gastronomia", "padaria", "confeitaria", "sorveteria", "acai", "cafe", "bar"],
      weight: 1.0
    },
    automotive: {
      keywords: ["oficina", "mecanica", "automovel", "carro", "veiculo", "motor", "manutencao", "reparo", "funilaria", "pintura", "pneu", "oleo", "revisao", "diagnostico", "eletrica", "freio", "suspensao", "cambio", "carroceria"],
      weight: 1.0
    },
    construction: {
      keywords: ["construcao", "reforma", "pedreiro", "engenharia", "arquitetura", "obra", "acabamento", "pintura", "eletrica", "hidraulica", "telhado", "piso", "azulejo", "ceramica", "marcenaria", "carpintaria", "demolica"],
      weight: 1.0
    },
    beauty: {
      keywords: ["salao", "beleza", "cabelo", "estetica", "manicure", "pedicure", "massagem", "depilacao", "sobrancelha", "maquiagem", "cosmetico", "unha", "tratamento", "relaxamento", "spa", "barbershop", "barbearia"],
      weight: 1.0
    },
    technology: {
      keywords: ["tecnologia", "software", "sistema", "aplicativo", "website", "desenvolvimento", "programacao", "informatica", "computador", "digital", "online", "internet", "hospedagem", "dominio", "backup", "suporte", "manutencao"],
      weight: 1.0
    },
    jewelry: {
      keywords: ["joalheria", "joia", "anel", "colar", "brinco", "pulseira", "ouro", "prata", "diamante", "pedra", "preciosa", "relojoaria", "relogio", "semijoias", "folheado", "bijuteria"],
      weight: 1.0
    },
    general: {
      keywords: ["servico", "empresa", "negocio", "comercio", "vendas", "atendimento", "cliente", "qualidade", "profissional"],
      weight: 0.3
    }
  };

  var scores = {};
  var matchedKeywords = [];

  // Inicializa scores
  for (var category in categories) {
    scores[category] = 0;
  }

  // Calcula scores baseado nas palavras-chave encontradas
  for (var category in categories) {
    var categoryData = categories[category];
    var keywords = categoryData.keywords;
    var weight = categoryData.weight;

    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      var regex = new RegExp("\\b" + keyword, "gi");
      var matches = text.match(regex);
      if (matches) {
        scores[category] += matches.length * weight;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Encontra a categoria com maior score
  var bestCategory = "general";
  var maxScore = 0;
  for (var category in scores) {
    if (scores[category] > maxScore) {
      maxScore = scores[category];
      bestCategory = category;
    }
  }

  // Se nenhuma categoria específica foi detectada, usa "general"
  if (maxScore === 0) {
    bestCategory = "general";
    scores.general = 1;
  }

  // Calcula confiança (0-1)
  var totalScore = 0;
  for (var category in scores) {
    totalScore += scores[category];
  }
  var confidence = totalScore > 0 ? scores[bestCategory] / totalScore : 0;

  return {
    category: bestCategory,
    confidence: confidence,
    scores: scores,
    keywords: matchedKeywords.slice(0, 5) // Limita a 5 palavras-chave mais relevantes
  };
}

/**
 * Retorna título padrão baseado na categoria do negócio
 */
function getBusinessTitle(category) {
  const titles = {
    health: "Cuidando da sua Saúde",
    food: "Sabores Únicos", 
    automotive: "Serviços Automotivos",
    construction: "Construção e Reforma",
    beauty: "Beleza e Bem-estar",
    technology: "Soluções Tecnológicas",
    jewelry: "Joias e Acessórios",
    general: "Qualidade e Excelência"
  };

  return titles[category] || titles.general;
}

/**
 * Retorna subtítulo padrão baseado na categoria do negócio  
 */
function getBusinessSubtitle(category) {
  const subtitles = {
    health: "Profissionais qualificados para cuidar de você",
    food: "Tradição e sabor em cada prato",
    automotive: "Experiência e confiança em serviços automotivos", 
    construction: "Transformando espaços com qualidade",
    beauty: "Realçando sua beleza natural",
    technology: "Inovação que faz a diferença",
    jewelry: "Peças únicas para momentos especiais",
    general: "Comprometimento com a satisfação do cliente"
  };

  return subtitles[category] || subtitles.general;
}

/**
 * Gera seções personalizadas baseadas no tipo de negócio
 */
function generateSectionsForBusiness_(businessCategory, context) {
  // Lista de campos personalizados para cada seção baseada no tipo de negócio

  var baseFields = [
    {
      "id": "hero",
      "name": "Hero Principal",
      "fields": [
        { "key": "title", "label": "Título Principal" },
        { "key": "subtitle", "label": "Subtítulo" },
        { "key": "description", "label": "Descrição" },
        { "key": "cta_text", "label": "Texto do Botão" },
        { "key": "cta_link", "label": "Link do Botão" },
        { "key": "background_image", "label": "Imagem de Fundo" }
      ]
    },
    {
      "id": "sobre", 
      "name": "Sobre",
      "fields": [
        { "key": "title", "label": "Título da Seção" },
        { "key": "content", "label": "Conteúdo" },
        { "key": "image", "label": "Imagem" }
      ]
    }
  ];

  var specificFields = [];

  // Campos específicos por categoria
  if (businessCategory === "health") {
    specificFields = [
      {
        "id": "especialidades",
        "name": "Especialidades", 
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "specialties", "label": "Lista de especialidades" }
        ]
      },
      {
        "id": "equipe",
        "name": "Equipe Médica",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "doctors", "label": "Lista de médicos" }
        ]
      }
    ];
  } else if (businessCategory === "food") {
    specificFields = [
      {
        "id": "cardapio",
        "name": "Cardápio",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "categories", "label": "Categorias do cardápio" },
          { "key": "featured_items", "label": "Pratos em destaque" }
        ]
      },
      {
        "id": "galeria",
        "name": "Galeria",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "images", "label": "Galeria de imagens" }
        ]
      }
    ];
  } else if (businessCategory === "automotive") {
    specificFields = [
      {
        "id": "servicos",
        "name": "Serviços Automotivos",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "services_list", "label": "Lista de serviços" },
          { "key": "specialties", "label": "Especialidades" }
        ]
      },
      {
        "id": "diferenciais",
        "name": "Diferenciais",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "advantages", "label": "Lista de vantagens" }
        ]
      }
    ];
  } else if (businessCategory === "construction") {
    specificFields = [
      {
        "id": "servicos",
        "name": "Serviços de Construção",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "services_list", "label": "Lista de serviços" },
          { "key": "specialties", "label": "Especialidades" }
        ]
      },
      {
        "id": "projetos",
        "name": "Projetos",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "projects", "label": "Galeria de projetos" }
        ]
      }
    ];
  } else if (businessCategory === "beauty") {
    specificFields = [
      {
        "id": "servicos",
        "name": "Serviços de Beleza",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "services_list", "label": "Lista de serviços" },
          { "key": "prices", "label": "Tabela de preços" }
        ]
      },
      {
        "id": "galeria",
        "name": "Galeria",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "before_after", "label": "Antes e depois" }
        ]
      }
    ];
  } else if (businessCategory === "technology") {
    specificFields = [
      {
        "id": "solucoes",
        "name": "Soluções",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "solutions_list", "label": "Lista de soluções" },
          { "key": "technologies", "label": "Tecnologias utilizadas" }
        ]
      },
      {
        "id": "portfolio",
        "name": "Portfólio",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "projects", "label": "Projetos realizados" }
        ]
      }
    ];
  } else if (businessCategory === "jewelry") {
    specificFields = [
      {
        "id": "colecoes",
        "name": "Coleções",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "collections", "label": "Lista de coleções" },
          { "key": "featured_items", "label": "Peças em destaque" }
        ]
      },
      {
        "id": "galeria",
        "name": "Galeria",
        "fields": [
          { "key": "title", "label": "Título" },
          { "key": "jewelry_images", "label": "Imagens das joias" }
        ]
      }
    ];
  } else {
    // Categoria geral ou outras
    specificFields = [
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

/** ============================= ONBOARDING E UPLOADS ============================= */

function handleOnboarding_(ss, data) {
  try {
    var slug = normalizeSlug_(String(data.siteSlug || ''));
    var email = String(data.email || '').trim().toLowerCase();
    if (!slug || !email) return jsonOut_({ ok:false, error:"missing_basic_fields" });

    // gateway de validação
    var gate = gateAllowOnboarding_(ss, data);
    if (!gate.ok) return gate;

    const sheetOb = ensureOnboardingSheet_(ss);
    sheetOb.appendRow([
      new Date(),
      email,
      slug,
      data.plan || '',
      data.logoUrl || '',
      data.fotosUrl || '',
      data.historia || '',
      data.produtos || '',
      data.fundacao || '',
      data.paleta || '',
      data.template || '',
      '', // drive_folder_url (preenchido em outro momento)
      ''  // lovable_prompt
    ]);

    // trigger bootstrap automático (se alguma seção já existe em settings)
    try {
      sectionsBootstrapFromOnboarding_(ss, slug);
    } catch (e) {
      // não crítico
    }

    return jsonOut_({ ok:true, siteSlug: slug });
  } catch (err) {
    return jsonOut_({ ok:false, error:String(err) });
  }
}

function gateAllowOnboarding_(ss, data) {
  try {
    var email = String(data.email || '').trim().toLowerCase();
    var slug  = normalizeSlug_(String(data.siteSlug || ''));

    if (!email || !slug) return jsonOut_({ ok:false, error:"missing_basic_fields" });

    // validação: slug já existe
    if (slugExiste_(slug)) return jsonOut_({ ok:false, error:"slug_already_exists" });

    // validação: email disponível para onboarding no slug específico
    var check = emailAvailableForOnboarding_(ss, email, slug);
    if (!check.available) return jsonOut_({ ok:false, error:check.reason });

    return { ok:true };
  } catch (err) {
    return jsonOut_({ ok:false, error:String(err) });
  }
}

function handleUploadFiles_(ss, e) {
  try {
    var email = String(e && e.parameter && e.parameter.email || "").trim().toLowerCase();
    var site = normalizeSlug_(String(e && e.parameter && e.parameter.siteSlug || ""));
    if (!email || !site) return jsonOut_({ ok:false, error:"missing_email_or_site" });

    // Pasta raiz do cliente
    var root = DriveApp.getFolderById(extractDriveFolderId_(ensureClientFolderUrl_(site)) || "");
    if (!root) return jsonOut_({ ok:false, error:"no_client_folder" });

    var filesObj = (e && e.files) ? e.files : {};
    var saved = [];

    function saveBlob(subName, blobOrFile) {
      try {
        var sub = getOrCreateSub_(root, subName); 
        var name = (typeof blobOrFile.getName === "function") ? blobOrFile.getName() : "upload_" + new Date().getTime();
        var f = sub.createFile(blobOrFile.setName ? blobOrFile.setName(name) : blobOrFile);
        ensureShareAndGetViewUrl_(f);
        saved.push(f.getName());
      } catch (saveErr) {
        console.error("Erro salvando blob " + subName + ":", saveErr);
      }
    }

    // Salvar cada arquivo
    if (filesObj) {
      if (filesObj.logo) {
        if (typeof filesObj.logo.getBytes === "function")      saveBlob("logo",  filesObj.logo);
        else if (Array.isArray(filesObj.logo))                  filesObj.logo.forEach(function(f){ saveBlob("logo", f); });
      }
      if (filesObj.fotos) {
        if (typeof filesObj.fotos.getBytes === "function")     saveBlob("fotos", filesObj.fotos);
        else if (Array.isArray(filesObj.fotos))                 filesObj.fotos.forEach(function(f){ saveBlob("fotos", f); });
      }
      if (filesObj.galeria) {
        if (typeof filesObj.galeria.getBytes === "function")   saveBlob("fotos", filesObj.galeria);
        else if (Array.isArray(filesObj.galeria))               filesObj.galeria.forEach(function(f){ saveBlob("fotos", f); });
      }
      // Outros arquivos genéricos
      Object.keys(filesObj).forEach(function(k) {
        if (k !== "logo" && k !== "fotos" && k !== "galeria") {
          var val = filesObj[k];
          if (typeof val.getBytes === "function") saveBlob("outros", val);
          else if (Array.isArray(val))            val.forEach(function(f){ saveBlob("outros", f); });
        }
      });
    }

    // Se nada foi salvo, escrever diagnóstico dentro da pasta
    if (saved.length === 0) {
      try {
        var diag = [
          "=== UPLOAD DEBUG ===",
          "date: " + new Date().toISOString(),
          "contentType: " + (e && e.postData ? String(e.postData.type || "") : ""),
          "hasPostData: " + (!!(e && e.postData)),
          "rawLen: " + (e && e.postData && e.postData.contents ? String(e.postData.contents.length) : "0"),
          "filesKeys: " + (filesObj ? Object.keys(filesObj).join(",") : "(no files)"),
          "paramKeys: " + (e && e.parameter ? Object.keys(e.parameter).join(",") : "(no params)")
        ].join("\n");
        var dbg = root.createFile("UPLOAD_DEBUG.txt", diag);
        saved.push(dbg.getName());
      } catch (_) {}
    }

    // Registro leve + logs
    var sh = ensureOnboardingSheet_(ss);
    sh.appendRow([
      new Date(), email, site, "",
      "(upload)", "(upload)", "", "", "", "", "",
      root.getUrl(), "FILES:" + (saved.length ? saved.join(", ") : "(nenhum arquivo detectado)")
    ]);

    log_(ss, "upload_done", {
      type: "upload_files",
      keys: filesObj ? Object.keys(filesObj).join(",") : "(no files)",
      note: "saved=" + saved.length
    });

    return jsonOut_({ ok:true, driveFolderUrl: root.getUrl(), saved: saved });
  } catch (err) {
    log_(ss, "upload_error", { error: String(err) });
    return jsonOut_({ ok:false, error:String(err) });
  }
}

function handleUploadBase64_(ss, data) {
  try {
    var email = String(data.email || "").trim().toLowerCase();
    var site = normalizeSlug_(String(data.siteSlug || data.site || ""));
    var filename = String(data.filename || "upload_" + new Date().getTime());
    var base64Data = String(data.base64 || "");
    var mimeType = String(data.mimeType || "application/octet-stream");
    var subfolder = String(data.subfolder || "outros"); // "logo", "fotos", "outros"

    if (!email || !site) return jsonOut_({ ok:false, error:"missing_email_or_site" });
    if (!base64Data) return jsonOut_({ ok:false, error:"missing_base64_data" });

    // Remove prefixo data URI se presente
    if (base64Data.includes(",")) {
      base64Data = base64Data.split(",")[1];
    }

    // Pasta raiz do cliente
    var folderUrl = ensureClientFolderUrl_(site);
    if (!folderUrl) return jsonOut_({ ok:false, error:"no_client_folder" });

    var folderId = extractDriveFolderId_(folderUrl);
    if (!folderId) return jsonOut_({ ok:false, error:"invalid_folder_url" });

    var root = DriveApp.getFolderById(folderId);
    var targetFolder = getOrCreateSub_(root, subfolder);

    // Converte base64 para blob
    var bytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(bytes, mimeType, filename);

    // Salva arquivo
    var file = targetFolder.createFile(blob);
    ensureShareAndGetViewUrl_(file);

    // Log
    log_(ss, "upload_base64_success", {
      site: site,
      filename: filename,
      subfolder: subfolder,
      fileUrl: file.getUrl()
    });

    return jsonOut_({
      ok: true,
      fileUrl: file.getUrl(),
      viewUrl: ensureShareAndGetViewUrl_(file),
      filename: filename,
      subfolder: subfolder
    });

  } catch (err) {
    log_(ss, "upload_base64_error", { error: String(err) });
    return jsonOut_({ ok:false, error:String(err) });
  }
}

/** ============================= HELPERS E UTILITÁRIOS ============================= */

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
  await fetch(GAS,{ method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ type:"sections_upsert_defs", site:SITE, defs, adminToken:ADMIN })
  });
}`.trim());

  /* — netlify.toml hook */
  L.push("Adicione ao `netlify.toml`:");
  L.push(`
[build]
command = "npm run build"
publish = "dist"
[[build.lifecycle.onSuccess]]
  command = "node tools/elevea-sync-sections.mjs"
`.trim());

  /* — Carregador de settings (status + settings_kv) */
  L.push("Implemente `src/lib/elevea.ts` com:");
  L.push(`
const GAS = import.meta.env.ELEVEA_STATUS_URL || import.meta.env.ELEVEA_GAS_URL;
const SLUG = import.meta.env.ELEVEA_SITE_SLUG;
export async function loadSettings(){
  try{
    const r = await fetch(\`\${GAS}?type=get_settings&site=\${encodeURIComponent(SLUG)}\`, { cache:"no-store" });
    const j = await r.json(); return j?.settings || {};
  }catch{ return {}; }
}
`.trim());

  /* — Construção da página usando o onboarding (placeholders) */
  L.push("Monte a landing **já preenchida** com placeholders vindos do briefing abaixo:");
  if (site)     L.push("• Slug: " + site);
  if (email)    L.push("• Contato: " + email);
  if (historia) L.push("• História: " + historia);
  if (produtos) L.push("• Produtos/Serviços: " + produtos);
  if (fundacao) L.push("• Fundada em: " + fundacao);
  if (paletaId) L.push("• Paleta: " + paletaId);
  if (template) L.push("• Template: " + template);
  if (logoUrl)  L.push("• Logo (ref): " + logoUrl);
  if (fotosUrl) L.push("• Pasta de fotos (ref): " + fotosUrl);

  L.push("Se houver endereço depois no settings, gere o bloco Mapa com `iframe` do Google Maps usando a query do endereço.");
  L.push("Cabeçalho fixo (flutuante), menu com âncoras (#sobre, #servicos, #depoimentos, #contato), botão flutuante do WhatsApp.");
  L.push("Rodapé com endereço (texto), link 'Como chegar' (maps), redes sociais (se preenchidas), e e-mail/WhatsApp.");

  /* — VIP vs Essencial */
  if (plan === "vip") {
    L.push("Plano VIP: destaque áreas editáveis (títulos/textos/imagens/cores) e inclua seção 'Depoimentos' com placeholder (será alimentada via back-end).");
  } else {
    L.push("Plano Essencial: mantenha a mesma estrutura, porém como conteúdo estático (sem UI de edição).");
  }

  /* — Render por IDs, nunca por nomes fixos */
  L.push("Na Home (`src/pages/Index.tsx`), carregue `defs` de `src/elevea.sections.json` e os valores via `loadSettings()`.");
  L.push("Para cada `sec` em `defs`, renderize a seção por ID; use valores `settings.sections.data[sec.id]` se existirem, senão placeholders do briefing.");

  return L.join("\\n");
}

function handleGeneratePrompt_(site) {
  site = normalizeSlug_(String(site || ""));
  if (!site) return jsonOut_({ ok:false, error:"missing_siteSlug" });

  var ss = openSS_();

  // 1) tentar ler o último registro normalizado da aba "settings"
  var shS = ss.getSheetByName("settings");
  var found = null, rowIdx = -1, head = [];
  if (shS && shS.getLastRow() >= 2) {
    head = shS.getRange(1,1,1,shS.getLastColumn()).getValues()[0].map(String);
    var iSite = head.indexOf("siteSlug");
    for (var r = shS.getLastRow(); r >= 2; r--) {
      var s = String(shS.getRange(r, iSite+1).getValue() || "").trim().toUpperCase();
      if (s === site) { rowIdx = r; break; }
    }
    if (rowIdx !== -1) {
      function G(name){ var i = head.indexOf(name); return i===-1 ? "" : String(shS.getRange(rowIdx, i+1).getValue() || ""); }

      var palette_id = G("palette_id");
      var template   = G("template_id");
      var colors     = []; try { colors = JSON.parse(G("colors_json")||"[]"); } catch(_){}
      var fotos      = []; try { fotos = JSON.parse(G("fotos_urls_json")||"[]"); } catch(_){}

      found = {
        plan:       G("plano") || "",
        email:      G("email"),
        siteSlug:   site,
        logoUrl:    G("logo_url"),
        fotosUrl:   (fotos[0] || ""),
        historia:   G("historia"),
        produtos:   G("produtos"),
        fundacao:   G("fundacao"),
        paleta:     palette_id,
        template:   template
      };
    }
  }

  // 2) fallback: tentar "onboarding" bruto (caso settings ainda não exista)
  if (!found) {
    var shO = ss.getSheetByName("onboarding");
    if (shO && shO.getLastRow() >= 2) {
      var hO = shO.getRange(1,1,1,shO.getLastColumn()).getValues()[0].map(String);
      var iSiteO = hO.indexOf("siteSlug");
      var rO = -1;
      for (var rr = shO.getLastRow(); rr >= 2; rr--) {
        var sO = String(shO.getRange(rr, iSiteO+1).getValue() || "").trim().toUpperCase();
        if (sO === site) { rO = rr; break; }
      }
      if (rO !== -1) {
        function GO(name){ var i = hO.indexOf(name); return i===-1 ? "" : String(shO.getRange(rO, i+1).getValue() || ""); }
        found = {
          plan:       GO("plan") || "",
          email:      GO("email"),
          siteSlug:   site,
          logoUrl:    GO("logoUrl"),
          fotosUrl:   GO("fotosUrl"),
          historia:   GO("historia"),
          produtos:   GO("produtos"),
          fundacao:   GO("fundacao"),
          paleta:     GO("paleta"),
          template:   GO("template")
        };
      }
    }
  }

  if (!found) return jsonOut_({ ok:false, error:"no_data_for_site" });

  // 3) gerar o prompt e salvar de volta
  var prompt = buildLovablePrompt_(found);

  // 3a) atualiza/insere em "settings" a coluna lovable_prompt
  var sh = ss.getSheetByName("settings");
  if (!sh) {
    sh = ss.insertSheet("settings");
    sh.appendRow(["timestamp","siteSlug","email","whatsapp","empresa","endereco","historia","produtos","fundacao","palette_id","palette_name","colors_json","template_id","template_name","logo_url","fotos_urls_json","drive_folder_url","plano","lovable_prompt"]);
  }
  var last = sh.getLastRow();
  var hdr  = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var iSiteS = hdr.indexOf("siteSlug");
  var rowFound = 0;
  if (iSiteS !== -1 && last >= 2) {
    var vals = sh.getRange(2, iSiteS+1, last-1, 1).getValues();
    for (var i=0;i<vals.length;i++){ if (String(vals[i][0]||"").trim().toUpperCase() === site) { rowFound = i+2; break; } }
  }
  var iPrompt = hdr.indexOf("lovable_prompt");
  if (iPrompt === -1) {
    sh.getRange(1, sh.getLastColumn()+1).setValue("lovable_prompt");
    // refresh header depois de inserir a coluna:
    hdr = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    iPrompt = hdr.indexOf("lovable_prompt");
  }
  var rowToWrite = rowFound;
  if (!rowFound) {
    sh.insertRowsAfter(last || 1, 1);
    rowToWrite = (last || 1) + 1;
  }
  // garante siteSlug e timestamp
  if (iSiteS !== -1) sh.getRange(rowToWrite, iSiteS+1).setValue(site);
  sh.getRange(rowToWrite, 1).setValue(new Date()); // timestamp na 1ª coluna
  // grava prompt
  sh.getRange(rowToWrite, iPrompt+1).setValue(prompt);

  return jsonOut_({ ok:true, siteSlug: site, lovable_prompt: prompt });
}

function handleSaveOnboarding_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.siteSlug || data.site || ""));
    if (!site) return jsonOut_({ ok:false, error:"missing_site" });

    var email      = String(data.email || "").trim().toLowerCase();
    var whatsapp   = String(data.whatsapp || data.phone || "").trim();
    var empresa    = String(data.empresa || data.company || "").trim();
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

    var historia   = String(data.historia || data.about || "");
    var produtos   = String(data.produtos || "").trim();
    var fundacao   = String(data.fundacao || "");

    var paletteId  = String(data.paletteId || data.paleta || "").toLowerCase();
    var templateId = String(data.templateId || data.template || "").toLowerCase();

    var paleta     = paletteMap_(paletteId);
    var template   = templateMap_(templateId);

    var folderUrl = String(data.drive_folder_url || data.driveFolderUrl || "") || ensureClientFolderUrl_(site);
    if (!folderUrl) return jsonOut_({ ok:false, error:"no_drive_folder" });

    var logoUrl    = String(data.logoUrl || "");
    var fotosUrls  = [];
    try {
      if (Array.isArray(data.fotosUrls)) fotosUrls = data.fotosUrls;
      else if (typeof data.fotosUrls === "string" && data.fotosUrls.trim()) {
        fotosUrls = data.fotosUrls.split(",").map(function(s){ return s.trim(); }).filter(Boolean);
      }
    } catch (_) {}

    var plano = String(data.plano || data.plan || "").toLowerCase(); // "vip" | "essential"

    // ===== DETECÇÃO AUTOMÁTICA DE TIPO DE NEGÓCIO =====
    var businessDetection = detectBusinessType({
      empresa: empresa,
      historia: historia,
      produtos: produtos,
      endereco: endereco
    });

    var businessCategory = businessDetection.category;

    // ===== CRIAÇÃO AUTOMÁTICA DA ESTRUTURA DO SITE =====
    var siteStructure = createSiteStructureByType(site, businessCategory, {
      empresa: empresa,
      email: email,
      whatsapp: whatsapp,
      endereco: endereco,
      historia: historia,
      produtos: produtos
    });

    // ===== SALVAR ESTRUTURA NA PLANILHA site_structure =====
    try {
      var result = save_site_structure(site, siteStructure);
      if (!result.ok) {
        log_(ss, 'site_structure_save_fail', { error: result.error, site: site });
      } else {
        log_(ss, 'site_structure_created', { site: site, category: businessCategory, confidence: businessDetection.confidence });
      }
    } catch (e) {
      log_(ss, 'site_structure_error', { error: String(e), site: site });
    }

    var settings = {
      identity: { empresa: empresa, slug: site, whatsapp: whatsapp, email: email, endereco: endereco },
      content:  { historia: historia, produtos: produtos, fundacao: fundacao },
      visual:   {
        paletteId: paletteId, paletteName: paleta.name, colors: paleta.colors,
        templateId: templateId, templateName: template.name
      },
      media:    { drive_folder_url: folderUrl, logoUrl: logoUrl, fotosUrls: fotosUrls },
      plan:     { plano: plano },
      business: { category: businessCategory, detection: businessDetection }
    };

    // Prompt completo e padronizado (inclui tipo de negócio detectado)
    var lovablePrompt = buildLovablePrompt_({
      plan: plano,
      email: email,
      siteSlug: site,
      logoUrl: logoUrl,
      fotosUrl: (fotosUrls && fotosUrls[0]) || "",
      historia: historia,
      produtos: produtos,
      fundacao: fundacao,
      paleta: paletteId,
      template: templateId
    });

    var sh = ss.getSheetByName("settings");
    if (!sh) {
      sh = ss.insertSheet("settings");
      sh.appendRow(["timestamp","siteSlug","email","whatsapp","empresa","endereco","historia","produtos","fundacao","palette_id","palette_name","colors_json","template_id","template_name","logo_url","fotos_urls_json","drive_folder_url","plano","lovable_prompt"]);
    }

    // upsert por siteSlug
    var last = sh.getLastRow();
    var header = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String).map(function(s){return s.trim();});
    var siteCol = header.indexOf("siteSlug")+1;
    var rowFound = 0;
    if (siteCol > 0 && last >= 2) {
      var values = sh.getRange(2, siteCol, last-1, 1).getValues();
      for (var i=0;i<values.length;i++){ if (String(values[i][0]) === site) { rowFound = i+2; break; } }
    }
    var row = [
      new Date(), site, email, whatsapp, empresa, endereco,
      historia, produtos, fundacao,
      paletteId, paleta.name, JSON.stringify(paleta.colors || []),
      templateId, template.name,
      logoUrl, JSON.stringify(fotosUrls || []),
      folderUrl, plano,
      lovablePrompt
    ];
    if (rowFound) sh.getRange(rowFound, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);

    // garante usuário/relacionamento
    try {
      upsertCadastroAndUser_(ss, { site: site, email: email, whatsapp: whatsapp, plano: (plano || 'essential') });
    } catch (e) { log_(ss, 'onboarding_user_create_fail', { error: String(e), site: site, email: email }); }

    return jsonOut_({ ok:true, siteSlug: site, driveFolderUrl: folderUrl });
  } catch (err) {
    return jsonOut_({ ok:false, error:String(err && err.message || err) });
  }
}

/** ============================= FUNÇÕES DE VALIDAÇÃO E HELPERS ============================= */

function ensureUserRow_(email, siteSlug) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return;
  var ss = openSS_();
  var sh = ss.getSheetByName('usuarios') || ss.insertSheet('usuarios');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['email','siteSlug','role','password_hash','salt','last_login','reset_token','reset_expires','plan','billing_status','billing_next','billing_amount','billing_currency','billing_provider']);
  } else {
    ensureBillingColumns_(sh);
  }
  var last = sh.getLastRow();
  var vals = last > 1 ? sh.getRange(2,1,last-1,1).getValues() : [];
  for (var i=0;i<vals.length;i++){
    if (String(vals[i][0]||'').toLowerCase() === email) return;
  }
  sh.appendRow([ email, siteSlug || '', 'client', '', '', '', '', '', '', '', '', '', '', '' ]);
}

function ensureUsuariosSheet_(ss) {
  var sh = ss.getSheetByName('usuarios'); if (!sh) sh = ss.insertSheet('usuarios');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['email','siteSlug','role','password_hash','salt','last_login','reset_token','reset_expires','plan','billing_status','billing_next','billing_amount','billing_currency','billing_provider']);
  } else {
    ensureBillingColumns_(sh);
  }
  return sh;
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

    var data = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
    for (var i=0;i<data.length;i++) {
      var rowEmail = String(data[i][idxEmail]||'').trim().toLowerCase();
      var rowSite  = normalizeSlug_(String(data[i][idxSite]||''));
      if (rowEmail === emailLc && (!siteSlug || rowSite === siteSlug)) {
        return String(data[i][idxPlan]||'');
      }
    }
    return '';
  } catch (e) {
    return '';
  }
}

function makeSalt_() {
  return Utilities.getUuid();
}

function sha256Hex_(txt) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8));
}

function bytesToHex_(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var byte = bytes[i];
    if (byte < 0) byte += 256;
    var h = byte.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

function normalizeSlug_(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function onlyDigits_(v) { return String(v || '').replace(/\D+/g, ''); }

function isValidCPF_(cpf) {
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  var sum = 0, remainder;
  for (var i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (var i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function getOrCreateSub_(root, name) {
  try {
    var existing = root.getFoldersByName(name);
    return existing.hasNext() ? existing.next() : root.createFolder(name);
  } catch (e) {
    console.error("Error in getOrCreateSub_:", e);
    return null;
  }
}

function slugExiste_(slug) {
  try {
    var ss = openSS_();
    var sh = ss.getSheetByName('cadastros');
    if (!sh) return false;

    var last = sh.getLastRow();
    if (last < 2) return false;

    var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    var idx = headers.indexOf('siteSlug');
    if (idx === -1) return false;

    var values = sh.getRange(2, idx+1, last-1, 1).getValues();
    for (var i=0; i<values.length; i++) {
      if (normalizeSlug_(String(values[i][0] || '')) === slug) return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureLogSheet_(ss) {
  var sh = ss.getSheetByName('logs');
  if (!sh) sh = ss.insertSheet('logs');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['timestamp','stage','site','email','plan','error','type','slug','params','result','details']);
  }
  return sh;
}

function log_(ss, stage, obj) {
  try {
    var sh = ensureLogSheet_(ss);
    sh.appendRow([
      new Date(),
      String(stage || ''),
      String(obj && obj.site || ''),
      String(obj && obj.email || ''),
      String(obj && obj.plan || ''),
      String(obj && obj.error || ''),
      String(obj && obj.type || ''),
      String(obj && obj.slug || ''),
      String(obj && obj.params || ''),
      String(obj && obj.result || ''),
      String(obj && obj.details || '')
    ]);
  } catch (logErr) {
    console.error('Log error:', logErr);
  }
}

function safeJson_(o) {
  try { return JSON.stringify(o || {}); } catch (e) { return String(o); }
}

function upsertCadastroAndUser_(ss, data) {
  try {
    var site = String(data.site || '');
    var email = String(data.email || '').trim().toLowerCase();
    var whatsapp = String(data.whatsapp || '');
    var plano = String(data.plano || 'essential');

    if (!site || !email) return;

    // 1) Upsert em 'cadastros'
    var shCad = ss.getSheetByName('cadastros');
    if (!shCad) {
      shCad = ss.insertSheet('cadastros');
      shCad.appendRow(['timestamp','fullName','document','email','phone','company','siteSlug','plan','brand','order','preapproval_id','status','manual_block','updated_at']);
    }

    var headersCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0].map(String);
    var idxEmailCad = headersCad.indexOf('email');
    var idxSiteCad = headersCad.indexOf('siteSlug');
    var idxPhoneCad = headersCad.indexOf('phone');
    var idxPlanCad = headersCad.indexOf('plan');

    if (idxEmailCad !== -1 && idxSiteCad !== -1) {
      var lastCad = shCad.getLastRow();
      var foundCad = false;

      if (lastCad >= 2) {
        var dataCad = shCad.getRange(2,1,lastCad-1,shCad.getLastColumn()).getValues();
        for (var i=0; i<dataCad.length; i++) {
          var rowEmail = String(dataCad[i][idxEmailCad] || '').trim().toLowerCase();
          var rowSite = normalizeSlug_(String(dataCad[i][idxSiteCad] || ''));

          if (rowEmail === email && rowSite === site) {
            // Atualiza linha existente
            if (idxPhoneCad !== -1) shCad.getRange(i+2, idxPhoneCad+1).setValue(whatsapp);
            if (idxPlanCad !== -1) shCad.getRange(i+2, idxPlanCad+1).setValue(plano);
            foundCad = true;
            break;
          }
        }
      }

      if (!foundCad) {
        // Cria nova linha
        var newRow = new Array(shCad.getLastColumn()).fill('');
        newRow[0] = new Date(); // timestamp
        newRow[idxEmailCad] = email;
        newRow[idxSiteCad] = site;
        if (idxPhoneCad !== -1) newRow[idxPhoneCad] = whatsapp;
        if (idxPlanCad !== -1) newRow[idxPlanCad] = plano;
        shCad.appendRow(newRow);
      }
    }

    // 2) Upsert em 'usuarios'
    var shUser = ensureUsuariosSheet_(ss);
    var headersUser = shUser.getRange(1,1,1,shUser.getLastColumn()).getValues()[0].map(String);
    var idxEmailUser = headersUser.indexOf('email');
    var idxSiteUser = headersUser.indexOf('siteSlug');
    var idxPlanUser = headersUser.indexOf('plan');

    if (idxEmailUser !== -1) {
      var lastUser = shUser.getLastRow();
      var foundUser = false;

      if (lastUser >= 2) {
        var dataUser = shUser.getRange(2,1,lastUser-1,shUser.getLastColumn()).getValues();
        for (var j=0; j<dataUser.length; j++) {
          var userEmail = String(dataUser[j][idxEmailUser] || '').trim().toLowerCase();

          if (userEmail === email) {
            // Atualiza linha existente
            if (idxSiteUser !== -1) shUser.getRange(j+2, idxSiteUser+1).setValue(site);
            if (idxPlanUser !== -1) shUser.getRange(j+2, idxPlanUser+1).setValue(plano);
            foundUser = true;
            break;
          }
        }
      }

      if (!foundUser) {
        // Cria nova linha
        var newUserRow = new Array(shUser.getLastColumn()).fill('');
        newUserRow[idxEmailUser] = email;
        if (idxSiteUser !== -1) newUserRow[idxSiteUser] = site;
        newUserRow[2] = 'client'; // role
        if (idxPlanUser !== -1) newUserRow[idxPlanUser] = plano;
        shUser.appendRow(newUserRow);
      }
    }

  } catch (e) {
    console.error('Error in upsertCadastroAndUser_:', e);
  }
}

/** ============================= FUNÇÕES DE BILLING E PAGAMENTOS ============================= */

const GRACE_DAYS = 3;
const RENEWAL_INTERVAL_DAYS = 30;
const AUTO_BLOCK_OVER_GRACE = true;

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

function isActiveStatus_(s) {
  s = String(s || '').toLowerCase();
  return s === 'approved' || s === 'authorized' || s === 'accredited' ||
         s === 'recurring_charges' || s === 'active';
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

  var plan = String(sh.getRange(row, map.plan+1).getValue() || '');
  if (!plan) {
    var site = String(sh.getRange(row, map.siteSlug+1).getValue() || '').trim().toUpperCase();
    var planFromCad = getPlanForUser_(ss, email, site);
    if (planFromCad) { 
      plan = planFromCad; 
      sh.getRange(row, map.plan+1).setValue(plan); 
    }
  }

  var status   = String(sh.getRange(row, map.billing_status+1).getValue() || '') || '';
  var next     = sh.getRange(row, map.billing_next+1).getValue();
  var amount   = Number(sh.getRange(row, map.billing_amount+1).getValue() || 0) || 0;
  var currency = String(sh.getRange(row, map.billing_currency+1).getValue() || '') || 'BRL';
  var provider = String(sh.getRange(row, map.billing_provider+1).getValue() || '') || 'mercadopago';
  var siteSlug = String(sh.getRange(row, map.siteSlug+1).getValue() || '').trim().toUpperCase();

  var statusLower = String(status).toLowerCase();
  var isActive = isActiveStatus_(statusLower);

  if (!isActive) {
    var s = siteSlug ? getStatusForSite_(siteSlug) : { ok:false };
    if (s && s.ok && s.status) {
      statusLower = String(s.status).toLowerCase();
      isActive = isActiveStatus_(statusLower);
    }
  }

  if (!isActive) {
    var lastApprovedByMail = getLastApprovedPaymentDateForEmail_(ss, email);
    if (lastApprovedByMail) {
      statusLower = 'approved';
      isActive = true;
      if (!next) {
        var dNext = addDays_(clampToMidnight_(lastApprovedByMail), RENEWAL_INTERVAL_DAYS);
        sh.getRange(row, map.billing_next+1).setValue(dNext);
        next = dNext;
      }
    }
  }

  if (statusLower && statusLower !== String(status).toLowerCase()) {
    sh.getRange(row, map.billing_status+1).setValue(statusLower);
  }

  if (!next) {
    var d = new Date(Date.now() + 1000*60*60*24*30);
    sh.getRange(row, map.billing_next+1).setValue(d);
    next = d;
  }

  if (amount === 0) {
    amount = String(plan).toLowerCase().indexOf('vip') !== -1 ? 99.9 : 39.9;
    sh.getRange(row, map.billing_amount+1).setValue(amount);
  }

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

function getLastApprovedPaymentDateForEmail_(ss, email) {
  var sh = ss.getSheetByName("dados"); 
  if (!sh) return null;
  var last = sh.getLastRow(); 
  if (last < 2) return null;

  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var iTs   = h.indexOf("timestamp");
  var iMail = h.indexOf("payer_email");
  var iStat = h.indexOf("status");
  if (iTs === -1 || iMail === -1 || iStat === -1) return null;

  var rows = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  var latest = null;
  for (var r = rows.length - 1; r >= 0; r--) {
    var e = String(rows[r][iMail] || "").trim().toLowerCase();
    if (!e || e !== email) continue;
    var st = String(rows[r][iStat] || "").toLowerCase();
    if (!isActiveStatus_(st)) continue;
    var ts = rows[r][iTs] ? new Date(rows[r][iTs]) : null;
    if (ts && (!latest || ts.getTime() > latest.getTime())) latest = ts;
  }
  return latest;
}

function teamEmail_() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('TEAM_EMAIL') || 'matheusmartinss@icloud.com';
}

function dashUrl_() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty('DASH_URL') || 'https://eleveaagencia.netlify.app/dashboard';
}

function sendWelcomeEmailWithPassword_(toEmail, site, tempPassword, dashUrl) {
  if (!toEmail) return;
  var subj = "[Elevea] Acesso ao seu painel";
  var body =
    "<p>Olá!</p>" +
    "<p>Seu painel do site <b>"+(site||'(sem slug)')+"</b> está pronto.</p>" +
    "<p><b>Endereço do painel:</b> <a href=\""+dashUrl+"\">"+dashUrl+"</a></p>" +
    "<p><b>Login:</b> "+toEmail+"<br>" +
    "<b>Senha provisória:</b> "+tempPassword+"</p>" +
    "<p>Recomendamos alterar a senha no primeiro acesso.</p>";
  MailApp.sendEmail({ to: toEmail, subject: subj, htmlBody: body, cc: teamEmail_() });
}

function sendWelcomeEmailWithReset_(toEmail, site, dashUrl, token) {
  if (!toEmail) return;
  var resetLink = dashUrl.replace(/\/+$/,"") + "/reset?email="+encodeURIComponent(toEmail)+"&token="+encodeURIComponent(token||'');
  var subj = "[Elevea] Acesso ao seu painel";
  var body =
    "<p>Olá!</p>" +
    "<p>Seu painel do site <b>"+(site||'(sem slug)')+"</b> está pronto.</p>" +
    "<p><b>Endereço do painel:</b> <a href=\""+dashUrl+"\">"+dashUrl+"</a></p>" +
    "<p>Para definir sua senha, clique: <a href=\""+resetLink+"\">Criar/Redefinir senha</a>.</p>";
  MailApp.sendEmail({ to: toEmail, subject: subj, htmlBody: body, cc: teamEmail_() });
}

function sendBillingEmailWarn_(toEmail, siteSlug, nextDate, daysOverdue) {
  if (!toEmail) return;
  var subj = "[Elevea] Renovação pendente do seu site";
  var body =
    "<p>Olá!</p>" +
    "<p>Detectamos que a renovação da sua assinatura do site <b>"+(siteSlug||"(sem slug)")+"</b> está pendente.</p>" +
    "<p>Data prevista: <b>"+(nextDate ? Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy") : "(não definida)")+"</b>.</p>" +
    "<p>Você tem uma margem de <b>"+GRACE_DAYS+" dias</b>. Após isso, a assinatura é cancelada automaticamente.</p>" +
    "<p>Se precisar de ajuda, responda este e-mail.</p>";
  MailApp.sendEmail({ to: toEmail, cc: teamEmail_(), subject: subj, htmlBody: body });
}

function sendBillingEmailCancelled_(toEmail, siteSlug, nextDate, daysOverdue) {
  if (!toEmail) return;
  var subj = "[Elevea] Assinatura cancelada por falta de renovação";
  var body =
    "<p>Olá!</p>" +
    "<p>Sua assinatura do site <b>"+(siteSlug||"(sem slug)")+"</b> foi <b>cancelada</b> por não constarmos o pagamento após a margem de "+GRACE_DAYS+" dias.</p>" +
    "<p>Data prevista da renovação: <b>"+(nextDate ? Utilities.formatDate(nextDate, Session.getScriptTimeZone(), "dd/MM/yyyy") : "(não definida)")+"</b>.</p>" +
    "<p>Podemos reativar rapidamente assim que regularizar. Fale conosco respondendo este e-mail.</p>";
  MailApp.sendEmail({ to: toEmail, cc: teamEmail_(), subject: subj, htmlBody: body });
}

/** ============================= FUNÇÕES DE FEEDBACKS ============================= */

function ensureFeedbacksSheet_() {
  var ss = openSS_();
  var sh = ss.getSheetByName("feedbacks");
  if (!sh) sh = ss.insertSheet("feedbacks");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["id","timestamp","siteSlug","name","rating","comment","email","phone","approved"]);
  }
  return sh;
}

function getVipPinForSite_(site) {
  site = normalizeSlug_(site);
  var shKV = ensureSettingsKVSheet_();
  var last = shKV.getLastRow();
  if (last < 2) return "";
  var vals = shKV.getRange(2,1,last-1,3).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]||"").trim().toUpperCase() === site) {
      try {
        var obj = JSON.parse(String(vals[i][2] || "{}"));
        return String((obj.security && obj.security.vip_pin) || "");
      } catch(_) { return ""; }
    }
  }
  return "";
}

function feedbackSetApproval_(ss, data) {
  var site = normalizeSlug_(String(data.site || data.siteSlug || ""));
  var id   = String(data.id || "");
  var approved = String(data.approved).toLowerCase() === "true";
  if (!site || !id) return jsonOut_({ ok:false, error:"missing_params" });

  var pin = String(data.pin || data.vipPin || "").trim();
  var saved = getVipPinForSite_(site);
  if (saved && pin !== saved) return jsonOut_({ ok:false, error:"unauthorized" });

  var sh = ensureFeedbacksSheet_();
  var last = sh.getLastRow(); if (last < 2) return jsonOut_({ ok:false, error:"empty" });

  var vals = sh.getRange(2,1,last-1,9).getValues();
  for (var i=0;i<vals.length;i++){
    if (String(vals[i][0]||"") === id && String(vals[i][2]||"").trim().toUpperCase() === site) {
      sh.getRange(i+2, 9).setValue(approved ? "TRUE" : "");
      return jsonOut_({ ok:true });
    }
  }
  return jsonOut_({ ok:false, error:"not_found" });
}

function listFeedbacks_(slug, page, pageSize, options) {
  try {
    const ss = openSS_();
    const shFeedbacks = ss.getSheetByName("feedbacks");
    if (!shFeedbacks) return { ok: false, error: "missing_sheet_feedbacks" };

    const data = shFeedbacks.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idxSite = headers.indexOf("siteSlug");
    const idxName = headers.indexOf("name");
    const idxRating = headers.indexOf("rating");
    const idxComment = headers.indexOf("comment");
    const idxApproved = headers.indexOf("approved");
    const idxTs = headers.indexOf("created_at");

    if (idxSite === -1) return { ok: false, error: "missing_siteSlug_header" };

    let siteFeedbacks = data.slice(1)
      .filter(row => normalizeSlug_(String(row[idxSite] || "")) === slug);

    if (options && options.public) {
      siteFeedbacks = siteFeedbacks.filter(row => 
        String(row[idxApproved] || "").toLowerCase() === "true"
      );
    }

    siteFeedbacks = siteFeedbacks.map(row => ({
      name: String(row[idxName] || ""),
      rating: parseInt(row[idxRating] || "0"),
      comment: String(row[idxComment] || ""),
      approved: String(row[idxApproved] || "").toLowerCase() === "true",
      ts: String(row[idxTs] || new Date().toISOString())
    }))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = siteFeedbacks.slice(start, end);

    return {
      ok: true,
      items: items,
      total: siteFeedbacks.length,
      page: page,
      pageSize: pageSize
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function listFeedbacksPublic_(site, page, pageSize) {
  try {
    site = normalizeSlug_(site);
    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.max(1, Math.min(200, parseInt(pageSize, 10) || 20));

    var sh = ensureFeedbacksSheet_();
    var last = sh.getLastRow(); 
    if (last < 2) return { ok:true, page:1, pageSize:pageSize, total:0, items:[] };

    var vals = sh.getRange(2,1,last-1,9).getValues().filter(function(r){
      return String(r[2]||"").trim().toUpperCase() === site && String(r[8]||"").toUpperCase() === "TRUE";
    });

    var total = vals.length;
    var start = Math.min((page-1) * pageSize, Math.max(0, total - 1));
    var slice = vals.slice(start, start + pageSize).map(function(r){
      return {
        id: String(r[0]||""),
        ts: r[1] ? new Date(r[1]).toISOString() : "",
        name: String(r[3]||""),
        rating: Number(r[4]||0) || 0,
        comment: String(r[5]||""),
        approved: true
      };
    });

    return { ok:true, page:page, pageSize:pageSize, total: total, items: slice };
  } catch (e) { 
    return { ok:false, error:String(e) }; 
  }
}

function listFeedbacksSecure_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.site || data.siteSlug || ''));
    if (!site) return jsonOut_({ ok:false, error:'missing_site' });
    var page = Math.max(1, parseInt(data.page,10) || 1);
    var pageSize = Math.max(1, Math.min(200, parseInt(data.pageSize,10) || 20));

    var props = PropertiesService.getScriptProperties();
    var ADMIN = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';
    var pinOk = false;
    if (ADMIN && String(data.adminToken||'') === ADMIN) {
      pinOk = true;
    } else {
      var pin = String(data.pin || data.vipPin || '');
      var saved = getVipPinForSite_(site);
      if (saved && pin && pin === saved) pinOk = true;
    }

    if (pinOk) {
      var all = listFeedbacks_(site, page, pageSize);
      return jsonOut_(all);
    } else {
      var pub = listFeedbacksPublic_(site, page, pageSize);
      return jsonOut_(pub);
    }
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

/** ============================= FUNÇÕES DE LEADS ============================= */

function ensureLeadsSheet_() {
  var ss = openSS_();
  var sh = ss.getSheetByName("leads");
  if (!sh) sh = ss.insertSheet("leads");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["timestamp","siteSlug","name","email","phone","source"]);
  }
  return sh;
}

function listLeads_(site, page, pageSize) {
  try {
    site = normalizeSlug_(site);
    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.max(1, Math.min(200, parseInt(pageSize, 10) || 20));

    var sh = ensureLeadsSheet_();
    var last = sh.getLastRow(); 
    if (last < 2) return { ok:true, page:1, pageSize:pageSize, total:0, items:[] };

    var vals = sh.getRange(2,1,last-1,6).getValues().filter(function(r){
      return String(r[1]||"").trim().toUpperCase() === site;
    });

    var total = vals.length;
    var start = Math.min((page-1) * pageSize, Math.max(0, total - 1));
    var slice = vals.slice(start, start + pageSize).map(function(r){
      return {
        ts: r[0] ? new Date(r[0]).toISOString() : "",
        name: String(r[2]||""),
        email: String(r[3]||""),
        phone: String(r[4]||""),
        source: String(r[5]||""),
      };
    });

    return { ok:true, page:page, pageSize:pageSize, total: total, items: slice };
  } catch (e) { 
    return { ok:false, error:String(e) }; 
  }
}

/** ============================= FUNÇÕES DE TRAFFIC ============================= */

function ensureTrafficSheet_() {
  var ss = openSS_();
  var sh = ss.getSheetByName("traffic");
  if (!sh) sh = ss.insertSheet("traffic");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["timestamp","siteSlug","path","ip","userAgent"]);
  }
  return sh;
}

function recordHit_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.site || ""));
    if (!site) return jsonOut_({ ok:false, error:"missing_site" });

    var path = String(data.path || "/").trim();
    if (path === "") path = "/";
    if (path[0] !== "/") path = "/" + path;

    var ip = String(data.ip || "");
    var ua = String(data.userAgent || "");

    var sh = ensureTrafficSheet_();
    sh.appendRow([ new Date(), site, path, ip, ua ]);
    return jsonOut_({ ok:true });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function getTraffic_(slug, range) {
  try {
    const ss = openSS_();
    const shTraffic = ss.getSheetByName("traffic");
    if (!shTraffic) return { ok: false, error: "missing_sheet_traffic" };

    const data = shTraffic.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const idxSite = headers.indexOf("siteSlug");
    const idxDay = headers.indexOf("day");
    const idxHits = headers.indexOf("hits");

    if (idxSite === -1) return { ok: false, error: "missing_siteSlug_header" };

    const siteTraffic = data.slice(1)
      .filter(row => normalizeSlug_(String(row[idxSite] || "")) === slug)
      .map(row => ({
        day: String(row[idxDay] || ""),
        hits: parseInt(row[idxHits] || "0")
      }))
      .sort((a, b) => new Date(a.day) - new Date(b.day));

    return {
      ok: true,
      daily: siteTraffic,
      total: siteTraffic.reduce((sum, item) => sum + item.hits, 0)
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** ============================= FUNÇÕES DE NOTIFICAÇÕES ============================= */

function notifySiteToggle_(siteSlug, enable) {
  try {
    var msg = enable ? 
      "Site " + siteSlug + " foi reativado automaticamente" :
      "Site " + siteSlug + " foi desabilitado automaticamente";
    console.log(msg);
  } catch (e) {
    console.error("Error in notifySiteToggle_:", e);
  }
}

/** ============================= FUNÇÕES DE CONFIGURAÇÕES MASTER ============================= */

function criarContasMaster() {
  try {
    console.log('🚀 Iniciando criação das contas master...');

    const props = PropertiesService.getScriptProperties();
    const ADMIN_TOKEN = props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '';

    if (!ADMIN_TOKEN) {
      console.error('❌ ADMIN_DASH_TOKEN não encontrado!');
      console.log('Configure o ADMIN_DASH_TOKEN nas Script Properties primeiro.');
      return { error: 'ADMIN_DASH_TOKEN não encontrado' };
    }

    console.log('✅ ADMIN_TOKEN encontrado');

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    console.log('👤 Criando cliente master...');
    const clienteResult = criarUsuarioDireto_(ss, {
      email: 'cliente@elevea.com',
      role: 'client',
      siteSlug: 'DEMO-SITE',
      password: 'cliente123'
    });
    console.log('Cliente criado:', clienteResult);

    console.log('👨‍💼 Criando admin master...');
    const adminResult = criarUsuarioDireto_(ss, {
      email: 'admin@elevea.com',
      role: 'admin',
      siteSlug: 'ADMIN',
      password: 'admin123'
    });
    console.log('Admin criado:', adminResult);

    console.log('🎉 Contas master criadas com sucesso!');
    console.log('📧 Cliente: cliente@elevea.com / cliente123');
    console.log('📧 Admin: admin@elevea.com / admin123');

    return {
      success: true,
      message: 'Contas master criadas!',
      cliente: clienteResult,
      admin: adminResult
    };

  } catch (error) {
    console.error('❌ Erro:', error);
    return { error: error.toString() };
  }
}

function criarUsuarioDireto_(ss, userData) {
  try {
    const { email, role, siteSlug, password } = userData;

    let sh = ss.getSheetByName('usuarios');
    if (!sh) {
      sh = ss.insertSheet('usuarios');
      sh.appendRow(['email','siteSlug','role','password_hash','salt','last_login','reset_token','reset_expires','plan','billing_status','billing_next','billing_amount','billing_currency','billing_provider']);
    }

    const data = sh.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());
    const emailCol = headers.indexOf('email');

    if (emailCol !== -1) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][emailCol] || '').trim().toLowerCase() === email.toLowerCase()) {
          console.log(`Usuário ${email} já existe, atualizando...`);
          const row = i + 1;
          const salt = makeSalt_();
          const hash = sha256Hex_(salt + password);

          sh.getRange(row, 2).setValue(siteSlug);
          sh.getRange(row, 3).setValue(role);
          sh.getRange(row, 4).setValue(hash);
          sh.getRange(row, 5).setValue(salt);

          return { ok: true, email, role, siteSlug, updated: true };
        }
      }
    }

    const salt = makeSalt_();
    const hash = sha256Hex_(salt + password);

    sh.appendRow([
      email, siteSlug, role, hash, salt, '', '', '', '', '', '', '', '', ''
    ]);

    return { ok: true, email, role, siteSlug, created: true };

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return { ok: false, error: error.toString() };
  }
}

function verificarContas() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName('usuarios');

    if (!sh) {
      console.log('❌ Aba usuarios não encontrada');
      return;
    }

    const data = sh.getDataRange().getValues();
    console.log('📋 Usuários cadastrados:');

    data.forEach((row, index) => {
      if (index === 0) return;
      const email = row[0];
      const siteSlug = row[1];
      const role = row[2];
      console.log(`${index}. ${email} (${role}) - Site: ${siteSlug}`);
    });

  } catch (error) {
    console.error('Erro ao verificar contas:', error);
  }
}

/** ============================= FUNÇÕES DE ESTRUTURA DE SITE (MELHORADAS) ============================= */

function sectionsUpsertDefs_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.site || data.siteSlug || ""));
    if (!site) return jsonOut_({ ok:false, error: "missing_site" });

    var defs = data.defs;
    if (!Array.isArray(defs) || defs.length === 0) {
      return jsonOut_({ ok:false, error: "missing_or_empty_defs" });
    }

    defs = defs
      .map(function(d){
        var id = String((d && d.id) || "").trim();
        if (!id) return null;
        var out = { id: id };
        if (d.name !== undefined) out.name = String(d.name);
        if (d.fields && typeof d.fields === "object") out.fields = d.fields;
        if (d.slots  && typeof d.slots  === "object") out.slots  = d.slots;
        return out;
      })
      .filter(Boolean);
    if (!defs.length) return jsonOut_({ ok:false, error: "empty_defs_after_sanitize" });

    var props  = PropertiesService.getScriptProperties();
    var ADMIN  = (props.getProperty('ADMIN_DASH_TOKEN') || props.getProperty('ADMIN_TOKEN') || '').trim();
    var okAuth = false;

    if (ADMIN && String(data.adminToken || "").trim() === ADMIN) okAuth = true;
    if (!okAuth) {
      var pin = String(data.pin || data.vipPin || "").trim();
      var savedPin = getVipPinForSite_(site);
      if (savedPin && pin && pin === savedPin) okAuth = true;
    }
    if (!okAuth) return jsonOut_({ ok:false, error: "unauthorized" });

    var sh = ensureSettingsKVSheet_();
    var last = sh.getLastRow();
    var cur = {};
    if (last >= 2) {
      var vals = sh.getRange(2,1,last-1,3).getValues();
      for (var i = vals.length - 1; i >= 0; i--) {
        if (String(vals[i][0]||"").trim().toUpperCase() === site) {
          try { cur = JSON.parse(String(vals[i][2] || "{}")); } catch(_) { cur = {}; }
          break;
        }
      }
    }

    cur = cur || {};
    cur.sections = cur.sections || {};
    var dataOld = cur.sections.data || {};
    cur.sections.defs = defs;
    cur.sections.data = dataOld;

    sh.appendRow([ site, new Date(), JSON.stringify(cur) ]);
    return jsonOut_({ ok:true, siteSlug: site, defs_count: defs.length });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function bootstrapDefaultSections_(site) {
  site = normalizeSlug_(site);
  var ss = openSS_();
  var sh = ss.getSheetByName("settings");
  if (!sh) return { bootstrapped: 0 };

  var last = sh.getLastRow();
  if (last < 2) return { bootstrapped: 0 };

  var vals = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  var latest = null;
  for (var i = vals.length - 1; i >= 0; i--) {
    var siteLower = String(vals[i][0]||"").trim().toUpperCase();
    if (siteLower === site) {
      latest = vals[i];
      break;
    }
  }
  if (!latest) return { bootstrapped: 0 };

  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var headers = {};
  for (var j=0; j<h.length; j++) {
    headers[String(h[j]||"")] = j;
  }

  function getVal(name) { return (headers[name] !== undefined) ? String(latest[headers[name]]||"") : ""; }

  var o = {
    businessName: getVal("businessName"),
    businessCategory: getVal("businessCategory"),
    businessDescription: getVal("businessDescription"),
    businessType: getVal("businessType"),
    email: getVal("email"),
    whatsapp: getVal("whatsapp"),
    endereco: {
      rua: getVal("address"),
      cidade: getVal("city"),
      estado: getVal("state"),
      cep: getVal("cep")
    }
  };

  function or(v,def){ return v && String(v).trim() ? String(v).trim() : def; }
  function fullAddress(end) {
    if (!end || typeof end !== "object") return "";
    var parts = [
      or(end.rua,""),
      or(end.cidade,""),
      or(end.estado,""),
      or(end.cep,"")
    ].filter(Boolean);
    return parts.join(", ");
  }
  function gmapsLink(end) {
    var addr = fullAddress(end);
    return addr ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr) : "";
  }

  var ids = ["hero","sobre","contato","servicos","portfolio","depoimentos"];
  var data = {};

  ids.forEach(function(id){
    if (id === "hero") {
      data[id] = {
        fields:{
          title: or(o.businessName,"Sua Empresa"),
          subtitle: or(o.businessDescription,"Oferecemos as melhores soluções"),
          cta_text: "Entre em contato",
          cta_link: "#contato",
          background_image: "",
          show_cta: true
        },
        slots:{}
      };
    }
    if (id === "sobre") {
      data[id] = {
        fields:{
          title: "Sobre nós",
          description: or(o.businessDescription,"Empresa líder no mercado"),
          image: "",
          years_experience: "5",
          mission: "Nossa missão é oferecer excelência",
          vision: "Ser referência no setor",
          values: "Qualidade, Integridade, Inovação"
        },
        slots:{}
      };
    }
    if (id === "servicos") {
      data[id] = { fields:{ title:"Nossos Serviços", description:"Confira nossos principais serviços" }, slots:{} };
    }
    if (id === "portfolio") {
      data[id] = { fields:{ title:"Portfólio", description:"Veja alguns de nossos trabalhos" }, slots:{} };
    }
    if (id === "depoimentos") {
      data[id] = { fields:{ }, slots:{} };
    }
    if (id === "contato") {
      data[id] = {
        fields:{
          email: or(o.email,""),
          whatsapp: or(o.whatsapp,""),
          address: fullAddress(o.endereco),
          maps_url: gmapsLink(o.endereco),
          instagram: "",
          facebook: "",
          tiktok: ""
        },
        slots:{}
      };
    }
    if (!data[id]) data[id] = { fields:{}, slots:{} };
  });

  mergeSettingsKV_(site, { sections: { data: data } });

  return { bootstrapped: Object.keys(data).length };
}

/** ============================= FUNÇÕES UTILITÁRIAS FINAIS ============================= */

function emailAvailableForOnboarding_(ss, email, site) {
  site = normalizeSlug_(site);
  email = String(email||"").trim().toLowerCase();

  var shS = ss.getSheetByName("settings");
  if (shS) {
    var lastS = shS.getLastRow();
    if (lastS >= 2) {
      var hS = shS.getRange(1,1,1,shS.getLastColumn()).getValues()[0].map(String);
      var iSite = hS.indexOf("siteSlug");
      var iMail = hS.indexOf("email");
      if (iSite !== -1 && iMail !== -1) {
        var vals = shS.getRange(2,1,lastS-1,shS.getLastColumn()).getValues();
        for (var r = 0; r < vals.length; r++) {
          var s = String(vals[r][iSite]||"").trim().toUpperCase();
          var e = String(vals[r][iMail]||"").trim().toLowerCase();
          if (e && e === email && s && s !== site) return false;
        }
      }
    }
  }
  return true;
}

function hasApprovedEventForIds_(ss, mpid, pre) {
  var sh = ss.getSheetByName("dados"); if (!sh) return false;
  var last = sh.getLastRow(); if (last < 2) return false;

  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var iMp   = h.indexOf("mp_id");
  var iPre  = h.indexOf("preapproval_id");
  var iStat = h.indexOf("status");
  if (iMp === -1 || iPre === -1 || iStat === -1) return false;

  var rows = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  for (var r = rows.length - 1; r >= 0; r--) {
    var row = rows[r];
    var mOk = mpid && String(row[iMp]||"") === mpid;
    var pOk = pre  && String(row[iPre]||"") === pre;
    if (mOk || pOk) {
      var st = String(row[iStat]||"").toLowerCase();
      if (isActiveStatus_(st)) return true;
    }
  }
  return false;
}

function emailMatchesEvent_(ss, email, mpid, pre) {
  var sh = ss.getSheetByName("dados"); if (!sh) return false;
  var last = sh.getLastRow(); if (last < 2) return false;

  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var iMp   = h.indexOf("mp_id");
  var iPre  = h.indexOf("preapproval_id");
  var iMail = h.indexOf("payer_email");
  if (iMp === -1 || iPre === -1 || iMail === -1) return false;

  var rows = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  for (var r = rows.length - 1; r >= 0; r--) {
    var row = rows[r];
    var mOk = mpid && String(row[iMp]||"") === mpid;
    var pOk = pre  && String(row[iPre]||"") === pre;
    if (mOk || pOk) {
      var e = String(row[iMail]||"").trim().toLowerCase();
      return e && e === String(email||"").trim().toLowerCase();
    }
  }
  return false;
}

function hasRecentApprovedEventForEmail_(ss, email, maxDays) {
  var sh = ss.getSheetByName("dados"); if (!sh) return false;
  var last = sh.getLastRow(); if (last < 2) return false;

  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var iTs   = h.indexOf("timestamp");
  var iMail = h.indexOf("payer_email");
  var iStat = h.indexOf("status");
  if (iTs === -1 || iMail === -1 || iStat === -1) return false;

  var since = Date.now() - ((parseInt(maxDays,10)||0) * 24 * 60 * 60 * 1000);
  var rows = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  for (var r = rows.length - 1; r >= 0; r--) {
    var row = rows[r];
    var e = String(row[iMail]||"").trim().toLowerCase();
    if (!e || e !== String(email||"").trim().toLowerCase()) continue;

    var st = String(row[iStat]||"").toLowerCase();
    if (!isActiveStatus_(st)) continue;

    var ts = row[iTs] ? new Date(row[iTs]).getTime() : 0;
    if (!since || (ts && ts >= since)) return true;
  }
  return false;
}

function detectBusinessType(businessName, businessDescription, businessCategory) {
  if (businessCategory) return businessCategory;

  var combined = (businessName + " " + businessDescription).toLowerCase();

  if (combined.match(/(medic|doutor|doutora|clinic|psicolog|fisioter|odonto|dent|saude|health)/)) {
    return "health";
  }
  if (combined.match(/(restaur|lanche|pizza|burger|food|comida|coz|gastr)/)) {
    return "food";
  }
  if (combined.match(/(oficina|mecanic|auto|carro|veiculo|motor)/)) {
    return "automotive";
  }
  if (combined.match(/(joia|anel|colar|relogio|ouro|prata|alianca)/)) {
    return "jewelry";
  }
  if (combined.match(/(constru|reforma|obra|pedreiro|engenh|arquitet)/)) {
    return "construction";
  }
  if (combined.match(/(tech|software|site|app|sistem|program|desenvol)/)) {
    return "technology";
  }

  return "general";
}

/** ============================= FUNÇÕES DE CONFIGURAÇÕES E SHEETS ESSENCIAIS ============================= */

function ensureSettingsKVSheet_() {
  var ss = openSS_();
  var sh = ss.getSheetByName("settings_kv");
  if (!sh) sh = ss.insertSheet("settings_kv");
  if (sh.getLastRow() === 0) sh.appendRow(["siteSlug","updated_at","settings_json"]);
  return sh;
}

function getClientSettings_(site) {
  try {
    site = normalizeSlug_(site);
    if (!site) return { ok:false, error:"missing_site" };
    var sh = ensureSettingsKVSheet_();
    var last = sh.getLastRow();
    if (last < 2) return { ok:true, siteSlug: site, settings: {} };
    var vals = sh.getRange(2,1,last-1,3).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      var r = vals[i];
      if (String(r[0]||"").trim().toUpperCase() === site) {
        var json = String(r[2] || "{}");
        var obj = {}; try { obj = JSON.parse(json); } catch(_){}
        if (obj && typeof obj.security==='object' && obj.security && obj.security.vip_pin) {
          obj = JSON.parse(JSON.stringify(obj));
          delete obj.security.vip_pin;
          if (Object.keys(obj.security).length === 0) delete obj.security;
        }
        return { ok:true, siteSlug: site, settings: obj };
      }
    }
    return { ok:true, siteSlug: site, settings: {} };
  } catch (e) {
    return { ok:false, error:String(e) };
  }
}

function saveClientSettings_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.site || ""));
    if (!site) return jsonOut_({ ok:false, error: "missing_site" });

    var settings = data.settings && typeof data.settings === "object" ? data.settings : {};
    var pin = String(data.pin || data.vipPin || "");

    var shKV = ensureSettingsKVSheet_();
    var last = shKV.getLastRow();
    var savedPin = "";
    if (last >= 2) {
      var vals = shKV.getRange(2, 1, last - 1, 3).getValues();
      for (var i = vals.length - 1; i >= 0; i--) {
        if (String(vals[i][0] || "").trim().toUpperCase() === site) {
          try {
            var obj = JSON.parse(String(vals[i][2] || "{}"));
            savedPin = String((obj.security && obj.security.vip_pin) || "");
          } catch (_) {}
          break;
        }
      }
    }

    if (savedPin && (!pin || pin !== savedPin)) {
      return jsonOut_({ ok:false, error: "unauthorized" });
    }

    mergeSettingsKV_(site, settings);
    return jsonOut_({ ok:true });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function mergeSettingsKV_(site, partialObj) {
  site = normalizeSlug_(site);
  var sh = ensureSettingsKVSheet_();
  var last = sh.getLastRow();

  var current = {};
  if (last >= 2) {
    var vals = sh.getRange(2,1,last-1,3).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]||"").trim().toUpperCase() === site) {
        try { current = JSON.parse(String(vals[i][2]||"{}")); } catch(_){}
        break;
      }
    }
  }
  function deepMerge(a,b){
    if (!a || typeof a!=='object') a={};
    if (!b || typeof b!=='object') return a;
    var out = JSON.parse(JSON.stringify(a));
    Object.keys(b).forEach(function(k){
      if (b[k] && typeof b[k]==='object' && !Array.isArray(b[k])) {
        out[k] = deepMerge(out[k]||{}, b[k]);
      } else {
        out[k] = b[k];
      }
    });
    return out;
  }
  var merged = deepMerge(current, partialObj);
  sh.appendRow([ site, new Date(), JSON.stringify(merged) ]);
}

function readLatestSettingsRow_(site) {
  site = normalizeSlug_(site);
  var ss = openSS_();
  var sh = ss.getSheetByName("settings");
  if (!sh) return null;
  var last = sh.getLastRow(); if (last < 2) return null;
  var h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var iSite = h.indexOf("siteSlug");
  var rIdx = -1;
  for (var r = last; r >= 2; r--) {
    var s = String(sh.getRange(r, iSite+1).getValue() || '').trim().toUpperCase();
    if (s === site) { rIdx = r; break; }
  }
  if (rIdx === -1) return null;

  function G(colName) {
    var i = h.indexOf(colName);
    return i === -1 ? "" : String(sh.getRange(rIdx, i+1).getValue() || "");
  }
  var empresa = G("empresa");
  var historia = G("historia");
  var produtos = G("produtos");
  var fundacao = G("fundacao");
  var email = G("email");
  var whatsapp = G("whatsapp");
  var endereco = G("endereco");
  var businessCategory = G("businessCategory");
  return { empresa, historia, produtos, fundacao, email, whatsapp, endereco, businessCategory };
}

function ensureFaturamentoSheet_() {
  var ss = openSS_();
  var sh = ss.getSheetByName('faturamento');
  if (!sh) sh = ss.insertSheet('faturamento');
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      'preapproval_id','email','siteSlug','plano','status','amount','currency','provider',
      'last_payment','next_renewal','overdue','days_overdue','updated_at'
    ]);
  }
  return sh;
}

function ensureShareAndGetViewUrl_(file) {
  try {
    if (file && file.getId) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return "https://drive.google.com/uc?export=view&id=" + file.getId();
    }
  } catch (e) {
    console.error("Error in ensureShareAndGetViewUrl_:", e);
  }
  return "";
}

function extractDriveFolderId_(folderUrl) {
  if (!folderUrl) return null;
  var url = String(folderUrl).trim();
  var m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function ensureSitesHooksSheet_() {
  var ss = openSS_();
  var sh = ss.getSheetByName("sites_hooks");
  if (!sh) sh = ss.insertSheet("sites_hooks");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["siteSlug","hookUrl","lastTriggered","lastStatus","errors"]);
  }
  return sh;
}

function createFeedback_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.site || data.siteSlug || ""));
    if (!site) return jsonOut_({ ok:false, error:"missing_site" });

    var name    = String(data.name || "");
    var rating  = Math.max(1, Math.min(5, parseInt(String(data.rating || "0"), 10) || 0));
    var comment = String(data.comment || "");
    var email   = String(data.email || "").trim().toLowerCase();
    var phone   = String(data.phone || "");

    var sh = ensureFeedbacksSheet_();
    var id = Utilities.getUuid().replace(/-/g, "");
    sh.appendRow([ id, new Date(), site, name, rating, comment, email, phone, "" ]);

    return jsonOut_({ ok:true, id });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

function createLead_(ss, data) {
  try {
    var site = normalizeSlug_(String(data.site || data.siteSlug || ""));
    if (!site) return jsonOut_({ ok:false, error:"missing_site" });

    var name   = String(data.name || "");
    var email  = String(data.email || "").trim().toLowerCase();
    var phone  = String(data.phone || "");
    var source = String(data.source || "site");

    var sh = ensureLeadsSheet_();
    sh.appendRow([ new Date(), site, name, email, phone, source ]);

    return jsonOut_({ ok:true });
  } catch (e) {
    return jsonOut_({ ok:false, error:String(e) });
  }
}

/** ============================= FUNÇÕES UTILITÁRIAS EXTRAS ============================= */

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}



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

function recomputeBillingAll_() {
  var ss = openSS_();
  var shDados = ss.getSheetByName('dados');
  var shCad   = ss.getSheetByName('cadastros');
  var shUsers = ss.getSheetByName('usuarios');
  var shFat   = ensureFaturamentoSheet_();

  var map = {};

  if (shCad) {
    var cad = shCad.getDataRange().getValues();
    if (cad.length >= 2) {
      var hc = cad[0].map(String), rows = cad.slice(1);
      var iEmail = hc.indexOf('email');
      var iSite  = hc.indexOf('siteSlug');
      var iPlan  = hc.indexOf('plan');
      var iPre   = hc.indexOf('preapproval_id');
      for (var i=0;i<rows.length;i++){
        var r = rows[i];
        var pre = String(r[iPre]||'').trim();
        if (!pre) continue;
        map[pre] = {
          email: String(r[iEmail]||''),
          siteSlug: String(r[iSite]||''),
          plano: String(r[iPlan]||''),
          status: '',
          amount: 0,
          currency: 'BRL',
          provider: 'mercadopago',
          last_payment: null
        };
      }
    }
  }

  if (shDados) {
    var dados = shDados.getDataRange().getValues();
    if (dados.length >= 2) {
      var hd = dados[0].map(String), rowsD = dados.slice(1);
      var iPre2   = hd.indexOf('preapproval_id');
      var iStatus = hd.indexOf('status');
      var iAmount = hd.indexOf('transaction_amount');
      var iCurr   = hd.indexOf('currency_id');
      var iTs     = hd.indexOf('timestamp');
      for (var j=0;j<rowsD.length;j++){
        var rd = rowsD[j];
        var pre2 = String(rd[iPre2]||'').trim();
        if (!pre2 || !map[pre2]) continue;
        var st = String(rd[iStatus]||'');
        if (isActiveStatus_(st)) {
          map[pre2].status = st;
          map[pre2].amount = Number(rd[iAmount]||0)||0;
          map[pre2].currency = String(rd[iCurr]||'BRL');
          map[pre2].last_payment = rd[iTs] ? new Date(rd[iTs]) : null;
        }
      }
    }
  }

  shFat.clear();
  shFat.appendRow([
    'preapproval_id','email','siteSlug','plano','status','amount','currency','provider',
    'last_payment','next_renewal','overdue','days_overdue','updated_at'
  ]);
  Object.keys(map).forEach(function(pre){
    var m = map[pre];
    var next = null;
    if (m.last_payment) {
      next = addDays_(clampToMidnight_(m.last_payment), RENEWAL_INTERVAL_DAYS);
    }
    var overdue = false, daysOver = 0;
    if (next) {
      var now = clampToMidnight_(new Date());
      var grace = addDays_(next, GRACE_DAYS);
      if (now.getTime() > grace.getTime()) {
        overdue = true;
        daysOver = Math.floor((now.getTime() - next.getTime()) / (24*60*60*1000));
      }
    }
    shFat.appendRow([
      pre, m.email, m.siteSlug, m.plano, m.status,
      m.amount, m.currency, m.provider,
      m.last_payment, next, overdue, daysOver, new Date()
    ]);
  });
}

function recomputeBillingOne_(preId) {
  if (!preId) return;
  recomputeBillingAll_();
}

function recomputeBillingAll() { return recomputeBillingAll_(); }
function recomputeBillingOne() { return recomputeBillingOne_(''); }
function sincronizarStatusDiario() { return recomputeBillingAll_(); }

function handleAssetsList_(site) {
  site = normalizeSlug_(String(site || ""));
  if (!site) return jsonOut_({ ok:false, error: "missing_site" });

  var folderUrl = ensureClientFolderUrl_(site);
  if (!folderUrl) return jsonOut_({ ok:false, error: "no_drive_folder" });

  try {
    var folderId = extractDriveFolderId_(folderUrl);
    var root = DriveApp.getFolderById(folderId);

    function findSub(name) {
      var it = root.getFoldersByName(name);
      return it.hasNext() ? it.next() : null;
    }
    var logo  = findSub("logo");
    var fotos = findSub("fotos");

    function getFiles(folder) {
      if (!folder) return [];
      var files = [];
      var it = folder.getFiles();
      while (it.hasNext()) {
        var f = it.next();
        files.push({
          name: f.getName(),
          id: f.getId(),
          url: ensureShareAndGetViewUrl_(f),
          size: f.getSize(),
          type: f.getBlob().getContentType()
        });
      }
      return files;
    }

    return jsonOut_({
      ok: true,
      logo: getFiles(logo),
      fotos: getFiles(fotos)
    });
  } catch (e) {
    return jsonOut_({ ok:false, error: String(e) });
  }
}

function readSiteBuildHook_(slug) {
  slug = normalizeSlug_(slug);
  if (!slug) return '';
  var sh = ensureSitesHooksSheet_();
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return '';
  var head = vals[0].map(String);
  var iSlug = head.indexOf('siteSlug');
  var iUrl  = head.indexOf('build_hook_url');
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    if (normalizeSlug_(String(r[iSlug] || '')) === slug) {
      return String(r[iUrl] || '').trim();
    }
  }
  return '';
}

function upsertSiteBuildHook_(slug, url) {
  slug = normalizeSlug_(slug);
  var sh = ensureSitesHooksSheet_();
  var vals = sh.getDataRange().getValues();
  var head = vals[0].map(String);
  var iSlug = head.indexOf('siteSlug');
  var iUrl  = head.indexOf('build_hook_url');
  var iUpd  = head.indexOf('updated_at');

  for (var i = 1; i < vals.length; i++) {
    if (normalizeSlug_(String(vals[i][iSlug] || '')) === slug) {
      sh.getRange(i + 1, iUrl + 1).setValue(url);
      if (iUpd >= 0) sh.getRange(i + 1, iUpd + 1).setValue(new Date());
      return { ok: true, updated: true };
    }
  }
  sh.appendRow([slug, url, '', new Date()]);
  return { ok: true, created: true };
}

function sectionsBootstrapFromOnboarding_(ss, site) {
  site = normalizeSlug_(site);

  var shKV = ensureSettingsKVSheet_();
  var last = shKV.getLastRow(); if (last < 2) return { error: "no_kv" };
  var defs = [];
  var current = {};
  var vals = shKV.getRange(2,1,last-1,3).getValues();
  for (var i = vals.length-1; i>=0; i--) {
    if (String(vals[i][0]||"").trim().toUpperCase() === site) {
      try { current = JSON.parse(String(vals[i][2]||"{}")); } catch(_){}
      break;
    }
  }
  defs = (current && current.sections && Array.isArray(current.sections.defs))
    ? current.sections.defs : [];

  if (!defs.length) return { error: "no_defs" };

  var onbData = readLatestSettingsRow_(site);
  if (!onbData) return { error: "no_onboarding" };

  var data = {};
  defs.forEach(function(def){
    var id = def.id;
    if (id === "hero") {
      data[id] = { fields: {
        title: (onbData.empresa||site) + " - " + getBusinessTitle(detectBusinessType(onbData.empresa, onbData.historia, onbData.businessCategory)),
        subtitle: onbData.historia || getBusinessSubtitle(detectBusinessType(onbData.empresa, onbData.historia, onbData.businessCategory)),
        cta_whatsapp: onbData.whatsapp ? ("https://wa.me/"+onbData.whatsapp.replace(/\D+/g,'')) : ""
      }, slots: {} };
    } else if (id === "contato") {
      data[id] = { fields: {
        email: onbData.email || "",
        whatsapp: onbData.whatsapp || "",
        address: onbData.endereco || "",
        maps_url: "",
        instagram: "",
        facebook: "",
        tiktok: ""
      }, slots: {} };
    } else {
      data[id] = { fields: {}, slots: {} };
    }
  });

  mergeSettingsKV_(site, { sections: { data: data } });
  return { ok: true, populated: Object.keys(data).length };
}

function atualizarPreapprovalNosCadastros() {
  const ss = SpreadsheetApp.getActive();
  const shCad   = ss.getSheetByName('cadastros');
  const shDados = ss.getSheetByName('dados');
  if (!shCad || !shDados) return;

  const lastDados = shDados.getLastRow();
  const lastCad   = shCad.getLastRow();

  if (lastDados < 2 || lastCad < 2) {
    return;
  }

  const rangeDados = shDados.getRange(1, 1, lastDados, shDados.getLastColumn()).getValues();
  const rangeCad   = shCad.getRange(1, 1, lastCad, shCad.getLastColumn()).getValues();

  const headersDados = rangeDados[0].map(String);
  const headersCad   = rangeCad[0].map(String);

  const idxEmailDados = headersDados.indexOf('payer_email');
  const idxPreapprovalDados = headersDados.indexOf('preapproval_id');

  const idxEmailCad = headersCad.indexOf('email');
  const idxPreapprovalCad = headersCad.indexOf('preapproval_id');

  if (idxEmailDados === -1 || idxPreapprovalDados === -1 || idxEmailCad === -1 || idxPreapprovalCad === -1) {
    return;
  }

  var updates = 0;
  rangeCad.forEach((rowCad, indexCad) => {
    if (indexCad === 0) return;

    const emailCad = String(rowCad[idxEmailCad] || '').trim().toLowerCase();
    const preapprovalCad = String(rowCad[idxPreapprovalCad] || '').trim();

    if (!emailCad) return;

    rangeDados.forEach((rowDados, indexDados) => {
      if (indexDados === 0) return;

      const emailDados = String(rowDados[idxEmailDados] || '').trim().toLowerCase();
      const preapprovalDados = String(rowDados[idxPreapprovalDados] || '').trim();

      if (emailDados === emailCad && preapprovalDados && !preapprovalCad) {
        rangeCad[indexCad][idxPreapprovalCad] = preapprovalDados;
        updates++;
      }
    });
  });

  if (updates > 0) {
    shCad.getRange(1, 1, lastCad, rangeCad[0].length).setValues(rangeCad);
  }
}

function testeSeparado() {
  console.log("1. Testando GET client_billing...");
  var getResult = doGet({
    parameter: {
      type: "client_billing", 
      email: "admin@elevea.com"
    }
  });
  console.log("GET:", getResult.getContent());

  console.log("2. Testando POST clientBilling_...");
  var postResult = clientBilling_(openSS_(), {
    email: "admin@elevea.com"
  });
  console.log("POST:", postResult.getContent());
}

function criarUsuariosTeste() {
  const ss = openSS_();
  const shUsuarios = ss.getSheetByName("usuarios");

  if (!shUsuarios) {
    console.log("❌ Aba 'usuarios' não encontrada!");
    return;
  }

  // Verificar se já tem headers
  if (shUsuarios.getLastRow() === 0) {
    shUsuarios.appendRow([
      "email", "siteSlug", "role", "password_hash", 
      "salt", "last_login", "reset_token", "res"
    ]);
  }

  // USUÁRIOS DE TESTE
  const usuarios = [
    {
      email: "admin@elevea.com",
      siteSlug: "",
      role: "admin",  
      password: "admin123"
    },
    {
      email: "cliente@teste.com", 
      siteSlug: "MRITSCH",
      role: "client",
      password: "123456"
    },
    {
      email: "demo@elevea.com",
      siteSlug: "DEMO-SITE", 
      role: "client",
      password: "demo123"
    }
  ];

  console.log("🔄 Criando usuários de teste...");

  usuarios.forEach(user => {
    // Hash simples da senha (você pode melhorar isso)
    const salt = "salt123";
    const passwordHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, 
      user.password + salt
    ).map(e => (e < 0 ? e + 256 : e).toString(16).padStart(2, '0')).join('');

    shUsuarios.appendRow([
      user.email,
      user.siteSlug, 
      user.role,
      passwordHash,
      salt,
      "", // last_login
      "", // reset_token
      ""  // res
    ]);

    console.log(`✅ Criado: ${user.email} (${user.role})`);
  });

  console.log("🎉 Usuários criados com sucesso!");
  console.log("📝 Credenciais:");
  console.log("   admin@elevea.com / admin123");
  console.log("   cliente@teste.com / 123456"); 
  console.log("   demo@elevea.com / demo123");
}

function testeUsuariosExistem() {
  const ss = openSS_();
  const shUsuarios = ss.getSheetByName("usuarios");

  if (!shUsuarios) {
    console.log("❌ Aba 'usuarios' não encontrada!");
    return;
  }

  console.log("📋 Verificando usuários na planilha:");
  const data = shUsuarios.getDataRange().getValues();
  const headers = data[0];

  console.log("🔍 Headers:", headers.join(" | "));
  console.log("📊 Total de linhas:", data.length - 1, "usuários");

  // Mostrar todos os usuários
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    console.log(`👤 ${i}: ${row[0]} | ${row[1]} | ${row[2]}`); // email | siteSlug | role
  }
}

function testeLoginReal() {
  console.log("🔐 Testando login com admin@elevea.com...");

  const result = userLogin_(openSS_(), {
    email: "admin@elevea.com",
    password: "admin123"
  });

  try {
    const parsed = JSON.parse(result.getContent());
    console.log("📤 Resultado do login:", parsed);

    if (parsed.ok) {
      console.log("✅ LOGIN FUNCIONOU!");
      console.log("🎯 Token:", parsed.token ? "✅ Presente" : "❌ Ausente");
    } else {
      console.log("❌ LOGIN FALHOU:", parsed.error);
    }
  } catch (e) {
    console.log("❌ Erro ao parsear resposta:", e);
    console.log("📄 Resposta bruta:", result.getContent());
  }
}

function testeLoginTodosUsuarios() {
  const credenciais = [
    { email: "admin@elevea.com", password: "admin123" },
    { email: "cliente@teste.com", password: "123456" },
    { email: "demo@elevea.com", password: "demo123" }
  ];

  credenciais.forEach(cred => {
    console.log(`\n🔐 Testando: ${cred.email}`);

    try {
      const result = userLogin_(openSS_(), cred);
      const parsed = JSON.parse(result.getContent());

      if (parsed.ok) {
        console.log(`✅ ${cred.email}: LOGIN OK`);
      } else {
        console.log(`❌ ${cred.email}: ${parsed.error}`);
      }
    } catch (e) {
      console.log(`❌ ${cred.email}: ERRO - ${e}`);
    }
  });
}

function limparDuplicatasAdmin() {
  const ss = openSS_();
  const shUsuarios = ss.getSheetByName("usuarios");

  console.log("🧹 Removendo duplicatas do admin@elevea.com...");

  const data = shUsuarios.getDataRange().getValues();
  const headers = data[0];
  const newData = [headers]; // Manter headers

  let adminAdicionado = false;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = String(row[0]).trim().toLowerCase();

    // Se for admin@elevea.com, adicionar apenas UMA vez
    if (email === "admin@elevea.com") {
      if (!adminAdicionado) {
        console.log("✅ Mantendo apenas 1 entrada do admin@elevea.com");
        newData.push(row);
        adminAdicionado = true;
      } else {
        console.log("❌ Removendo duplicata do admin@elevea.com");
      }
    } else {
      // Outros usuários, manter normalmente
      newData.push(row);
    }
  }

  // Limpar planilha e reescrever dados limpos
  shUsuarios.clear();
  shUsuarios.getRange(1, 1, newData.length, headers.length).setValues(newData);

  console.log("🎉 Duplicatas removidas!");
  console.log("📊 Total de usuários agora:", newData.length - 1);
}

function testeAdminDepoisLimpeza() {
  console.log("🔐 Testando admin@elevea.com após limpeza...");

  const result = userLogin_(openSS_(), {
    email: "admin@elevea.com",
    password: "admin123"
  });

  const parsed = JSON.parse(result.getContent());
  console.log("📤 Resultado:", parsed);

  if (parsed.ok) {
    console.log("🎉 LOGIN ADMIN FUNCIONOU!");
  } else {
    console.log("❌ Ainda falhou:", parsed.error);
  }
}

/** ============================= ARQUIVO LIMPO E ORGANIZADO ============================= */
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

// Funções placeholder para E-commerce (implementar conforme necessário)
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

// Funções placeholder para White-label
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

// Funções placeholder para Marketplace
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

// Funções placeholder para Audit
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
 * ============================= FIM DAS NOVAS FUNCIONALIDADES VIP =============================
 */
