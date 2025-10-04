import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Github, Settings, Eye, EyeOff, Save, CheckCircle } from "lucide-react";

interface GitHubConfigProps {
  siteSlug: string;
  vipPin: string;
  userEmail?: string;
}

interface GitHubSettings {
  github_repo?: string;
  github_token?: string;
  github_configured?: boolean;
}

export default function GitHubConfig({ siteSlug, vipPin, userEmail }: GitHubConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState<GitHubSettings>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verificar se é VIP
  if (!vipPin || vipPin.length < 4) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Github className="h-5 w-5 text-slate-400" />
            Configuração GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <Github className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Acesso VIP Necessário</h3>
            <p className="text-slate-400 text-sm">
              Esta funcionalidade está disponível apenas para usuários VIP.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/.netlify/functions/client-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_settings',
          site: siteSlug
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.ok) {
        setSettings(result.settings || {});
      } else {
        setError(result.error || 'Erro ao carregar configurações');
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/.netlify/functions/client-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          site: siteSlug,
          data: {
            github_repo: settings.github_repo,
            github_token: settings.github_token,
            github_configured: !!(settings.github_repo && settings.github_token)
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.ok) {
        setSuccess('Configurações salvas com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Erro ao salvar configurações');
      }
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (userEmail) {
      loadSettings();
    }
  }, [siteSlug, userEmail]);

  const isConfigured = !!(settings.github_repo && settings.github_token);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Github className="h-5 w-5 text-slate-400" />
            Configuração GitHub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-slate-300">Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Github className="h-5 w-5 text-slate-400" />
            Configuração GitHub
          </CardTitle>
          <Badge 
            variant={isConfigured ? "default" : "secondary"}
            className={isConfigured ? "bg-green-500 text-white" : "bg-yellow-500 text-black"}
          >
            {isConfigured ? "Configurado" : "Não Configurado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <span>❌</span>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{success}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github_repo" className="text-white">
              Repositório GitHub
            </Label>
            <Input
              id="github_repo"
              type="text"
              placeholder="usuario/nome-do-repositorio"
              value={settings.github_repo || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, github_repo: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400">
              Formato: usuario/nome-do-repositorio (ex: MATHEUSMARTINSSMP/loungerieamapagarden)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="github_token" className="text-white">
              Token de Acesso GitHub
            </Label>
            <div className="relative">
              <Input
                id="github_token"
                type={showToken ? "text" : "password"}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={settings.github_token || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, github_token: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Token com permissões de repositório. Gere em: GitHub → Settings → Developer settings → Personal access tokens
            </p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-300 mb-2">Como configurar:</h4>
          <ol className="text-xs text-blue-200/80 space-y-1 list-decimal list-inside">
            <li>Acesse seu repositório GitHub do cliente</li>
            <li>Vá em Settings → Developer settings → Personal access tokens</li>
            <li>Crie um novo token com permissões de "repo"</li>
            <li>Cole o token e o nome do repositório acima</li>
            <li>Salve as configurações</li>
          </ol>
        </div>

        <Button 
          onClick={saveSettings}
          disabled={saving || !settings.github_repo || !settings.github_token}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>

        {isConfigured && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">GitHub Configurado</span>
            </div>
            <p className="text-xs text-green-200/80">
              Agora você pode publicar feedbacks aprovados diretamente no site do cliente!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
