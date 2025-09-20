const BUILD = 'debug-2025-09-11';

/** ============================= CONFIGURAÇÕES E CONSTANTES ============================= */

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