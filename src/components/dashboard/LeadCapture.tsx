import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Phone,
  Mail,
  Calendar,
  Filter,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Lead {
  id: string;
  timestamp: string;
  site: string;
  name: string;
  email: string;
  phone: string;
  source: string;
}

interface LeadCaptureProps {
  siteSlug: string;
  vipPin: string;
}

const GAS_BASE_URL = import.meta.env.VITE_GAS_BASE_URL || "";

export function LeadCapture({ siteSlug, vipPin }: LeadCaptureProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const queryClient = useQueryClient();

  // Buscar leads
  const { data: leads = [], isLoading, refetch } = useQuery<Lead[]>({
    queryKey: ["leads", siteSlug],
    queryFn: async () => {
      if (!GAS_BASE_URL || !siteSlug) return [];

      const params = new URLSearchParams({
        type: "list_leads",
        site: siteSlug,
        vip_pin: vipPin || "",
      });

      const response = await fetch(`${GAS_BASE_URL}?${params}`);
      if (!response.ok) throw new Error("Erro ao carregar leads");

      const data = await response.json();
      return data.leads || [];
    },
    enabled: !!siteSlug,
  });

  // Mutation para deletar lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      if (!GAS_BASE_URL) throw new Error("URL do backend não configurada");
      
      const response = await fetch(GAS_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "delete_lead",
          site: siteSlug,
          leadId,
          vip_pin: vipPin,
        }),
      });

      if (!response.ok) throw new Error("Erro ao deletar lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", siteSlug] });
      toast.success("Lead removido com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover lead: ${error.message}`);
    },
  });

  // Filtros
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm);
    
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    
    const leadDate = new Date(lead.timestamp);
    const daysAgo = parseInt(dateFilter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    const matchesDate = daysAgo === 0 || leadDate >= cutoffDate;

    return matchesSearch && matchesSource && matchesDate;
  });

  // Estatísticas
  const stats = {
    total: leads.length,
    thisMonth: leads.filter(lead => {
      const leadDate = new Date(lead.timestamp);
      const now = new Date();
      return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
    }).length,
    thisWeek: leads.filter(lead => {
      const leadDate = new Date(lead.timestamp);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return leadDate >= weekAgo;
    }).length,
  };

  const sources = [...new Set(leads.map(lead => lead.source))];

  const handleExport = () => {
    const csvContent = [
      ["Nome", "Email", "Telefone", "Origem", "Data"].join(","),
      ...filteredLeads.map(lead => [
        lead.name,
        lead.email,
        lead.phone,
        lead.source,
        format(parseISO(lead.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${siteSlug}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleContactLead = (lead: Lead) => {
    const message = `Olá ${lead.name}, vi que você demonstrou interesse em nossos serviços. Como posso te ajudar?`;
    const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Captação de Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando leads...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e Estatísticas */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Captação de Leads
          </h2>
          <p className="text-muted-foreground">
            Gerencie os contatos interessados no seu negócio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleExport} size="sm" disabled={filteredLeads.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Este Mês</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <RefreshCw className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source === "website" ? "Site" : source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="0">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>
            {filteredLeads.length === 0 
              ? "Nenhum lead encontrado com os filtros aplicados"
              : `Mostrando ${filteredLeads.length} de ${leads.length} leads`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {leads.length === 0 
                  ? "Nenhum lead capturado ainda. Quando visitantes preencherem o formulário no seu site, eles aparecerão aqui."
                  : "Nenhum lead encontrado com os filtros aplicados."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{lead.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(lead.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-11">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lead.phone}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 ml-11">
                        <Badge variant="secondary" className="text-xs">
                          {lead.source === "website" ? "Site" : lead.source}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContactLead(lead)}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLead.mutate(lead.id)}
                        disabled={deleteLead.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções de Integração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Como Capturar Leads no Seu Site
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Para capturar leads no seu site, adicione este formulário HTML onde desejar:
          </p>
          
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`<form id="lead-form" class="space-y-4">
  <div>
    <label>Nome</label>
    <input type="text" name="name" required />
  </div>
  <div>
    <label>Email</label>
    <input type="email" name="email" required />
  </div>
  <div>
    <label>Telefone</label>
    <input type="tel" name="phone" required />
  </div>
  <button type="submit">Deixe seu contato</button>
</form>

<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    const response = await fetch('/.netlify/functions/lead-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteSlug: '${siteSlug}',
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone')
      })
    });
    
    if (response.ok) {
      alert('Obrigado! Entraremos em contato em breve.');
      e.target.reset();
    }
  } catch (error) {
    alert('Erro ao enviar. Tente novamente.');
  }
});
</script>`}
            </pre>
          </div>
          
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Personalize a mensagem e o estilo do formulário conforme seu design.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}