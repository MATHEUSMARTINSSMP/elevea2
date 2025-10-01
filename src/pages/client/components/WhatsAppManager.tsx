import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Upload,
  Bot,
  Clock,
  RefreshCw,
  Search,
  Phone,
  User
} from "lucide-react";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeletons";

/* CSS de overrides para visual dark/WhatsApp */
import "@/styles/chat-overrides.css";

/* ================== Tipos ================== */
type MsgType = "received" | "sent" | "auto_response";
type MsgStatus = "sent" | "delivered" | "read" | undefined;

type WaItem = {
  id: string;
  phoneNumber: string;
  contactName?: string;
  message: string;
  timestamp: string;
  type: MsgType;
  status?: MsgStatus;
};

type Stats = {
  totalMessages: number;
  activeConversations: number;
  autoResponses: number;
  responseRate: number;
};

export interface WhatsAppManagerProps {
  siteSlug: string;
  vipPin: string;
}

/* ================== Utils ================== */
const fmtPhoneBR = (p: string) => {
  const clean = p.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return p;
};

  const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

  /**
   * Normaliza para E.164 BR (celular): 55 + DDD + 9 + 8 dígitos.
   * Tolera prefixos (0XX), duplicação de 55 e "lixo" à esquerda.
   * Estratégia: pega dos *últimos* 11 ou 10 dígitos úteis.
   */
  const toE164CellBR = (raw: string): string => {
    let d = onlyDigits(raw);
    // remove 55 extra no começo
    if (d.startsWith("55")) d = d.slice(2);
    // remove zeros/carrier à esquerda mantendo o final
    // (não precisamos adivinhar o prefixo; vamos extrair do fim)
    if (d.length >= 12 && d[0] === "0") {
      // pode ter 0 + operadora (2 dígitos). descartamos pelo método do "slice do fim"
    }

    if (d.length >= 11) {
      // pega os últimos 11 dígitos (esperado: DDD + 9 + 8)
      let n11 = d.slice(-11);
      const ddd = n11.slice(0, 2);
      let rest = n11.slice(2); // 9 dígitos
      if (rest.length !== 9) return "";
      if (rest[0] !== "9") rest = "9" + rest.slice(0, 8); // força o 9
      return "55" + ddd + rest;
    }

    if (d.length === 10) {
      // DDD + 8 → vira DDD + 9 + 8
      const ddd = d.slice(0, 2);
      const line8 = d.slice(2);
      return "55" + ddd + "9" + line8;
    }

    // números sem DDD ou muito curtos: inválido para o seu caso
    return "";
  };

  // Manter compatibilidade
  const normalizePhone = toE164CellBR;

  type Contact = { phone: string; name?: string; [k: string]: any };

  const consolidateContacts = (contacts: Contact[]) => {
    const byPhone = new Map<string, Contact>();

    for (const c of contacts) {
      const key = toE164CellBR(c.phone || "");
      if (!key) continue;

      const prev = byPhone.get(key);
      if (!prev) {
        byPhone.set(key, { ...c, phone: key });
        continue;
      }

      // mantém o "melhor" nome: prioriza nomes reais (não números formatados)
      const currName = (c.name || "").trim();
      const prevName = (prev.name || "").trim();
      
      // Função para verificar se é um nome real (não número formatado)
      const isRealName = (s: string) => {
        return s && s !== "Contato" && !s.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/) && s.length >= 3;
      };

      if (isRealName(currName) && (!isRealName(prevName) || currName.length > prevName.length)) {
        prev.name = currName;
      }

      // pode mesclar outros campos conforme sua regra
      byPhone.set(key, { ...prev, ...c, phone: key });
    }

    return Array.from(byPhone.values());
  };

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const nowDate = () =>
  new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const nowTime = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const applyVars = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");

/* Variáveis disponíveis (chips) — tudo via mensagem */
const AVAILABLE_VARS = [
  { key: "saudacao", label: "{{saudacao}}" },
  { key: "nome", label: "{{nome}}" },
  { key: "data", label: "{{data}}" },
  { key: "hora", label: "{{hora}}" },
];

/* ================== Componente ================== */
export default function WhatsAppManager({ siteSlug, vipPin }: WhatsAppManagerProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const [items, setItems] = useState<WaItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Array<{ phone: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState("");
  const [selectedContact, setSelectedContact] = useState<{ phone: string; name: string } | null>(null);
  const [conversationItems, setConversationItems] = useState<WaItem[]>([]);

  const listRef = useRef<HTMLDivElement>(null);

  // Guarda de segurança - verificar se props VIP estão presentes
  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
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

  /* --------- carregar histórico geral --------- */
  async function loadHistory(retry = false) {
    if (!retry) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const r = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wa_list_messages",
          site: siteSlug,
          page: 1,
          pageSize: 50,
          pin: vipPin || undefined,
        }),
      });
      
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(`HTTP ${r.status}: ${errorText}`);
      }
      
      const data = await r.json();
      if (!data?.ok) {
        throw new Error(data?.error || "Erro ao listar mensagens");
      }

      const mapped: WaItem[] = (data.items || []).map((m: any) => {
        // LÓGICA CORRIGIDA: Usar os campos do GAS
        const isReceived = m.isReceived === true || m.direction === 'in';
        const isSent = m.isReceived === false || m.direction === 'out';
        const isAuto = m.type === "auto_response" || m.auto === true;
        
        let messageType: MsgType = "sent";
        if (isReceived) {
          messageType = "received";
        } else if (isAuto) {
          messageType = "auto_response";
        } else if (isSent) {
          messageType = "sent";
        }
        
        // Usar os campos já processados pelo GAS
        const phoneNumber = String(m.phoneNumber || m.contactPhone || "");
        const contactName = m.contactName || m.name || (phoneNumber ? fmtPhoneBR(phoneNumber) : "Contato");
        
        return {
          id: String(m.id ?? m.msg_id ?? Math.random()),
          phoneNumber: phoneNumber,
          contactName: contactName,
          message: String(m.text || m.message || ""),
          timestamp: String(m.timestamp || m.ts || new Date().toISOString()),
          type: messageType,
          status: m.status as MsgStatus,
        };
      });

      setItems(mapped);

      // Debug: verificar tipos de mensagens e normalização
      console.log('Mensagens carregadas:', {
        total: mapped.length,
        received: mapped.filter(m => m.type === 'received').length,
        sent: mapped.filter(m => m.type === 'sent').length,
        auto: mapped.filter(m => m.type === 'auto_response').length,
        byPhone: mapped.reduce((acc, m) => {
          const phone = m.phoneNumber;
          if (!acc[phone]) acc[phone] = { received: 0, sent: 0, original: m.phoneNumber };
          if (m.type === 'received') acc[phone].received++;
          if (m.type === 'sent') acc[phone].sent++;
          return acc;
        }, {}),
        normalization: mapped.slice(0, 5).map(m => ({
          original: m.phoneNumber,
          normalized: m.phoneNumber,
          type: m.type
        }))
      });

      // estatísticas simples
      const totalMessages = mapped.length;
      const unique = new Set(mapped.map((i) => i.phoneNumber)).size;
      const auto = mapped.filter((i) => i.type === "auto_response").length;

      setStats({
        totalMessages,
        activeConversations: unique,
        autoResponses: auto,
        responseRate: totalMessages ? Math.round((auto / totalMessages) * 100) : 0,
      });

      // rolar para o fim
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 150);
    } catch (e: any) {
      const errorMsg = e?.message || "Falha ao carregar histórico";
      setError(errorMsg);
      setLastError(errorMsg);
      
      // Retry automático (máximo 3 tentativas)
      if (retryCount < 3 && !retry) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          console.log(`Tentativa ${retryCount + 1} de carregar histórico...`);
          loadHistory(true);
        }, 2000 * (retryCount + 1)); // Delay progressivo: 2s, 4s, 6s
      } else if (retryCount >= 3) {
        console.error('Máximo de tentativas atingido para carregar histórico');
      }
    } finally {
      setLoading(false);
    }
  }

  /* --------- carregar conversa específica --------- */
  async function loadConversation(contact: { phone: string; name: string }) {
    setSelectedContact(contact);
    setPhone(contact.phone);
    
    // Filtrar mensagens apenas deste contato (usando telefone normalizado)
    const normalizedContactPhone = toE164CellBR(contact.phone);
    const contactMessages = items.filter(item => {
      const itemNormalized = toE164CellBR(item.phoneNumber);
      return itemNormalized === normalizedContactPhone;
    });
    
    // Ordenar mensagens por timestamp (mais antiga primeiro para chat)
    const sortedMessages = contactMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log('Conversa carregada:', {
      contact: contact.phone,
      normalized: normalizedContactPhone,
      messages: sortedMessages.length,
      messageTypes: sortedMessages.map(m => ({ type: m.type, text: m.message.substring(0, 20) }))
    });
    
    setConversationItems(sortedMessages);
    
    // Rolar para o fim da conversa
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }
    }, 100);
  }

  /* --------- auto-refresh das mensagens --------- */
  async function autoRefreshMessages() {
    try {
      const r = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wa_list_messages",
          site: siteSlug,
          page: 1,
          pageSize: 50,
          pin: vipPin || undefined,
        }),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (!data?.ok) return;

      const mapped: WaItem[] = (data.items || []).map((m: any) => {
        // LÓGICA CORRIGIDA: Usar os campos do GAS
        const isReceived = m.isReceived === true || m.direction === 'in';
        const isSent = m.isReceived === false || m.direction === 'out';
        const isAuto = m.type === "auto_response" || m.auto === true;
        
        let messageType: MsgType = "sent";
        if (isReceived) {
          messageType = "received";
        } else if (isAuto) {
          messageType = "auto_response";
        } else if (isSent) {
          messageType = "sent";
        }
        
        // Usar os campos já processados pelo GAS
        const phoneNumber = String(m.phoneNumber || m.contactPhone || "");
        const contactName = m.contactName || m.name || (phoneNumber ? fmtPhoneBR(phoneNumber) : "Contato");
        
        return {
          id: String(m.id ?? m.msg_id ?? Math.random()),
          phoneNumber: phoneNumber,
          contactName: contactName,
          message: String(m.text || m.message || ""),
          timestamp: String(m.timestamp || m.ts || new Date().toISOString()),
          type: messageType,
          status: m.status as MsgStatus,
        };
      });

      // Verificar se há mensagens novas
      const currentIds = new Set(items.map(i => i.id));
      const newMessages = mapped.filter(m => !currentIds.has(m.id));
      
      if (newMessages.length > 0) {
        setItems(mapped);
        
        // Se estiver em uma conversa específica, atualizar também
        if (selectedContact) {
          const normalizedContactPhone = toE164CellBR(selectedContact.phone);
          const contactMessages = mapped.filter(item => {
            const itemNormalized = toE164CellBR(item.phoneNumber);
            return itemNormalized === normalizedContactPhone;
          });
          
          // Ordenar mensagens por timestamp (mais antiga primeiro para chat)
          const sortedMessages = contactMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setConversationItems(sortedMessages);
        }
        
        // Rolar para o fim se houver mensagens novas
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
          }
        }, 100);
      }
    } catch (e) {
      console.error("Erro no auto-refresh:", e);
    }
  }

  /* --------- enviar texto --------- */
  async function sendText() {
    if (!phone.trim() || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      // substituições (tudo pelo conteúdo da mensagem)
      const msg = applyVars(text, {
        saudacao: saudacao(),
        nome: selectedContact?.name || "",
        data: nowDate(),
        hora: nowTime(),
      });

      const r = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wa_send_text",
          site: siteSlug,
          to: toE164CellBR(phone),
          text: msg,
          pin: vipPin || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error || "Erro ao enviar");

      // Criar mensagem enviada
      const sentMessage = {
        id: (crypto as any).randomUUID?.() ?? String(Math.random()),
        phoneNumber: toE164CellBR(phone),
        contactName: selectedContact?.name || fmtPhoneBR(phone),
        message: msg,
        timestamp: new Date().toISOString(),
        type: "sent" as MsgType,
        status: "sent" as MsgStatus,
      };

      // Atualizar lista geral
      setItems((prev) => [...prev, sentMessage]);

      // Se estiver em uma conversa específica, atualizar também
      if (selectedContact) {
        const updatedConversation = [...conversationItems, sentMessage];
        // Ordenar por timestamp (mais antiga primeiro para chat)
        const sortedConversation = updatedConversation.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setConversationItems(sortedConversation);
      }

      setText("");
      
      // Se não estiver em uma conversa específica, limpar o telefone
      if (!selectedContact) {
        setPhone("");
      }
      
      // rolar para o fim suavemente
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 100);
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  /* --------- carregar contatos --------- */
  async function loadContacts() {
    try {
      const r = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wa_list_contacts",
          site: siteSlug,
          pin: vipPin || undefined,
        }),
      });
      if (!r.ok) {
        console.error("Erro ao carregar contatos:", r.status);
        return;
      }
      const data = await r.json();
      console.log("Dados dos contatos:", data);
      
      if (data?.ok && data.contacts && data.contacts.length > 0) {
        console.log('Contatos carregados da API:', data.contacts);
        setContacts(data.contacts);
      } else {
        // Fallback: criar contatos baseados nas mensagens
        console.log('Criando contatos baseados nas mensagens...');
        const uniqueContacts = new Map();
        items.forEach(item => {
          if (item.phoneNumber && item.contactName) {
            // Usar telefone normalizado como chave para evitar duplicatas
            const normalizedPhone = toE164CellBR(item.phoneNumber);
            console.log('Normalizando contato:', {
              original: item.phoneNumber,
              normalized: normalizedPhone,
              name: item.contactName
            });
            
            if (!uniqueContacts.has(normalizedPhone)) {
              // Se não tem nome real, usar número formatado como fallback
              const displayName = (item.contactName && item.contactName !== "Contato") 
                ? item.contactName 
                : fmtPhoneBR(item.phoneNumber);
              
              uniqueContacts.set(normalizedPhone, {
                phone: normalizedPhone,
                name: displayName
              });
            } else {
              // Se já existe, atualizar o nome se for melhor
              const existing = uniqueContacts.get(normalizedPhone);
              const isRealName = (s: string) => {
                return s && s !== "Contato" && !s.match(/^\(\d{2}\)\s\d{4,5}-\d{4}$/) && s.length >= 3;
              };
              
              if (isRealName(item.contactName) && !isRealName(existing.name)) {
                existing.name = item.contactName;
              }
            }
          }
        });
        const contactsArray = Array.from(uniqueContacts.values());
        console.log('Contatos criados:', contactsArray);
        console.log('Primeiro contato:', contactsArray[0]);
        
        // Consolidar contatos duplicados
        const consolidatedContacts = consolidateContacts(contactsArray);
        console.log('Contatos consolidados:', consolidatedContacts);
        setContacts(consolidatedContacts);
      }
    } catch (e) {
      console.error("Erro ao carregar contatos:", e);
      // Fallback: criar contatos baseados nas mensagens
      const uniqueContacts = new Map();
      items.forEach(item => {
        if (item.phoneNumber && item.contactName) {
          // Usar telefone normalizado como chave para evitar duplicatas
          const normalizedPhone = toE164CellBR(item.phoneNumber);
          if (!uniqueContacts.has(normalizedPhone)) {
            // Se não tem nome real, usar número formatado como fallback
            const displayName = (item.contactName && item.contactName !== "Contato") 
              ? item.contactName 
              : fmtPhoneBR(item.phoneNumber);
            
            uniqueContacts.set(normalizedPhone, {
              phone: normalizedPhone,
              name: displayName
            });
          }
        }
      });
      setContacts(Array.from(uniqueContacts.values()));
    }
  }

  /* --------- carregar templates --------- */
  async function loadTemplates() {
    try {
      const r = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wa_get_templates",
          site: siteSlug,
          pin: vipPin || undefined,
        }),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (data?.ok && data.templates) {
        // Implementar uso de templates se necessário
      }
    } catch (e) {
      console.error("Erro ao carregar templates:", e);
    }
  }

  /* --------- preview da mensagem --------- */
  useEffect(() => {
    const preview = applyVars(text, {
      saudacao: saudacao(),
      nome: "Cliente",
      data: nowDate(),
      hora: nowTime(),
    });
    setPreview(preview);
  }, [text]);

  /* --------- carregar dados iniciais --------- */
  useEffect(() => {
    // Teste de normalização
      console.log('Teste de normalização E.164:', {
        '559681032928': toE164CellBR('559681032928'),
        '5596981032928': toE164CellBR('5596981032928'),
        '559981032928': toE164CellBR('559981032928'),
        '5599981032928': toE164CellBR('5599981032928'),
        '9681032928': toE164CellBR('9681032928'),
        '6981032928': toE164CellBR('6981032928'),
        '081032928': toE164CellBR('081032928'),
        '81032928': toE164CellBR('81032928'),
        '961032928': toE164CellBR('961032928'),
        '96981032928': toE164CellBR('96981032928')
      });
    
    loadHistory();
    loadContacts();
    loadTemplates();
  }, [siteSlug, vipPin]);

  /* --------- auto-refresh a cada 5 segundos --------- */
  useEffect(() => {
    const interval = setInterval(() => {
      autoRefreshMessages();
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [items, selectedContact]);

  /* --------- carregar contatos quando mensagens mudarem --------- */
  useEffect(() => {
    if (items.length > 0) {
      loadContacts();
    }
  }, [items]);

  /* --------- filtros --------- */
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const canSendText = phone.trim() && text.trim() && !sending;

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageCircle className="w-4 w-4 sm:h-5 sm:w-5" />
              WhatsApp Business
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Envio para contato único ou lista (CSV). Personalize pela mensagem.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="px-3 py-1 rounded-full border border-green-400/20 bg-green-400/10 text-green-400 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2" />
              Ativo
            </Badge>
            <Button 
              onClick={loadHistory} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-blue-400 mb-1">
                {stats.totalMessages}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Total de Mensagens</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-green-400 mb-1">
                {stats.activeConversations}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Conversas Ativas</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-yellow-400 mb-1">
                {stats.autoResponses}
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Respostas Automáticas</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-purple-400 mb-1">
                {stats.responseRate}%
              </div>
              <p className="text-xs sm:text-sm text-slate-400">Taxa de Resposta</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Conversas */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">Conversas</h3>
              <RefreshCw 
                className="h-4 w-4 cursor-pointer hover:text-blue-400" 
                onClick={loadContacts}
              />
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Buscar contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-slate-400 text-sm"
              />
              
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">
                    <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Nenhum contato encontrado</p>
                  </div>
                ) : (
                  filteredContacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedContact?.phone === contact.phone 
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : 'hover:bg-white/5'
                      }`}
                      onClick={() => loadConversation(contact)}
                    >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {contact.name && contact.name.length > 0 ? contact.name.charAt(0).toUpperCase() : '?'}
                    </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {contact.name || fmtPhoneBR(contact.phone)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {contact.phone}
                        </p>
                      </div>
                      {selectedContact?.phone === contact.phone && (
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">
                {selectedContact ? `Conversa com ${selectedContact.name}` : 'WhatsApp Business'}
              </h3>
              <Badge className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border-green-500/30">
                • Online
              </Badge>
            </div>
            
            {/* Mensagens */}
            <div 
              ref={listRef}
              className="h-64 overflow-y-auto space-y-3 p-4 bg-white/5 rounded-lg border border-white/10 mb-4"
            >
              {(selectedContact ? conversationItems : items).map((item) => (
                <div
                  key={item.id}
                  className={`flex ${item.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                      item.type === 'sent'
                        ? 'bg-green-500 text-white'
                        : item.type === 'auto_response'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className="break-words">{item.message}</p>
                    <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {item.type === 'sent' && (
                        <span>✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedContact && conversationItems.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem nesta conversa</p>
                </div>
              )}
            </div>

            {/* Input de envio */}
            <div className="space-y-3">
              <Input
                inputMode="numeric"
                placeholder={selectedContact ? `Enviando para ${selectedContact.name}` : "Digite o número do cliente"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!selectedContact}
                className={`bg-white/5 border-white/10 text-white placeholder-slate-400 text-sm ${
                  selectedContact ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              
              <Textarea
                placeholder="Mensagem (use os chips para personalizar)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder-slate-400 text-sm min-h-[80px]"
              />
              
              {/* Chips de personalização */}
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARS.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => setText(prev => prev + label)}
                    className="text-xs border-white/10 text-white hover:bg-white/5 bg-white/5"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              {/* Preview */}
              {preview && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-xs text-slate-300">
                  <strong>Pré-visualização:</strong> {preview}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={sendText}
                  disabled={!canSendText}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso importante */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <h4 className="font-medium text-yellow-300 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Importante: Janela de 24 Horas do WhatsApp Business
          </h4>
          <div className="text-sm text-yellow-200 space-y-1">
            <p>• <strong>Primeira mensagem:</strong> Só pode ser enviada usando templates pré-aprovados pela Meta.</p>
            <p>• <strong>Após resposta do cliente:</strong> Você tem 24 horas para enviar mensagens livres (qualquer texto).</p>
            <p>• <strong>Fora da janela:</strong> Volta a ser necessário usar templates aprovados.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}