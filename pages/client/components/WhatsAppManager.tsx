import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/card';
import { Button } from '../../../src/components/ui/button';
import { Input } from '../../../src/components/ui/input';
import { Textarea } from '../../../src/components/ui/textarea';
import { Badge } from '../../../src/components/ui/badge';
import { 
  MessageCircleIcon, 
  SendIcon, 
  UsersIcon,
  SettingsIcon,
  PhoneIcon,
  BotIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  ClockIcon
} from 'lucide-react';
import { DashboardCardSkeleton } from '../../../src/components/ui/loading-skeletons';

interface WhatsAppMessage {
  id: string;
  phoneNumber: string;
  contactName: string;
  message: string;
  timestamp: string;
  type: 'received' | 'sent' | 'auto_response';
  status?: 'sent' | 'delivered' | 'read';
}

interface WhatsAppStats {
  totalMessages: number;
  activeConversations: number;
  autoResponses: number;
  responseRate: number;
}

interface WhatsAppManagerProps {
  siteSlug: string;
  vipPin: string;
}

export default function WhatsAppManager({ siteSlug, vipPin }: WhatsAppManagerProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  
  // Estados para envio de mensagem
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircleIcon className="w-5 h-5" />
            WhatsApp Business
          </CardTitle>
          <CardDescription className="text-slate-400">
            Acesso restrito: Recurso VIP não disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">Este recurso requer acesso VIP.</p>
            <Button variant="outline" disabled>
              Acesso Bloqueado
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/whatsapp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_conversations',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar conversas');

      const result = await response.json();
      if (result.ok) {
        setConversations(result.conversations || []);
        
        // Calcular estatísticas
        const totalMessages = result.conversations?.length || 0;
        const uniqueNumbers = new Set(result.conversations?.map((c: any) => c.phoneNumber) || []).size;
        const autoResponses = result.conversations?.filter((c: any) => c.type === 'auto_response').length || 0;
        
        setStats({
          totalMessages,
          activeConversations: uniqueNumbers,
          autoResponses,
          responseRate: totalMessages > 0 ? Math.round((autoResponses / totalMessages) * 100) : 0
        });
        
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar conversas:', err);
      setError(err.message);
      
      // Dados mock para desenvolvimento
      setStats({
        totalMessages: 42,
        activeConversations: 8,
        autoResponses: 28,
        responseRate: 67
      });
      
      setConversations([
        {
          id: '1',
          phoneNumber: '+5596991234567',
          contactName: 'Maria Silva',
          message: 'Olá! Gostaria de saber mais sobre seus serviços.',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'received'
        },
        {
          id: '2',
          phoneNumber: '+5596991234567',
          contactName: 'Sistema',
          message: '👋 Olá! Obrigado por entrar em contato. Como posso ajudá-lo hoje?',
          timestamp: new Date(Date.now() - 290000).toISOString(),
          type: 'auto_response',
          status: 'delivered'
        },
        {
          id: '3',
          phoneNumber: '+5596987654321',
          contactName: 'João Santos',
          message: 'Quanto custa um site?',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          type: 'received'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!phoneNumber || !message) return;
    
    setSending(true);
    
    try {
      const response = await fetch('/.netlify/functions/whatsapp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          siteSlug,
          vipPin,
          phoneNumber,
          message
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar mensagem');

      const result = await response.json();
      if (result.ok) {
        setMessage('');
        setPhoneNumber('');
        await loadConversations(); // Recarregar conversas
      } else {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const sendTemplate = async (templateName: string, phone: string) => {
    try {
      const response = await fetch('/.netlify/functions/whatsapp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_template',
          siteSlug,
          vipPin,
          phoneNumber: phone,
          templateName
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar template');

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Erro ao enviar template');
      }
      
      await loadConversations();
    } catch (err: any) {
      console.error('Erro ao enviar template:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [siteSlug, vipPin]);

  const formatPhone = (phone: string) => {
    return phone.replace(/^\+55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'auto_response': return <BotIcon className="w-4 h-4 text-blue-400" />;
      case 'sent': return <SendIcon className="w-4 h-4 text-green-400" />;
      default: return <MessageCircleIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageCircleIcon className="w-5 h-5" />
              WhatsApp Business
            </CardTitle>
            <CardDescription className="text-slate-400">
              Chatbot automático e gestão de conversas
            </CardDescription>
          </div>
          <Badge className="px-3 py-1 rounded-full border border-green-400/20 bg-green-400/10 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
            Ativo
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Total de Mensagens</div>
              <div className="text-2xl font-bold text-white">{stats.totalMessages}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Conversas Ativas</div>
              <div className="text-2xl font-bold text-white">{stats.activeConversations}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Respostas Auto</div>
              <div className="text-2xl font-bold text-white">{stats.autoResponses}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Taxa Resposta</div>
              <div className="text-2xl font-bold text-white">{stats.responseRate}%</div>
            </div>
          </div>
        )}

        {/* Envio de Mensagem */}
        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-sm font-medium text-slate-300">Enviar Mensagem</div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Número do WhatsApp</label>
              <Input
                placeholder="(96) 99999-9999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-slate-400"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Template Rápido</label>
              <select 
                className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  if (e.target.value === 'welcome') {
                    setMessage('👋 Olá! Obrigado por entrar em contato. Como posso ajudá-lo hoje?');
                  } else if (e.target.value === 'info') {
                    setMessage('📋 Nossos serviços incluem: Desenvolvimento de Sites, Marketing Digital, SEO e muito mais. Gostaria de saber mais sobre algum específico?');
                  }
                }}
              >
                <option value="">Selecionar template</option>
                <option value="welcome">Boas-vindas</option>
                <option value="info">Informações de serviços</option>
                <option value="budget">Solicitar orçamento</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Mensagem</label>
            <Textarea
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder-slate-400 min-h-20"
            />
          </div>

          <Button 
            onClick={sendMessage}
            disabled={sending || !phoneNumber || !message}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {sending ? (
              <>
                <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <SendIcon className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </div>

        {/* Conversas Recentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">Conversas Recentes</div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadConversations}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Atualizar
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MessageCircleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa ainda</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div key={conv.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getMessageIcon(conv.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">
                            {conv.contactName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatPhone(conv.phoneNumber)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2">
                          {conv.message}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">
                        {new Date(conv.timestamp).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {conv.status === 'delivered' && (
                        <CheckCircleIcon className="w-3 h-3 text-green-400" />
                      )}
                    </div>
                  </div>
                  
                  {conv.type === 'received' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => sendTemplate('welcome', conv.phoneNumber)}
                        className="text-xs border-white/20 text-white hover:bg-white/10"
                      >
                        Resposta Rápida
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => setPhoneNumber(conv.phoneNumber)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Responder
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Configuração de Chatbot */}
        <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <div className="flex items-center gap-2 mb-2">
            <BotIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Chatbot Automático</span>
          </div>
          <p className="text-xs text-blue-300/80 mb-3">
            O chatbot responde automaticamente às mensagens com base em palavras-chave predefinidas.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs">
            <div className="text-blue-300">• Saudações automáticas</div>
            <div className="text-blue-300">• Informações de serviços</div>
            <div className="text-blue-300">• Coleta de leads</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}