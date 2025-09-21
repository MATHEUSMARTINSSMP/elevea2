import { Handler } from '@netlify/functions';
import { rateLimitMiddleware, verifyVipAccess } from './shared/security';

const GAS_BASE_URL = process.env.GAS_BASE_URL;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

interface AuditLog {
  id: string;
  timestamp: string;
  siteSlug: string;
  userId?: string;
  userEmail?: string;
  action: string;
  category: 'authentication' | 'content' | 'settings' | 'ecommerce' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  success: boolean;
  errorMessage?: string;
  metadata: {
    sessionId?: string;
    requestId?: string;
    duration?: number;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
  };
}

interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  actions?: string[];
  categories?: string[];
  severities?: string[];
  userEmail?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

interface SecurityAlert {
  id: string;
  timestamp: string;
  siteSlug: string;
  alertType: 'suspicious_login' | 'multiple_failures' | 'unusual_activity' | 'permission_escalation' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  triggerDetails: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

async function callGAS(action: string, params: any = {}) {
  if (!GAS_BASE_URL) {
    throw new Error('GAS_BASE_URL não configurada');
  }

  const response = await fetch(GAS_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params })
  });

  return await response.json();
}

/**
 * Registrar evento de auditoria
 */
async function logAuditEvent(
  siteSlug: string, 
  event: Omit<AuditLog, 'id' | 'timestamp' | 'siteSlug'>,
  request: any
) {
  try {
    // Validação de entrada
    if (!event.action || typeof event.action !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Ação é obrigatória'
        })
      };
    }

    if (!['authentication', 'content', 'settings', 'ecommerce', 'security', 'system'].includes(event.category)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Categoria inválida'
        })
      };
    }

    if (!['low', 'medium', 'high', 'critical'].includes(event.severity)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Severidade inválida'
        })
      };
    }

    // Extrair informações do request
    const clientIP = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    const auditLog: AuditLog = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      siteSlug: siteSlug,
      action: event.action,
      category: event.category,
      severity: event.severity,
      description: event.description,
      details: event.details || {},
      ipAddress: clientIP,
      userAgent: userAgent,
      success: event.success,
      errorMessage: event.errorMessage,
      userId: event.userId,
      userEmail: event.userEmail,
      location: event.location,
      metadata: {
        sessionId: event.metadata?.sessionId,
        requestId: event.metadata?.requestId || generateRequestId(),
        duration: event.metadata?.duration,
        beforeState: event.metadata?.beforeState,
        afterState: event.metadata?.afterState
      }
    };

    const gasResponse = await callGAS('audit_log_event', {
      auditLog: auditLog
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          logId: auditLog.id,
          message: 'Evento registrado com sucesso'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Erro ao registrar evento'
      })
    };

  } catch (error) {
    console.error('Erro ao registrar audit log:', error);
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

/**
 * Buscar logs de auditoria
 */
async function getAuditLogs(siteSlug: string, filters: AuditLogFilter = {}) {
  try {
    // Validação de filtros
    if (filters.limit && (filters.limit < 1 || filters.limit > 1000)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Limite deve estar entre 1 e 1000'
        })
      };
    }

    const gasResponse = await callGAS('audit_get_logs', {
      siteSlug: siteSlug,
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        actions: filters.actions,
        categories: filters.categories,
        severities: filters.severities,
        userEmail: filters.userEmail,
        success: filters.success,
        limit: filters.limit || 100,
        offset: filters.offset || 0
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        logs: gasResponse.logs || [],
        total: gasResponse.total || 0,
        hasMore: gasResponse.hasMore || false
      })
    };

  } catch (error) {
    console.error('Erro ao buscar audit logs:', error);
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

/**
 * Gerar relatório de auditoria
 */
async function generateAuditReport(siteSlug: string, filters: AuditLogFilter = {}) {
  try {
    const gasResponse = await callGAS('audit_generate_report', {
      siteSlug: siteSlug,
      filters: filters,
      reportDate: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        report: gasResponse.report,
        downloadUrl: gasResponse.downloadUrl,
        expiresAt: gasResponse.expiresAt
      })
    };

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
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

/**
 * Buscar alertas de segurança
 */
async function getSecurityAlerts(siteSlug: string) {
  try {
    const gasResponse = await callGAS('audit_get_security_alerts', {
      siteSlug: siteSlug
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        alerts: gasResponse.alerts || [],
        critical: gasResponse.criticalCount || 0,
        unresolved: gasResponse.unresolvedCount || 0
      })
    };

  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
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

/**
 * Resolver alerta de segurança
 */
async function resolveSecurityAlert(siteSlug: string, alertId: string, notes: string = '') {
  try {
    if (!alertId || typeof alertId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'ID do alerta é obrigatório'
        })
      };
    }

    const gasResponse = await callGAS('audit_resolve_alert', {
      siteSlug: siteSlug,
      alertId: alertId,
      resolvedAt: new Date().toISOString(),
      notes: notes.trim()
    });

    if (gasResponse.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          message: 'Alerta resolvido com sucesso'
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        ok: false,
        error: gasResponse.error || 'Alerta não encontrado'
      })
    };

  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
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

/**
 * Obter estatísticas de auditoria
 */
async function getAuditStatistics(siteSlug: string, period: string = '30d') {
  try {
    const gasResponse = await callGAS('audit_get_statistics', {
      siteSlug: siteSlug,
      period: period
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        statistics: gasResponse.statistics || {
          totalEvents: 0,
          successfulEvents: 0,
          failedEvents: 0,
          criticalEvents: 0,
          topActions: [],
          topCategories: [],
          timelineData: []
        }
      })
    };

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
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

function generateLogId(): string {
  return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateRequestId(): string {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export const handler: Handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Verificar rate limiting
    await rateLimitMiddleware('audit-logs', event);

    const body = JSON.parse(event.body || '{}');
    const { action, siteSlug, vipPin } = body;

    // Verificar acesso VIP
    if (!siteSlug || !vipPin) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'siteSlug e vipPin são obrigatórios'
        })
      };
    }

    const hasAccess = await verifyVipAccess(siteSlug, vipPin);
    if (!hasAccess) {
      // Log tentativa de acesso não autorizado
      await logAuditEvent(siteSlug, {
        action: 'unauthorized_audit_access',
        category: 'security',
        severity: 'high',
        description: 'Tentativa de acesso não autorizado aos logs de auditoria',
        details: { 
          requestedAction: action,
          providedPin: vipPin ? 'provided' : 'missing'
        },
        success: false,
        errorMessage: 'Acesso negado',
        metadata: {}
      }, event);

      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Acesso negado'
        })
      };
    }

    switch (action) {
      case 'log_event':
        return await logAuditEvent(siteSlug, body.event, event);

      case 'get_logs':
        return await getAuditLogs(siteSlug, body.filters);

      case 'generate_report':
        return await generateAuditReport(siteSlug, body.filters);

      case 'get_security_alerts':
        return await getSecurityAlerts(siteSlug);

      case 'resolve_alert':
        return await resolveSecurityAlert(siteSlug, body.alertId, body.notes);

      case 'get_statistics':
        return await getAuditStatistics(siteSlug, body.period);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Ação não reconhecida'
          })
        };
    }

  } catch (error) {
    console.error('Erro no audit logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Erro interno do servidor'
      })
    };
  }
};