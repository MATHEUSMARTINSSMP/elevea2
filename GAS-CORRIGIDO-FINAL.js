
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
    const email = String(p.email || "").trim();
    if (!email) return jsonOut_({ ok: false, error: "missing_email" });

    try {
      const shCad = ss.getSheetByName("cadastros");
      if (!shCad) return jsonOut_({ ok: false, error: "missing_sheet_cadastros" });

      const data = shCad.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const idxEmail = headers.indexOf("email");
      const idxSite = headers.indexOf("siteSlug");
      const idxPlan = headers.indexOf("plano");
      const idxPreapproval = headers.indexOf("preapproval_id");

      if (idxEmail === -1) return jsonOut_({ ok: false, error: "missing_email_header" });

      const row = data.find(r => String(r[idxEmail] || "").trim() === email);
      if (!row) return jsonOut_({ ok: false, error: "site_not_found" });

      const siteSlug = String(row[idxSite] || "");
      const plan = String(row[idxPlan] || "essential");
      const preapprovalId = String(row[idxPreapproval] || "");

      // Simular dados de cobrança (ajuste conforme seu sistema de pagamento)
      const billing = {
        ok: true,
        plan: plan.toLowerCase(),
        status: "active",
        provider: "mercadopago",
        next_renewal: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        amount: plan.toLowerCase() === "vip" ? 197 : 97,
        currency: "BRL",
        preapproval_id: preapprovalId
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