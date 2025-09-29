import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircleIcon,
  SendIcon,
  UploadIcon,
  BotIcon,
  ClockIcon,
  RefreshCcwIcon,
} from "lucide-react";
import { DashboardCardSkeleton } from "@/components/ui/loading-skeletons";

/* ===== react-chat-elements (histórico estilo WhatsApp) ===== */
import { MessageList } from "react-chat-elements";
import "react-chat-elements/dist/main.css";
/* CSS de overrides para visual dark/WhatsApp */
import "@/styles/chat-overrides.css";

/* ================== Tipos ================== */
type MsgType = "received" | "sent" | "auto_response";
type MsgStatus = "sent" | "delivered" | "read" | undefined;

type WaItem = {
  id: string;
  phoneNumber: string;   // E.164 (ex: 5596981032928)
  contactName?: string;
  message: string;
  timestamp: string;     // ISO
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
const fmtPhoneBR = (p: string) =>
  p.replace(/^(\+?55)/, "").replace(/(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");

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

  const [items, setItems] = useState<WaItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // envio unitário
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");

  // envio em massa
  const [bulkRows, setBulkRows] = useState<Array<{ phone: string; nome?: string }>>([]);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; ok: number; fail: number }>({
    total: 0,
    ok: 0,
    fail: 0,
  });

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSendText = Boolean(phone.trim() && text.trim());

  /* --------- carregar histórico (GAS) --------- */
  async function fetchMessages() {
    setLoading(true);
    setError(null);
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
      if (!r.ok) throw new Error(`Falha ao carregar (${r.status})`);
      const data = await r.json();
      if (!data?.ok) throw new Error(data?.error || "Erro ao listar mensagens");

      const mapped: WaItem[] = (data.items || []).map((m: any) => {
        // Heurística para direção:
        // - Preferir 'direction' vindo do GAS (in/out)
        // - Se não houver, considerar 'from' diferente do seu número como recebido
        const direction = (m.direction || "").toString().toLowerCase();
        const isIn = direction === "in" || direction === "received";
        return {
          id: String(m.id ?? m.msg_id ?? Math.random()),
          phoneNumber: String(m.from || m.phone || m.msisdn || ""),
          contactName: m.name || m.contactName || fmtPhoneBR(String(m.from || m.phone || "")),
          message: String(m.text || m.message || ""),
          timestamp: String(m.timestamp || m.ts || new Date().toISOString()),
          type: isIn ? "received" : m.auto ? "auto_response" : "sent",
          status: m.status as MsgStatus,
        };
      });

      setItems(mapped);

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
      setError(e?.message || "Falha ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  /* --------- enviar texto --------- */
  async function sendText() {
    if (!canSendText) return;
    setSending(true);
    setError(null);
    try {
      // substituições (tudo pelo conteúdo da mensagem)
      const msg = applyVars(text, {
        saudacao: saudacao(),
        nome: "",
        data: nowDate(),
        hora: nowTime(),
      });

      const r = await fetch("/.netlify/functions/client-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wa_send_text",
          site: siteSlug,
          to: phone.replace(/\D/g, ""),
          text: msg,
          pin: vipPin || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error || "Erro ao enviar");

      // otimista
      setItems((prev) => [
        ...prev,
        {
          id: (crypto as any).randomUUID?.() ?? String(Math.random()),
          phoneNumber: phone.replace(/\D/g, ""),
          contactName: fmtPhoneBR(phone),
          message: msg,
          timestamp: new Date().toISOString(),
          type: "sent",
          status: "sent",
        },
      ]);

      setText("");
      setPhone("");
      fetchMessages();
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  /* --------- upload CSV (phone,nome) --------- */
  function parseCSV(content: string) {
    // Cabeçalho esperado: phone[,nome]. Aceita ; ou , como separador.
    const rows = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!rows.length) return [];
    const sep = rows[0].includes(";") ? ";" : ",";
    const header = rows[0].split(sep).map((h) => h.trim().toLowerCase());
    const pIdx = header.indexOf("phone");
    const nIdx = header.indexOf("nome");
    if (pIdx < 0) return [];

    const out: Array<{ phone: string; nome?: string }> = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(sep);
      const phone = (cols[pIdx] || "").replace(/\D/g, "");
      if (!phone) continue;
      const nome = nIdx >= 0 ? (cols[nIdx] || "").trim() : undefined;
      out.push({ phone, nome });
    }
    return out;
  }

  async function onUploadCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      alert("Envie um .csv (Excel > Salvar como CSV). Cabeçalhos: phone,nome");
      return;
    }
    const content = await f.text();
    const rows = parseCSV(content);
    setBulkRows(rows);
    setBulkProgress({ total: rows.length, ok: 0, fail: 0 });
  }

  async function sendBulk() {
    if (!bulkRows.length || !text.trim()) return;
    setBulkSending(true);
    setError(null);
    const total = bulkRows.length;
    let ok = 0,
      fail = 0;

    for (const row of bulkRows) {
      const msg = applyVars(text, {
        saudacao: saudacao(),
        nome: row.nome || "",
        data: nowDate(),
        hora: nowTime(),
      });

      try {
        const r = await fetch("/.netlify/functions/client-api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "wa_send_text",
            site: siteSlug,
            to: row.phone,
            text: msg,
            pin: vipPin || undefined,
          }),
        });
        const data = await r.json();
        if (r.ok && data?.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
      setBulkProgress({ total, ok, fail });
    }

    setBulkSending(false);
    fetchMessages();
  }

  /* --------- inserir variável no campo de mensagem --------- */
  function insertVar(token: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setText((prev) => (prev ? `${prev} ${token}` : token));
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const value = ta.value;
    const next = value.slice(0, start) + token + value.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  /* --------- efeitos --------- */
  useEffect(() => {
    if (!siteSlug || !vipPin) return;
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSlug, vipPin]);

  if (!siteSlug || !vipPin) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageCircleIcon className="w-5 h-5" />
            WhatsApp Business
          </CardTitle>
          <CardDescription className="text-slate-400">Acesso restrito: PIN VIP necessário.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400 text-sm">Informe seu PIN VIP no topo do Dashboard.</div>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <DashboardCardSkeleton />;

  /* ===== Adapter p/ react-chat-elements ===== */
  const rceData = [...items]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((m) => {
      const mine = m.type !== "received";
      return {
        position: (mine ? "right" : "left") as "right" | "left",
        type: "text",
        text: m.message || " ", // evita caixa vazia
        date: new Date(m.timestamp),
        title: mine ? undefined : m.contactName || fmtPhoneBR(m.phoneNumber),
        status: mine ? (m.status === "read" ? "read" : "sent") : undefined,
      };
    });

  return (
    <Card className="rounded-2xl border border-white/10 bg-[#0e1729] text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageCircleIcon className="w-5 h-5" />
              WhatsApp Business
            </CardTitle>
            <CardDescription className="text-slate-400">
              Envio para contato único ou lista (CSV). Personalize pela mensagem.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
  <Badge className="px-3 py-1 rounded-full border border-green-400/20 bg-green-400/10 text-green-400">
    <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
    Ativo
  </Badge>

  {/* usar variant="ghost" para evitar botão branco */}
  <Button
    type="button"
    variant="ghost"
    onClick={fetchMessages}
    className="text-white hover:bg-white/10"
  >
    <RefreshCcwIcon className="w-4 h-4 mr-2" />
    Atualizar
  </Button>
</div>
</CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat title="Total de mensagens" value={stats.totalMessages} />
            <Stat title="Conversas ativas" value={stats.activeConversations} />
            <Stat title="Respostas automáticas" value={stats.autoResponses} />
            <Stat title="Taxa de resposta" value={`${stats.responseRate}%`} />
          </div>
        )}

        {/* Histórico (react-chat-elements) */}
        <div className="rounded-xl border border-white/10 bg-[#0b1324]">
          <div className="px-4 py-2 border-b border-white/10 text-xs text-white/60 flex items-center justify-between">
            <span>Histórico (GAS) — mais recentes no final</span>
            <button
              type="button"
              onClick={fetchMessages}
              className="text-[11px] px-2 py-1 rounded border border-white/15 hover:bg-white/10"
              title="Atualizar"
            >
              Atualizar
            </button>
          </div>

          <div ref={listRef} className="max-h-[460px] overflow-y-auto p-2 rce-wrap">
            {rceData.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <MessageCircleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Nenhuma conversa ainda.
              </div>
            ) : (
              <MessageList className="rce-chat-list" lockable toBottomHeight="100%" dataSource={rceData} />
            )}
          </div>
        </div>

        {/* Envio unitário / em massa */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Número do WhatsApp</label>
              <Input
                inputMode="numeric"
                placeholder="(96) 98103-2928"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder-slate-400"
              />
              <div className="text-[10px] text-white/50">Aceito: ddd + número (será convertido para E.164).</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Importar lista (CSV)</label>
              <label className="w-full">
                <input type="file" accept=".csv" onChange={onUploadCSV} className="hidden" />
                <div className="w-full h-10 rounded-md border border-dashed border-white/25 flex items-center justify-center cursor-pointer hover:bg-white/5 transition">
                  <UploadIcon className="w-4 h-4 mr-2" />
                  CSV: <span className="ml-1 opacity-80">phone,nome</span>
                </div>
              </label>
              {bulkRows.length > 0 && (
                <div className="text-[10px] text-emerald-300">{bulkRows.length} contatos carregados</div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Mensagem (use os chips para personalizar)</label>
            <Textarea
              ref={textareaRef}
              placeholder="Ex.: {{saudacao}} {{nome}}, tudo bem? Passando para avisar que hoje ({{data}}) temos uma condição especial."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder-slate-400 min-h-24"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_VARS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.label)}
                  className="text-[11px] px-2 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10"
                  title={`Inserir ${v.label}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-white/50 pt-1">
              Pré-visualização rápida:{" "}
              <span className="opacity-80">
                {applyVars(text || "", {
                  saudacao: saudacao(),
                  nome: "Maria",
                  data: nowDate(),
                  hora: nowTime(),
                }) || "—"}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={sendText}
              disabled={sending || !phone.trim() || !text.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? (
                <>
                  <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <SendIcon className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>

            {bulkRows.length > 0 && (
              <Button
                type="button"
                onClick={sendBulk}
                disabled={bulkSending || !text.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {bulkSending ? "Enviando para a lista…" : `Enviar para ${bulkRows.length} contatos`}
              </Button>
            )}
          </div>

          {bulkRows.length > 0 && (
            <div className="rounded-md border border-white/15 p-3 text-sm">
              <div className="text-xs text-white/70">
                Progresso: {bulkProgress.ok} enviados • {bulkProgress.fail} falhas de {bulkProgress.total}
              </div>
            </div>
          )}
        </form>

        {/* Diretrizes rápidas */}
        <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <div className="flex items-center gap-2 mb-2">
            <BotIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Diretrizes Meta</span>
          </div>
          <ul className="text-xs text-blue-300/80 list-disc pl-5 space-y-1">
            <li>
              Personalização é feita <strong>no texto</strong> com os chips acima (
              <code>{`{{saudacao}}`}</code>, <code>{`{{nome}}`}</code>, <code>{`{{data}}`}</code>,{" "}
              <code>{`{{hora}}`}</code>).
            </li>
            <li>Dentro de 24h: mensagem livre. Fora de 24h: usar template aprovado pela Meta.</li>
            <li>Envie apenas para contatos com consentimento e ofereça opt-out quando necessário.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/* ================== Subcomponentes UI ================== */
function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-slate-400 uppercase tracking-wide">{title}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
