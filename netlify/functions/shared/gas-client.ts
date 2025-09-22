/**
 * Cliente padronizado para Google Apps Script
 * Garante compatibilidade 100% com arquitetura existente
 */

const GAS_BASE_URL = process.env.GAS_BASE_URL || process.env.ELEVEA_GAS_EXEC_URL || process.env.SHEETS_WEBAPP_URL || '';

export interface GASResponse<T = any> {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Chamada GET padronizada (para funções existentes como client-api.js)
 */
export async function callGAS_GET(type: string, params: Record<string, any> = {}): Promise<GASResponse> {
  if (!GAS_BASE_URL) {
    throw new Error('GAS_BASE_URL não configurada - verifique variáveis de ambiente');
  }

  // Converter siteSlug para site para compatibilidade
  if (params.siteSlug && !params.site) {
    params.site = params.siteSlug;
    delete params.siteSlug;
  }

  const searchParams = new URLSearchParams({
    type,
    nc: Date.now().toString(),
    ...params
  });

  const response = await fetch(`${GAS_BASE_URL}?${searchParams}`, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`GAS HTTP Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Chamada POST padronizada (para compatibilidade com funções existentes)
 */
export async function callGAS_POST(type: string, data: Record<string, any> = {}): Promise<GASResponse> {
  if (!GAS_BASE_URL) {
    throw new Error('GAS_BASE_URL não configurada - verifique variáveis de ambiente');
  }

  // Converter siteSlug para site para compatibilidade
  if (data.siteSlug && !data.site) {
    data.site = data.siteSlug;
    delete data.siteSlug;
  }

  const payload = {
    type, // Usar 'type' para compatibilidade com funções existentes
    ...data
  };

  const response = await fetch(GAS_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`GAS HTTP Error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Função unificada que escolhe GET ou POST baseado no padrão existente
 */
export async function callGAS(typeOrAction: string, data: Record<string, any> = {}): Promise<GASResponse> {
  // Mapear actions novas para types existentes
  const actionToTypeMap: Record<string, string> = {
    // Admin feature control
    'admin_get_client_features': 'admin_get_client_features',
    'admin_update_client_features': 'admin_update_client_features', 
    'admin_toggle_client_feature': 'admin_toggle_client_feature',
    'admin_update_client_plan': 'admin_update_client_plan',
    
    // Marketplace
    'marketplace_get_templates': 'marketplace_get_templates',
    'marketplace_get_template': 'marketplace_get_template',
    'marketplace_purchase_template': 'marketplace_purchase_template',
    'marketplace_apply_template': 'marketplace_apply_template',
    'marketplace_rate_template': 'marketplace_rate_template',
    'marketplace_get_categories': 'marketplace_get_categories',
    'marketplace_get_purchases': 'marketplace_get_purchases',
    
    // White-label
    'white_label_create_reseller': 'white_label_create_reseller',
    'white_label_get_reseller': 'white_label_get_reseller',
    'white_label_update_reseller': 'white_label_update_reseller',
    'white_label_get_branding': 'white_label_get_branding',
    'white_label_update_branding': 'white_label_update_branding',
    'white_label_get_clients': 'white_label_get_clients',
    'white_label_add_client': 'white_label_add_client',
    'white_label_generate_site': 'white_label_generate_site',
    'white_label_get_analytics': 'white_label_get_analytics',
    'white_label_check_slug': 'white_label_check_slug',
    'white_label_update_domain': 'white_label_update_domain',
    'white_label_get_commission_report': 'white_label_get_commission_report',
    
    // E-commerce
    'ecommerce_get_products': 'ecommerce_get_products',
    'ecommerce_create_product': 'ecommerce_create_product',
    'ecommerce_update_product': 'ecommerce_update_product',
    'ecommerce_delete_product': 'ecommerce_delete_product',
    'ecommerce_get_orders': 'ecommerce_get_orders',
    'ecommerce_create_order': 'ecommerce_create_order',
    'ecommerce_update_order_status': 'ecommerce_update_order_status',
    'ecommerce_get_store_settings': 'ecommerce_get_store_settings',
    'ecommerce_update_store_settings': 'ecommerce_update_store_settings',
    'ecommerce_get_analytics': 'ecommerce_get_analytics',
    
    // Audit logs
    'audit_log_event': 'audit_log_event',
    'audit_get_logs': 'audit_get_logs',
    'audit_get_security_alerts': 'audit_get_security_alerts',
    'audit_generate_report': 'audit_generate_report',
    'audit_resolve_alert': 'audit_resolve_alert',
    'audit_get_statistics': 'audit_get_statistics',
    
    // Multi-language
    'multi_language_get_settings': 'multi_language_get_settings',
    'multi_language_update_settings': 'multi_language_update_settings',
    'multi_language_translate_content': 'multi_language_translate_content',
    
    // Appointment scheduling
    'appointment_get_settings': 'appointment_get_settings',
    'appointment_create': 'appointment_create',
    'appointment_get_availability': 'appointment_get_availability'
  };

  const type = actionToTypeMap[typeOrAction] || typeOrAction;
  
  // Usar POST para todas as novas funcionalidades para consistência
  return await callGAS_POST(type, data);
}