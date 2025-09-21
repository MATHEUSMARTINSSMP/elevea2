import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/ui/card';
import { Button } from '../../../src/components/ui/button';
import { Input } from '../../../src/components/ui/input';
import { Badge } from '../../../src/components/ui/badge';
import { Alert, AlertDescription } from '../../../src/components/ui/alert';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Activity,
  FileText,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

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

interface AuditStatistics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  criticalEvents: number;
  topActions: Array<{ action: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  timelineData: Array<{ date: string; events: number }>;
}

interface AuditLogsProps {
  siteSlug: string;
  vipPin: string;
}

export default function AuditLogs({ siteSlug, vipPin }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [currentView, setCurrentView] = useState<'logs' | 'alerts' | 'statistics' | 'reports'>('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    loadLogs();
    loadAlerts();
    loadStatistics();
  }, []);

  const loadLogs = async (filters: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_logs',
          siteSlug,
          vipPin,
          filters: {
            ...filters,
            startDate,
            endDate,
            categories: selectedCategory ? [selectedCategory] : undefined,
            severities: selectedSeverity ? [selectedSeverity] : undefined,
            actions: searchTerm ? [searchTerm] : undefined,
            limit: 50
          }
        })
      });

      const data = await response.json();
      if (data.ok) {
        setLogs(data.logs);
      } else {
        setError(data.error || 'Erro ao carregar logs');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/.netlify/functions/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_security_alerts',
          siteSlug,
          vipPin
        })
      });

      const data = await response.json();
      if (data.ok) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/.netlify/functions/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_statistics',
          siteSlug,
          vipPin,
          period: '30d'
        })
      });

      const data = await response.json();
      if (data.ok) {
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const resolveAlert = async (alertId: string, notes: string = '') => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          siteSlug,
          vipPin,
          alertId,
          notes
        })
      });

      const data = await response.json();
      if (data.ok) {
        setSuccess('Alerta resolvido com sucesso');
        loadAlerts();
      } else {
        setError(data.error || 'Erro ao resolver alerta');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          siteSlug,
          vipPin,
          filters: {
            startDate,
            endDate,
            categories: selectedCategory ? [selectedCategory] : undefined,
            severities: selectedSeverity ? [selectedSeverity] : undefined
          }
        })
      });

      const data = await response.json();
      if (data.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        setSuccess('Relatório gerado com sucesso');
      } else {
        setError(data.error || 'Erro ao gerar relatório');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <User className="w-4 h-4" />;
      case 'content': return <FileText className="w-4 h-4" />;
      case 'settings': return <Eye className="w-4 h-4" />;
      case 'ecommerce': return <Activity className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'system': return <RefreshCw className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const renderLogItem = (log: AuditLog) => {
    const { date, time } = formatTimestamp(log.timestamp);

    return (
      <Card key={log.id} className={`mb-4 ${!log.success ? 'border-red-200' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getCategoryIcon(log.category)}
              <div>
                <h4 className="font-semibold text-sm">{log.action}</h4>
                <p className="text-gray-600 text-xs">{log.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getSeverityColor(log.severity)}>
                {log.severity}
              </Badge>
              {log.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
            {log.userEmail && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="truncate">{log.userEmail}</span>
              </div>
            )}
            {log.ipAddress && (
              <div className="flex items-center gap-1">
                <ExternalLink className="w-4 h-4" />
                <span>{log.ipAddress}</span>
              </div>
            )}
          </div>

          {!log.success && log.errorMessage && (
            <Alert variant="destructive" className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{log.errorMessage}</AlertDescription>
            </Alert>
          )}

          {Object.keys(log.details).length > 0 && (
            <details className="bg-gray-50 p-3 rounded text-sm">
              <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
              <pre className="mt-2 text-xs overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Alertas de Segurança</h3>
        <Button size="sm" onClick={loadAlerts} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum alerta ativo</h3>
            <p className="text-gray-600">Seu sistema está seguro!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => {
            const { date, time } = formatTimestamp(alert.timestamp);
            
            return (
              <Card key={alert.id} className={`${alert.resolved ? 'opacity-75' : 'border-orange-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${alert.resolved ? 'text-gray-400' : 'text-orange-500'}`} />
                      <div>
                        <h4 className="font-semibold">{alert.description}</h4>
                        <p className="text-gray-600 text-sm">Tipo: {alert.alertType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {alert.resolved && (
                        <Badge variant="secondary">Resolvido</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <span>📅 {date} • {time}</span>
                    {alert.resolvedAt && (
                      <span>✅ Resolvido em: {formatTimestamp(alert.resolvedAt).date}</span>
                    )}
                  </div>

                  {!alert.resolved && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveAlert(alert.id, 'Resolvido manualmente')}
                        disabled={loading}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolver
                      </Button>
                    </div>
                  )}

                  {alert.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                      <strong>Notas:</strong> {alert.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStatistics = () => {
    if (!statistics) return <div>Carregando estatísticas...</div>;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Estatísticas de Auditoria (30 dias)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalEvents}</div>
              <div className="text-sm text-gray-600">Total de Eventos</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.successfulEvents}</div>
              <div className="text-sm text-gray-600">Sucessos</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.failedEvents}</div>
              <div className="text-sm text-gray-600">Falhas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.criticalEvents}</div>
              <div className="text-sm text-gray-600">Críticos</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics.topActions.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.action}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statistics.topCategories.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(item.category)}
                      <span className="text-sm">{item.category}</span>
                    </div>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Logs de Auditoria
        </h2>
        <div className="flex gap-2">
          <Button
            variant={currentView === 'logs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('logs')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Logs
          </Button>
          <Button
            variant={currentView === 'alerts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('alerts')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertas ({alerts.filter(a => !a.resolved).length})
          </Button>
          <Button
            variant={currentView === 'statistics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('statistics')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Estatísticas
          </Button>
        </div>
      </div>

      {/* Filtros (apenas para logs) */}
      {currentView === 'logs' && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar ação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-md px-3 py-2"
              >
                <option value="">Todas as categorias</option>
                <option value="authentication">Autenticação</option>
                <option value="content">Conteúdo</option>
                <option value="settings">Configurações</option>
                <option value="ecommerce">E-commerce</option>
                <option value="security">Segurança</option>
                <option value="system">Sistema</option>
              </select>
              
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="border rounded-md px-3 py-2"
              >
                <option value="">Todas as severidades</option>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>

              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Data inicial"
              />
              
              <Button onClick={() => loadLogs()} disabled={loading}>
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={generateReport} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
              <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo */}
      {currentView === 'logs' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum log encontrado</h3>
                <p className="text-gray-600">Tente ajustar os filtros ou período</p>
              </CardContent>
            </Card>
          ) : (
            logs.map(renderLogItem)
          )}
        </div>
      )}

      {currentView === 'alerts' && renderAlerts()}
      {currentView === 'statistics' && renderStatistics()}
    </div>
  );
}