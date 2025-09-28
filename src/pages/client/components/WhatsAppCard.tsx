// src/pages/client/components/WhatsAppCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle as MessageCircleIcon,
  Send as SendIcon,
  Users as UsersIcon,
  Sparkles as SparklesIcon,
  FilePlus as FileIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as AudioIcon,
  X as XIcon,
  AlertCircle as AlertIcon,
  Check as CheckIcon,
  Rocket as RocketIcon,
  Contact as ContactIcon,
  FileText as TemplateIcon,
} from "lucide-react";

/* ---------- Fallback Skeleton (evita crash se o export externo não existir) ---------- */
const CardSkeleton = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-pulse">
    <div className="h-6 w-40 bg-white/10 rounded mb-4" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-white/10 rounded" />
      ))}
    </div>
  </div>
);

/* ---------- Tipagens ---------- */
type TMsg = {
  timestamp?: string;
  from?: string;
  to_display?: string;
  type?: string;
  text?: string;
};
type TTemplate = { id: string; name: string; lang: string; displayName: string; description?: string };
type TContact = { id?: string; nome: string; telefone: string; empresa?: string; email?: string; tags?: string };

/* ---------- Utils ---------- */
const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};
const processVars = (s: string, extra: Record<string, string> = {}) =>
  s
    .replace(/\{\{saudacao\}\}/g, greet())
    .replace(/\{\{data\}\}/g, new Date().toLocaleDateString("pt-BR"))
    .replace(/\{\{hora\}\}/g, new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
    .replace(/\{\{nome\}\}/g, extra.nome ?? "")
    .replace(/\{\{empresa\}\}/g, extra.empresa ?? "");

const normalizeTo = (v: string) => v.replace(/\D/g, ""); // E.164 simples no front

/* ---------- Componente ---------- */
export default function WhatsAppCard({ siteSlug, vipPin }: { siteSlug: string; vipPin: string }) {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"send" | "contacts" | "templates" | "bulk">("send");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [messages, setMessages] = useState<TMsg[]>([]);
  const [templates, setTemplates] = useState<TTemplate[]>([]);
  const [contacts, setContacts] = useState<TContact[]>([]);

  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [tplId, setTplId] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "audio" | "video" | "document" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkTplId, setBulkTplId] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const api = async (body: any) => {
    const r = await fetch("/.netlify/functions/client-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  const detectFileType = (f: File): typeof fileType => {
    const t = f.type;
    if (/^image\//.test(t)) return "image";
    if (/^audio\//.test(t)) return "audio";
    if (/^video\//.test(t)) return "video";
    return "document";
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [msgs, tpls, conts] = await Promise.all([
        api({ action: "wa_list_messages", site: siteSlug, page: 1, pageSize: 30 }),
        api({ action: "wa_get_templates", site: siteSlug }),
        api({ action: "wa_list_contacts", site: siteSlug, page: 1, pageSize: 200 }),
      ]);
      if (msgs?.ok) setMessages(msgs.items || []);
      if (tpls?.ok) setTemplates(tpls.templates || []);
      if (conts?.ok) setContacts(conts.items || []);
    } catch (e: any) {
      setError(e.message || "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!siteSlug || !vipPin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSlug, vipPin]);

  const canUseTemplate = !!tplId;
  const selectedTemplate = useMemo(() => templates.find((t) => t.id === tplId), [tplId, templates]);

  const handleSend = async () => {
    setError(null);
    setOk(null);
    if (!phone) return setError("Informe o número de WhatsApp.");
    if (!text && !tplId && !file) return setError("Digite a mensagem, selecione um template ou anexe um arquivo.");

    try {
      // 1) Mídia (Meta exige upload → backend: action 'wa_send_media')
      if (file) {
        const fr = new FileReader();
        fr.onload = async () => {
          const base64 = String(fr.result).split(",")[1] || "";
          const r = await api({
            action: "wa_send_media",
            site: siteSlug,
            to: normalizeTo(phone),
            mediaType: detectFileType(file),
            filename: file.name,
            fileData: base64,
            caption: text ? processVars(text) : undefined,
          });
          if (!r?.ok) throw new Error(r?.error || "Erro ao enviar mídia");
          setOk("Arquivo enviado!");
          clearFile();
          setText("");
          setPhone("");
          await loadAll();
        };
        fr.readAsDataURL(file);
        return;
      }

      // 2) Template (fora da janela 24h)
      if (canUseTemplate && selectedTemplate) {
        const r = await api({
          action: "wa_send_template",
          site: siteSlug,
          to: normalizeTo(phone),
          template: selectedTemplate.name,
          lang: selectedTemplate.lang,
        });
        if (!r?.ok) throw new Error(r?.error || "Erro ao enviar template");
        setOk("Template enviado!");
        setTplId("");
        setPhone("");
        await loadAll();
        return;
      }

      // 3) Texto (janela de 24h)
      const r = await api({
        action: "wa_send_text",
        site: siteSlug,
        to: normalizeTo(phone),
        text: processVars(text),
      });
      if (r?.code === 470) {
        return setError("Conversa fora da janela de 24h. Use um template aprovado.");
      }
      if (!r?.ok) throw new Error(r?.error || "Erro ao enviar mensagem");
      setOk("Mensagem enviada!");
      setText("");
      setPhone("");
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Falha no envio.");
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const type = detectFileType(f);
    // Limites recomendados pela Meta
    const limits = { image: 5, audio: 16, video: 16, document: 100 } as const;
    const mb = f.size / 1024 / 1024;
    if (mb > limits[type!]) {
      setError(`Arquivo muito grande. Limite para ${type}: ${limits[type!]}MB.`);
      return;
    }
    setFile(f);
    setFileType(type);
  };
  const clearFile = () => {
    setFile(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadCSVSample = () => {
    const csv = `Nome,Telefone,Empresa,Email,Tags
Maria Silva,5596999999999,Silva Advogados,maria@silva.adv.br,cliente;vip
João Santos,5596988887777,Santos Construção,joao@santos.com.br,prospect
Ana Costa,5596912345678,Costa Estética,ana@estetica.com,cliente`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modelo-contatos-whatsapp.csv";
    a.click();
  };

  const importCSV = async () => {
    if (!csvFile) return;
    setImporting(true);
    setError(null);
    setOk(null);
    try {
      const text = await csvFile.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV precisa ter cabeçalho + ao menos 1 linha de dados.");
      const out: TContact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (!cols[0] || !cols[1]) continue;
        out.push({ nome: cols[0], telefone: cols[1], empresa: cols[2], email: cols[3], tags: cols[4] });
      }
      const r = await api({ action: "wa_import_contacts", site: siteSlug, contacts: out });
      if (!r?.ok) throw new Error(r?.error || "Erro ao importar");
      setOk(`Importados: ${r.success}. Ignorados: ${r.skipped}.`);
      setCsvFile(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Falha ao importar.");
    } finally {
      setImporting(false);
    }
  };

  const sendBulk = async () => {
    if (bulkSelectedIds.length === 0) return setError("Selecione contatos.");
    if (!bulkText && !bulkTplId) return setError("Informe mensagem ou template.");
    setBulkSending(true);
    setBulkProgress(0);
    setOk(null);
    setError(null);
    try {
      const total = bulkSelectedIds.length;
      let done = 0;
      for (const id of bulkSelectedIds) {
        const c = contacts.find((x) => String(x.id ?? x.telefone) === id);
        if (!c) continue;
        try {
          if (bulkTplId) {
            const tpl = templates.find((t) => t.id === bulkTplId);
            await api({
              action: "wa_send_template",
              site: siteSlug,
              to: normalizeTo(c.telefone),
              template: tpl?.name,
              lang: tpl?.lang,
            });
          } else {
            await api({
              action: "wa_send_text",
              site: siteSlug,
              to: normalizeTo(c.telefone),
              text: processVars(bulkText, { nome: c.nome ?? "", empresa: c.empresa ?? "" }),
            });
          }
        } catch {}
        done++;
        setBulkProgress(Math.round((done / total) * 100));
        if (done < total) await new Promise((r) => setTimeout(r, 1000)); // rate limit sugerido
      }
      setOk(`Envio em massa concluído: ${done}/${total}.`);
      setBulkSelectedIds([]);
      setBulkText("");
      setBulkTplId("");
      await loadAll();
    } catch (e: any) {
      setError(e.message || "Falha no envio em massa.");
    } finally {
      setBulkSending(false);
      setBulkProgress(0);
    }
  };

  if (!siteSlug || !vipPin) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/3 to-transparent backdrop-blur-xl p-10 text-center text-slate-300">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-r from-red-500/20 to-orange-600/20 flex items-center justify-center">
          <AlertIcon className="w-10 h-10 text-red-400" />
        </div>
        <div className="text-xl font-semibold text-white mb-2">Acesso restrito</div>
        <div>Informe <b>siteSlug</b> e <b>vipPin</b> válidos.</div>
      </div>
    );
  }

  if (loading) return <CardSkeleton />;

  return (
    <div className="relative rounded-[2rem] border border-white/20 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-2xl text-white overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-white/15 bg-gradient-to-r from-white/10 via-white/5 to-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl blur-lg opacity-60 animate-pulse" />
              <div className="relative p-3 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl backdrop-blur-xl border border-white/20">
                <MessageCircleIcon className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-blue-300 to-purple-300 bg-clip-text text-transparent flex items-center gap-3">
                WhatsApp Business API
              </h2>
              <p className="text-slate-300 mt-1 flex items-center gap-2">
                <RocketIcon className="w-4 h-4 text-emerald-400" />
                Envio oficial (templates quando necessário) • Importação • Mídia • Variáveis
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab("send")}
            className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white/80"
            title="Atualizar"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-2">
            <AlertIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {ok && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 flex items-center gap-2">
            <CheckIcon className="w-4 h-4" />
            <span className="text-sm">{ok}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
          {[
            ["send", "Enviar", <SendIcon key="i" className="w-4 h-4" />],
            ["contacts", "Contatos", <ContactIcon key="i" className="w-4 h-4" />],
            ["templates", "Templates", <TemplateIcon key="i" className="w-4 h-4" />],
            ["bulk", "Em Massa", <UsersIcon key="i" className="w-4 h-4" />],
          ].map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                tab === k
                  ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-white border border-white/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          {/* SEND */}
          {tab === "send" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-slate-300">Número do WhatsApp</label>
                  <input
                    className="mt-1 w-full h-12 rounded-xl bg-white/10 border border-white/20 px-3 outline-none"
                    placeholder="(96) 99999-9999 ou 5596999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Template (opcional)</label>
                  <select
                    className="mt-1 w-full h-12 rounded-xl bg-white/10 border border-white/20 px-3"
                    value={tplId}
                    onChange={(e) => setTplId(e.target.value)}
                  >
                    <option value="">Selecione um template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900">
                        {t.displayName} ({t.lang})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!tplId && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-300">Mensagem</label>
                    <div className="flex gap-1 text-xs">
                      {["saudacao", "nome", "data", "hora"].map((v) => (
                        <button
                          key={v}
                          onClick={() => setText((p) => `${p}{{${v}}}`)}
                          className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="mt-1 w-full h-28 rounded-xl bg-white/10 border border-white/20 p-3"
                    placeholder="Use {{saudacao}}, {{nome}}, {{data}}, {{hora}}"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  {text && (
                    <div className="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                      <div className="text-blue-300 mb-1">Preview:</div>
                      <div>{processVars(text)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Anexar arquivo (opcional)</label>
                  <span className="text-xs text-purple-300 px-2 py-1 rounded bg-purple-500/10 border border-purple-400/20">
                    API Oficial Meta
                  </span>
                </div>

                <div
                  className={`mt-2 p-6 rounded-2xl border-2 border-dashed ${
                    file ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/20 bg-white/5"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={onPickFile}
                    className="w-full"
                  />
                  {file && (
                    <div className="mt-3 flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                        {fileType === "image" ? (
                          <ImageIcon className="w-5 h-5 text-emerald-400" />
                        ) : fileType === "audio" ? (
                          <AudioIcon className="w-5 h-5 text-emerald-400" />
                        ) : fileType === "video" ? (
                          <VideoIcon className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <FileIcon className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="truncate">{file.name}</div>
                      <button onClick={clearFile} className="ml-auto text-red-300 hover:text-red-200">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  className="px-5 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 flex items-center gap-2"
                >
                  <SendIcon className="w-4 h-4" />
                  Enviar
                </button>
                <span className="text-xs text-slate-400 self-center">
                  Fora da janela de 24h, a Meta exige o uso de <b>Templates aprovados</b>.
                </span>
              </div>

              {/* Histórico compacto */}
              <div className="pt-4 border-t border-white/10">
                <div className="text-sm text-slate-300 mb-2">Histórico recente</div>
                <div className="max-h-56 overflow-auto space-y-2">
                  {messages.slice(0, 12).map((m, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-white/5 border border-white/10">
                      <div className="text-slate-400">{m.timestamp}</div>
                      <div className="text-white">
                        <b>{m.from}</b> → {m.to_display} • {m.type}
                      </div>
                      {m.text && <div className="text-slate-300">{m.text}</div>}
                    </div>
                  ))}
                  {messages.length === 0 && <div className="text-xs text-slate-400">Sem mensagens registradas.</div>}
                </div>
              </div>
            </div>
          )}

          {/* CONTACTS */}
          {tab === "contacts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Importar contatos via CSV</div>
                <div className="flex gap-2">
                  <button onClick={downloadCSVSample} className="px-4 h-10 rounded-xl bg-white/10 border border-white/20">
                    Baixar modelo
                  </button>
                  <label className="px-4 h-10 rounded-xl bg-white/10 border border-white/20 cursor-pointer flex items-center">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    Selecionar CSV
                  </label>
                  <button
                    onClick={importCSV}
                    disabled={!csvFile || importing}
                    className="px-4 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 disabled:opacity-50"
                  >
                    {importing ? "Importando..." : "Importar"}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {contacts.map((c) => (
                  <div key={String(c.id ?? c.telefone)} className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                    <div className="font-semibold text-white">{c.nome || "(sem nome)"}</div>
                    <div className="text-slate-300">{c.telefone}</div>
                    {c.empresa && <div className="text-slate-400 text-xs">{c.empresa}</div>}
                  </div>
                ))}
                {contacts.length === 0 && <div className="text-sm text-slate-400">Nenhum contato.</div>}
              </div>
            </div>
          )}

          {/* TEMPLATES */}
          {tab === "templates" && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <TemplateIcon className="w-4 h-4" />
                    {t.displayName}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Nome: {t.name} • Idioma: {t.lang}
                  </div>
                </div>
              ))}
              {templates.length === 0 && <div className="text-sm text-slate-400">Nenhum template disponível.</div>}
            </div>
          )}

          {/* BULK */}
          {tab === "bulk" && (
            <div className="space-y-6">
              <div className="text-sm text-slate-300">Selecione contatos</div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-auto">
                {contacts.map((c) => {
                  const id = String(c.id ?? c.telefone);
                  const checked = bulkSelectedIds.includes(id);
                  return (
                    <label
                      key={id}
                      className={`p-3 rounded-xl border ${
                        checked ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-white/5"
                      } flex items-center gap-2`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setBulkSelectedIds((prev) =>
                            e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                          )
                        }
                      />
                      <div className="text-sm">
                        <div className="text-white">{c.nome || "(sem nome)"}</div>
                        <div className="text-slate-400">{c.telefone}</div>
                      </div>
                    </label>
                  );
                })}
                {contacts.length === 0 && <div className="text-sm text-slate-400">Sem contatos.</div>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Template (opcional)</label>
                  <select
                    className="mt-1 w-full h-12 rounded-xl bg-white/10 border border-white/20 px-3"
                    value={bulkTplId}
                    onChange={(e) => setBulkTplId(e.target.value)}
                  >
                    <option value="">—</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900">
                        {t.displayName} ({t.lang})
                      </option>
                    ))}
                  </select>
                </div>
                {!bulkTplId && (
                  <div>
                    <label className="text-sm text-slate-300">Mensagem (variáveis permitidas)</label>
                    <textarea
                      className="mt-1 w-full h-24 rounded-xl bg-white/10 border border-white/20 p-3"
                      placeholder="Use {{saudacao}}, {{nome}}, {{data}}, {{hora}}"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={sendBulk}
                  disabled={bulkSending || bulkSelectedIds.length === 0}
                  className="px-5 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 disabled:opacity-50"
                >
                  {bulkSending ? `Enviando… ${bulkProgress}%` : "Enviar em massa"}
                </button>
                <span className="text-xs text-slate-400">
                  Respeita rate limit recomendado (1 msg/seg). Fora de 24h → usar template aprovado.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
