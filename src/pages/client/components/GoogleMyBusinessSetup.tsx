import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLinkIcon, 
  CheckIcon, 
  AlertCircleIcon, 
  SettingsIcon,
  RefreshCwIcon
} from 'lucide-react';

interface GoogleMyBusinessSetupProps {
  siteSlug: string;
  vipPin: string;
}

interface GMBConfig {
  placeId?: string;
  businessName?: string;
  businessAddress?: string;
  connectedAt?: string;
  needsSetup?: boolean;
}

export default function GoogleMyBusinessSetup({ siteSlug, vipPin }: GoogleMyBusinessSetupProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GMBConfig>({});
  const [setupStep, setSetupStep] = useState<'oauth' | 'credentials'>('oauth');
  
  // OAuth form
  const [oauthData, setOauthData] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  });
  
  // Credentials form
  const [credentialsData, setCredentialsData] = useState({
    authCode: '',
    placeId: ''
  });

  useEffect(() => {
    fetchConfig();
  }, [siteSlug, vipPin]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/google-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_reviews',
          siteSlug,
          vipPin
        })
      });

      const result = await response.json();
      if (result.ok) {
        setConfig(result.data);
        setError(null);
      } else {
        setError(result.error || 'Erro ao carregar configuração');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/.netlify/functions/google-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_oauth',
          siteSlug,
          vipPin,
          ...oauthData
        })
      });

      const result = await response.json();
      if (result.ok) {
        setConfig(prev => ({ ...prev, ...result.data }));
        setSetupStep('credentials');
        setError(null);
      } else {
        setError(result.error || 'Erro ao configurar OAuth');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const response = await fetch('/.netlify/functions/google-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          siteSlug,
          vipPin,
          ...credentialsData
        })
      });

      const result = await response.json();
      if (result.ok) {
        setConfig(prev => ({ ...prev, ...result.data }));
        setError(null);
        // Recarregar configuração
        await fetchConfig();
      } else {
        setError(result.error || 'Erro ao salvar credenciais');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Configuração Google My Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCwIcon className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p className="text-slate-400">Carregando configuração...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se já está configurado
  if (config.placeId && !config.needsSetup) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-green-400" />
            Google My Business Conectado
          </CardTitle>
          <CardDescription>
            {config.businessName || 'Negócio conectado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-400">Place ID</Label>
              <p className="text-sm font-mono bg-white/10 p-2 rounded">
                {config.placeId}
              </p>
            </div>
            <div>
              <Label className="text-sm text-slate-400">Conectado em</Label>
              <p className="text-sm">
                {config.connectedAt ? new Date(config.connectedAt).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={fetchConfig}
              variant="outline"
              size="sm"
              disabled={saving}
            >
              <RefreshCwIcon className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => setConfig({ needsSetup: true })}
              variant="outline"
              size="sm"
            >
              Reconfigurar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Configuração Google My Business
        </CardTitle>
        <CardDescription>
          Configure a integração com Google My Business para ver reviews reais
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircleIcon className="w-4 h-4" />
              <span className="font-medium">Erro</span>
            </div>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        )}

        {/* Passo 1: OAuth Setup */}
        {setupStep === 'oauth' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Passo 1 de 2</Badge>
              <h3 className="font-medium">Configurar OAuth2</h3>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-medium text-blue-400 mb-2">Como obter as credenciais:</h4>
              <ol className="text-sm text-blue-300 space-y-1 list-decimal list-inside">
                <li>Acesse o <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Google Cloud Console</a></li>
                <li>Crie um projeto ou selecione um existente</li>
                <li>Ative a Google My Business API</li>
                <li>Vá em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth 2.0"</li>
                <li>Configure o tipo de aplicação como "Aplicação da Web"</li>
                <li>Adicione o Redirect URI: <code className="bg-black/20 px-1 rounded">https://seu-dominio.com/auth/google/callback</code></li>
              </ol>
            </div>

            <form onSubmit={setupOAuth} className="space-y-4">
              <div>
                <Label htmlFor="clientId" className="text-sm text-slate-400">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={oauthData.clientId}
                  onChange={(e) => setOauthData(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="123456789-abcdefg.apps.googleusercontent.com"
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="clientSecret" className="text-sm text-slate-400">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={oauthData.clientSecret}
                  onChange={(e) => setOauthData(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="GOCSPX-abcdefghijklmnop"
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="redirectUri" className="text-sm text-slate-400">Redirect URI</Label>
                <Input
                  id="redirectUri"
                  type="url"
                  value={oauthData.redirectUri}
                  onChange={(e) => setOauthData(prev => ({ ...prev, redirectUri: e.target.value }))}
                  placeholder="https://seu-dominio.com/auth/google/callback"
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  'Configurar OAuth2'
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Passo 2: Credentials */}
        {setupStep === 'credentials' && config.authUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Passo 2 de 2</Badge>
              <h3 className="font-medium">Autorizar e Conectar</h3>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="font-medium text-green-400 mb-2">OAuth2 configurado com sucesso!</h4>
              <p className="text-sm text-green-300">
                Agora você precisa autorizar o acesso e obter o Place ID do seu negócio.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-400 mb-2 block">1. Autorizar acesso</Label>
                <Button
                  asChild
                  className="w-full"
                >
                  <a
                    href={config.authUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                    Autorizar no Google
                  </a>
                </Button>
              </div>

              <form onSubmit={saveCredentials} className="space-y-4">
                <div>
                  <Label htmlFor="authCode" className="text-sm text-slate-400">Código de Autorização</Label>
                  <Input
                    id="authCode"
                    type="text"
                    value={credentialsData.authCode}
                    onChange={(e) => setCredentialsData(prev => ({ ...prev, authCode: e.target.value }))}
                    placeholder="Cole o código que você recebeu após autorizar"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="placeId" className="text-sm text-slate-400">Place ID</Label>
                  <Input
                    id="placeId"
                    type="text"
                    value={credentialsData.placeId}
                    onChange={(e) => setCredentialsData(prev => ({ ...prev, placeId: e.target.value }))}
                    placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Encontre o Place ID em: <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Google Places API</a>
                  </p>
                </div>
                
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar Google My Business'
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
