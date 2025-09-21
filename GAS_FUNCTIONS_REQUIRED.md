# Funções Requeridas no Google Apps Script (GAS)

## ✅ Funções Existentes (Já Implementadas)
- `list_leads` - Listar leads
- `list_feedbacks` - Listar feedbacks  
- `get_traffic` - Obter dados de tráfego
- `status` - Status do site
- `sites` - Lista de sites
- `admin_set` - Configurações admin
- `client_billing` - Dados de cobrança

## 🆕 Novas Funções Necessárias para as Funcionalidades

### **1. Sistema Multi-idioma**
```javascript
// action: 'multi_language_get_settings'
function multi_language_get_settings(params) {
  const { siteSlug } = params;
  
  // Buscar configurações de idioma do site
  const settings = getSheetData('language_settings', siteSlug);
  
  return {
    ok: true,
    settings: {
      defaultLanguage: settings?.defaultLanguage || 'pt',
      enabledLanguages: settings?.enabledLanguages || ['pt'],
      autoDetect: settings?.autoDetect || true,
      fallbackLanguage: 'pt'
    }
  };
}

// action: 'multi_language_update_settings' 
function multi_language_update_settings(params) {
  const { siteSlug, settings } = params;
  
  // Salvar configurações
  updateSheetData('language_settings', siteSlug, settings);
  
  return { ok: true, settings };
}

// action: 'multi_language_translate_content'
function multi_language_translate_content(params) {
  const { siteSlug, content, targetLanguage } = params;
  
  // Integrar com Google Translate API ou similar
  const translatedContent = translateText(content, 'pt', targetLanguage);
  
  return { ok: true, translatedContent };
}
```

### **2. Sistema de Agendamento**
```javascript
// action: 'appointment_get_settings'
function appointment_get_settings(params) {
  const { siteSlug } = params;
  
  const settings = getSheetData('appointment_settings', siteSlug);
  
  return {
    ok: true,
    settings: {
      workingHours: settings?.workingHours || { start: '09:00', end: '18:00' },
      workingDays: settings?.workingDays || ['1', '2', '3', '4', '5'],
      duration: settings?.duration || 60,
      buffer: settings?.buffer || 15,
      maxAdvanceDays: settings?.maxAdvanceDays || 30
    }
  };
}

// action: 'appointment_create'
function appointment_create(params) {
  const { siteSlug, appointment } = params;
  
  // Verificar disponibilidade
  const isAvailable = checkAvailability(siteSlug, appointment.datetime, appointment.duration);
  
  if (!isAvailable) {
    return { ok: false, error: 'Horário não disponível' };
  }
  
  // Criar agendamento
  const appointmentId = generateId();
  const appointmentData = {
    id: appointmentId,
    ...appointment,
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };
  
  appendSheetData('appointments', siteSlug, appointmentData);
  
  // Integrar com Google Calendar se configurado
  if (settings?.googleCalendarIntegration) {
    createCalendarEvent(appointmentData);
  }
  
  return { ok: true, appointment: appointmentData };
}

// action: 'appointment_get_availability'
function appointment_get_availability(params) {
  const { siteSlug, date } = params;
  
  const settings = getSheetData('appointment_settings', siteSlug);
  const appointments = getSheetData('appointments', siteSlug, { date });
  
  const availableSlots = calculateAvailableSlots(settings, appointments, date);
  
  return { ok: true, availableSlots };
}
```

### **3. E-commerce**
```javascript
// action: 'ecommerce_get_products'
function ecommerce_get_products(params) {
  const { siteSlug, category, search, limit = 20, offset = 0 } = params;
  
  const products = getSheetData('products', siteSlug, { category, search, limit, offset });
  
  return { ok: true, products };
}

// action: 'ecommerce_create_product'
function ecommerce_create_product(params) {
  const { siteSlug, product } = params;
  
  const productId = generateId();
  const productData = {
    id: productId,
    ...product,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  appendSheetData('products', siteSlug, productData);
  
  return { ok: true, product: productData };
}

// action: 'ecommerce_create_order'
function ecommerce_create_order(params) {
  const { siteSlug, order } = params;
  
  const orderId = generateOrderNumber();
  const orderData = {
    id: generateId(),
    orderNumber: orderId,
    ...order,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  appendSheetData('orders', siteSlug, orderData);
  
  return { ok: true, order: orderData };
}

// action: 'ecommerce_get_store_settings'
function ecommerce_get_store_settings(params) {
  const { siteSlug } = params;
  
  const settings = getSheetData('store_settings', siteSlug);
  
  return {
    ok: true,
    settings: settings || {
      name: 'Minha Loja',
      currency: 'BRL',
      paymentMethods: ['pix', 'credit'],
      shippingZones: []
    }
  };
}
```

### **4. White-label (Sistema de Revenda)**
```javascript
// action: 'white_label_create_reseller'
function white_label_create_reseller(params) {
  const { resellerId, resellerData } = params;
  
  const reseller = {
    id: resellerId,
    ...resellerData,
    createdAt: new Date().toISOString(),
    status: 'active',
    clients: [],
    earnings: { total: 0, pending: 0, paid: 0 }
  };
  
  appendSheetData('resellers', 'global', reseller);
  
  return { ok: true, reseller };
}

// action: 'white_label_get_reseller'
function white_label_get_reseller(params) {
  const { resellerId } = params;
  
  const reseller = getSheetData('resellers', 'global', { id: resellerId });
  
  return { ok: true, reseller };
}

// action: 'white_label_add_client'
function white_label_add_client(params) {
  const { resellerId, clientData } = params;
  
  const clientId = generateId();
  const client = {
    id: clientId,
    resellerId,
    ...clientData,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  appendSheetData('reseller_clients', resellerId, client);
  
  return { ok: true, client };
}

// action: 'white_label_generate_site'
function white_label_generate_site(params) {
  const { resellerId, clientData, templateId } = params;
  
  // Criar site personalizado para o cliente do revendedor
  const siteSlug = generateSiteSlug(clientData.businessName);
  
  // Aplicar branding do revendedor
  const resellerBranding = getSheetData('reseller_branding', resellerId);
  
  const siteData = {
    slug: siteSlug,
    resellerId,
    clientId: clientData.id,
    template: templateId,
    branding: resellerBranding,
    domain: `${siteSlug}.${resellerBranding.domain || 'elevea.app'}`,
    createdAt: new Date().toISOString()
  };
  
  appendSheetData('white_label_sites', resellerId, siteData);
  
  return { ok: true, site: siteData };
}
```

### **5. Template Marketplace**
```javascript
// action: 'marketplace_get_templates'
function marketplace_get_templates(params) {
  const { category, priceMin, priceMax, tags, searchTerm, sortBy = 'latest', limit = 20, offset = 0 } = params;
  
  const templates = getSheetData('marketplace_templates', 'global', {
    category, priceMin, priceMax, tags, searchTerm, sortBy, limit, offset
  });
  
  const categories = getSheetData('template_categories', 'global');
  
  return { ok: true, templates, categories };
}

// action: 'marketplace_purchase_template'
function marketplace_purchase_template(params) {
  const { siteSlug, templateId, paymentMethod, paymentToken, customerEmail } = params;
  
  const template = getSheetData('marketplace_templates', 'global', { id: templateId });
  
  if (!template) {
    return { ok: false, error: 'Template não encontrado' };
  }
  
  // Processar pagamento (integração com gateway)
  const paymentResult = processPayment({
    amount: template.price,
    method: paymentMethod,
    token: paymentToken
  });
  
  if (!paymentResult.success) {
    return { ok: false, error: 'Falha no pagamento' };
  }
  
  // Registrar compra
  const purchase = {
    id: generateId(),
    templateId,
    siteSlug,
    customerEmail,
    pricePaid: template.price,
    currency: template.currency,
    purchaseDate: new Date().toISOString(),
    licenseKey: generateLicenseKey(),
    downloadUrl: generateDownloadUrl(templateId),
    status: 'completed'
  };
  
  appendSheetData('template_purchases', siteSlug, purchase);
  
  return { ok: true, purchase };
}

// action: 'marketplace_apply_template'
function marketplace_apply_template(params) {
  const { siteSlug, templateId, customizations } = params;
  
  // Verificar se o template foi comprado
  const purchase = getSheetData('template_purchases', siteSlug, { templateId });
  
  if (!purchase) {
    return { ok: false, error: 'Template não foi comprado' };
  }
  
  // Fazer backup do site atual
  const backup = createSiteBackup(siteSlug);
  
  // Aplicar template
  const applyResult = applyTemplateToSite(siteSlug, templateId, customizations);
  
  return {
    ok: true,
    previewUrl: `https://${siteSlug}.elevea.app`,
    backupCreated: backup.id
  };
}
```

### **6. Audit Logs**
```javascript
// action: 'audit_log_event'
function audit_log_event(params) {
  const { auditLog } = params;
  
  appendSheetData('audit_logs', auditLog.siteSlug, auditLog);
  
  // Verificar se precisa gerar alertas de segurança
  checkSecurityAlerts(auditLog);
  
  return { ok: true };
}

// action: 'audit_get_logs'
function audit_get_logs(params) {
  const { siteSlug, filters } = params;
  
  const logs = getSheetData('audit_logs', siteSlug, filters);
  
  return { ok: true, logs, total: logs.length, hasMore: false };
}

// action: 'audit_get_security_alerts'
function audit_get_security_alerts(params) {
  const { siteSlug } = params;
  
  const alerts = getSheetData('security_alerts', siteSlug);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  
  return { ok: true, alerts, criticalCount, unresolvedCount };
}

// action: 'audit_generate_report'
function audit_generate_report(params) {
  const { siteSlug, filters, reportDate } = params;
  
  const logs = getSheetData('audit_logs', siteSlug, filters);
  
  // Gerar relatório em formato CSV ou PDF
  const reportUrl = generateAuditReport(logs, siteSlug, reportDate);
  
  return {
    ok: true,
    report: { totalEvents: logs.length, period: filters },
    downloadUrl: reportUrl,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}
```

### **7. Controle Admin de Funcionalidades**
```javascript
// action: 'admin_get_client_features'
function admin_get_client_features(params) {
  const { siteSlug } = params;
  
  const settings = getSheetData('feature_settings', siteSlug);
  
  return {
    ok: true,
    settings: settings || {
      siteSlug,
      plan: 'essential',
      enabledFeatures: ['basic-website', 'google-my-business'],
      onboardingCompleted: false,
      lastUpdated: new Date().toISOString()
    }
  };
}

// action: 'admin_update_client_features'
function admin_update_client_features(params) {
  const { siteSlug, updates } = params;
  
  const currentSettings = getSheetData('feature_settings', siteSlug);
  const newSettings = { ...currentSettings, ...updates };
  
  updateSheetData('feature_settings', siteSlug, newSettings);
  
  return { ok: true, settings: newSettings };
}

// action: 'admin_toggle_client_feature'
function admin_toggle_client_feature(params) {
  const { siteSlug, featureId, enabled } = params;
  
  const settings = getSheetData('feature_settings', siteSlug);
  let enabledFeatures = settings?.enabledFeatures || [];
  
  if (enabled && !enabledFeatures.includes(featureId)) {
    enabledFeatures.push(featureId);
  } else if (!enabled && enabledFeatures.includes(featureId)) {
    enabledFeatures = enabledFeatures.filter(f => f !== featureId);
  }
  
  const updatedSettings = {
    ...settings,
    enabledFeatures,
    lastUpdated: new Date().toISOString()
  };
  
  updateSheetData('feature_settings', siteSlug, updatedSettings);
  
  return { ok: true };
}

// action: 'admin_update_client_plan'
function admin_update_client_plan(params) {
  const { siteSlug, plan } = params;
  
  const settings = getSheetData('feature_settings', siteSlug);
  const updatedSettings = {
    ...settings,
    plan,
    lastUpdated: new Date().toISOString()
  };
  
  updateSheetData('feature_settings', siteSlug, updatedSettings);
  
  return { ok: true };
}
```

## 🔧 Funções Auxiliares Necessárias

```javascript
// Funções de utilidade que precisam estar implementadas
function getSheetData(sheetName, siteSlug, filters = {}) {
  // Implementar busca nos dados da planilha
}

function appendSheetData(sheetName, siteSlug, data) {
  // Implementar inserção de dados na planilha
}

function updateSheetData(sheetName, siteSlug, data) {
  // Implementar atualização de dados na planilha
}

function generateId() {
  // Gerar ID único
  return Utilities.getUuid();
}

function generateOrderNumber() {
  // Gerar número de pedido sequencial
}

function generateLicenseKey() {
  // Gerar chave de licença para templates
}

function processPayment(paymentData) {
  // Integração com gateway de pagamento
}

function translateText(text, sourceLang, targetLang) {
  // Integração com Google Translate API
  return LanguageApp.translate(text, sourceLang, targetLang);
}

function checkAvailability(siteSlug, datetime, duration) {
  // Verificar disponibilidade de agendamento
}

function createCalendarEvent(appointmentData) {
  // Criar evento no Google Calendar
}

function checkSecurityAlerts(auditLog) {
  // Verificar se o log deve gerar alertas de segurança
}
```

## 📊 Estrutura de Planilhas Necessárias

### Novas abas que precisam ser criadas:
1. `language_settings` - Configurações de idioma por site
2. `appointment_settings` - Configurações de agendamento
3. `appointments` - Agendamentos realizados
4. `products` - Produtos do e-commerce
5. `orders` - Pedidos do e-commerce
6. `store_settings` - Configurações da loja
7. `resellers` - Dados dos revendedores
8. `reseller_clients` - Clientes dos revendedores
9. `reseller_branding` - Branding personalizado
10. `white_label_sites` - Sites white-label criados
11. `marketplace_templates` - Templates disponíveis
12. `template_categories` - Categorias de templates
13. `template_purchases` - Compras realizadas
14. `audit_logs` - Logs de auditoria
15. `security_alerts` - Alertas de segurança
16. `feature_settings` - Configurações de funcionalidades por site

## ⚠️ Importante
Todas essas funções devem ser implementadas no Google Apps Script para que as novas funcionalidades funcionem corretamente. Cada função deve seguir o padrão existente de retorno com `{ ok: true/false, ...dados }`.