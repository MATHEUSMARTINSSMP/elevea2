import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle as MessageCircleIcon,
  Send as SendIcon,
  Bot as BotIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
} from 'lucide-react';
import { DashboardCardSkeleton as ExternalSkeleton } from '@/components/ui/loading-skeletons';

/* ====== Skeleton local (fallback) ====== */
const LocalSkeleton = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 text-white p-6 animate-pulse">
    <div className="h-6 w-48 bg-white/10 rounded mb-4" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/10 rounded" />)}
    </div>
  </div>
);
const SafeSkeleton = () => (ExternalSkeleton ? <ExternalSkeleton /> : <LocalSkeleton />);

/* ====== Tipos ====== */
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

/* ====== Helpers ====== */
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
const toE164BR = (s: string) => onlyDigits(s);            // backend já espera só dígitos
const fmtPhoneBR = (s: string) =>
  onlyDigits(s).replace(/^55/, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

/* ========= API base (client-api) ========= */
async function CALL(action: string, payload: Record<string, any>) {
  const r = await fetch('/.netlify/functions/client-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return r.json();
}

/* ========= Componente ========= */
export default function WhatsAppManager({ siteSlug, vipPin }: WhatsAppManagerProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);

  // envio
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(''); // ex: 'hello_world'

  // Guarda de segurança VIP
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircleIcon className="w-5 h-5" />
            WhatsApp Business
          </CardTitle>
          <CardDescription className="text-slate-400">Acesso restrito: Recurso VIP não disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">Este recurso requer acesso VIP.</p>
            <Button variant="outline" disabled>Acesso Bloqueado</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ====== Carregar histórico (planilha whatsapp_messages) via wa_list_messages ====== */
  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await CALL('wa_list_messages', { site: siteSlug, page: 1, pageSize: 50 });
      if (!res?.ok) throw new Error(res?.error || 'Falha ao carregar mensagens');
      const items: any[] = res.items || [];

      // normalização p/ a UI
      const convs: WhatsAppMessage[] = items.map((it, idx) => ({
        id: String(it.id || it.msg_id || idx),
        phoneNumber: String(it.from || it.to || ''),
        contactName: it.from ? 'Contato' : 'Sistema',
        message: String(it.text || ''),
        timestamp: String(it.timestamp || it.ts || new Date().toISOString()),
        type: it.type === 'text' && it.from ? 'received' : it.type === 'text' ? 'sent' : 'auto_response',
        status: it.status && ['sent', 'delivered', 'read'].includes(String(it.status)) ? it.status : undefined,
      }));

      setConversations(convs);

      // estatísticas simples
      const totalMessages = convs.length;
      const unique = new Set(convs.map(c => c.phoneNumber)).size;
      const autoResponses = convs.filter(c => c.type === 'auto_response').length;
      setStats({
        totalMessages,
        activeConversations: unique,
        autoResponses,
        responseRate: totalMessages ? Math.round((autoResponses / totalMessages) * 100) : 0,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar conversas');
      // mantém UI funcional mesmo sem histórico
      setStats({ totalMessages: 0, activeConversations: 0, autoResponses: 0, responseRate: 0 });
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  /* ====== Enviar ====== */
  const sendText = async (to: string, body: string) => {
    return CALL('wa_send_text', { site: siteSlug, to: toE164BR(to), text: body });
  };
  const sendTemplate = async (to: string, template: string, lang = 'en_US') => {
    return CALL('wa_send_template', { site: siteSlug, to: toE164BR(to), template, lang });
  };

  const handleSend = async () => {
    if (!phoneNumber || (!message && !selectedTemplate)) return;
    setSending(true);
    setError(null);
    try {
      if (selectedTemplate) {
        // fora da janela 24h ou 1º contato → Template aprovado
        const r = await sendTemplate(phoneNumber, selectedTemplate);
        if (!r?.ok) throw new Error(r?.error || 'Erro ao enviar template');
      } else {
        // dentro da janela 24h
        const texto = message
          .replace(/\{\{saudacao\}\}/g, greet());
        const r = await sendText(phoneNumber, texto);
        if (r?.code === 470) {
          throw new Error('Conversa fora da janela de 24h. Envie um Template aprovado.');
        }
        if (!r?.ok) throw new Error(r?.error || 'Erro ao enviar mensagem');
      }
      setMessage('');
      setPhoneNumber('');
      setSelectedTemplate('');
      await loadConversations();
    } catch (err: any) {
      setError(err.message || 'Falha no envio');
    } finally {
      setSending(false);
    }
  };

  /* ====== Efeitos ====== */
  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSlug, vipPin]);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'auto_response': return <BotIcon className="w-4 h-4 text-blue-400" />;
      case 'sent': return <SendIcon className="w-4 h-4 text-green-400" />;
      default: return <MessageCircleIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) return <SafeSkeleton />;

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
              Chatbot automático e gestão de conversas (API oficial)
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

        {/* Envio */}
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
              <label className="text-xs text-slate-400">Template aprovado (opcional)</label>
              <select
                className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">— Selecionar template —</option>
                {/* Ajuste para os nomes reais aprovados na sua conta Meta */}
                <option value="hello_world">hello_world (en_US)</option>
              </select>
            </div>
          </div>

          {!selectedTemplate && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Mensagem (dentro de 24h)</label>
              <Textarea
                placeholder="Use variáveis como {{saudacao}}. Ex.: {{saudacao}}! Obrigado por entrar em contato."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-slate-400 min-h-20"
              />
              {message && (
                <div className="text-xs text-slate-400">
                  Preview: {message.replace(/\{\{saudacao\}\}/g, greet())}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !phoneNumber || (!message && !selectedTemplate)}
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
                Enviar
              </>
            )}
          </Button>

          <div className="text-xs text-slate-400">
            Fora da janela de 24h a Meta exige uso de <b>Template aprovado</b>.
          </div>
        </div>

        {/* Conversas Recentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">Conversas Recentes</div>
            <Button size="sm" variant="outline" onClick={loadConversations} className="border-white/20 text-white hover:bg-white/10">
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
                            {fmtPhoneBR(conv.phoneNumber)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2">{conv.message}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">
                        {new Date(conv.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {conv.status === 'delivered' && <CheckCircleIcon className="w-3 h-3 text-green-400" />}
                    </div>
                  </div>

                  {conv.type === 'received' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setSending(true);
                          try {
                            const r = await sendTemplate(conv.phoneNumber, 'hello_world');
                            if (!r?.ok) throw new Error(r?.error || 'Erro');
                            await loadConversations();
                          } catch (e: any) {
                            setError(e.message || 'Falha no envio');
                          } finally {
                            setSending(false);
                          }
                        }}
                        className="text-xs border-white/20 text-white hover:bg-white/10"
                      >
                        Resposta Rápida (template)
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

        {/* Info chatbot */}
        <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <div className="flex items-center gap-2 mb-2">
            <BotIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Chatbot Automático</span>
          </div>
          <p className="text-xs text-blue-300/80 mb-3">
            Responde automaticamente com base nas regras configuradas no backend (GAS).
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
