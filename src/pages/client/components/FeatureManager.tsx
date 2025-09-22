import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  SettingsIcon, 
  ZapIcon,
  CrownIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  ExternalLinkIcon,
  LockIcon,
  UnlockIcon
} from 'lucide-react';
import { DashboardCardSkeleton } from '@/components/ui/loading-skeletons';

interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'automation' | 'ecommerce' | 'marketing' | 'analytics';
  plan: 'essential' | 'vip';
  enabled: boolean;
  isCore: boolean;
  dependencies?: string[];
  icon: string;
  benefits: string[];
  setupRequired: boolean;
  setupInstructions?: string;
}

interface UserFeatureSettings {
  siteSlug: string;
  plan: 'essential' | 'vip';
  enabledFeatures: string[];
  onboardingCompleted: boolean;
  lastUpdated: string;
}

interface FeatureManagerProps {
  siteSlug: string;
  vipPin?: string;
  userPlan: 'essential' | 'vip';
}

const CATEGORY_NAMES = {
  ai: 'Inteligência Artificial',
  automation: 'Automação',
  ecommerce: 'E-commerce',
  marketing: 'Marketing',
  analytics: 'Analytics'
};

const CATEGORY_COLORS = {
  ai: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
  automation: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
  ecommerce: 'bg-green-600/20 text-green-300 border-green-500/30',
  marketing: 'bg-orange-600/20 text-orange-300 border-orange-500/30',
  analytics: 'bg-pink-600/20 text-pink-300 border-pink-500/30'
};

export default function FeatureManager({ siteSlug, vipPin, userPlan }: FeatureManagerProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [featuresByCategory, setFeaturesByCategory] = useState<Record<string, FeatureConfig[]>>({});
  const [userSettings, setUserSettings] = useState<UserFeatureSettings | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadFeatures = async () => {
    try {
      const response = await fetch('/.netlify/functions/feature-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_available_features',
          siteSlug
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar funcionalidades');

      const result = await response.json();
      if (result.ok) {
        setFeatures(result.features);
        setFeaturesByCategory(result.featuresByCategory);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar funcionalidades:', err);
      setError(err.message);
    }
  };

  const loadUserFeatures = async () => {
    try {
      const response = await fetch('/.netlify/functions/feature-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_user_features',
          siteSlug
        })
      });

      if (!response.ok) throw new Error('Falha ao carregar configurações');

      const result = await response.json();
      if (result.ok) {
        setUserSettings(result.userSettings);
        // Atualizar status das funcionalidades
        setFeatures(prev => prev.map(feature => ({
          ...feature,
          enabled: feature.isCore || result.userSettings.enabledFeatures.includes(feature.id)
        })));
        setError(null);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err);
      setError(err.message);
    }
  };

  const toggleFeature = async (featureId: string) => {
    if (!vipPin) {
      setError('PIN VIP necessário para alterar funcionalidades');
      return;
    }

    setProcessing(true);
    
    try {
      const response = await fetch('/.netlify/functions/feature-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_feature',
          siteSlug,
          vipPin,
          featureId
        })
      });

      if (!response.ok) throw new Error('Falha ao alterar funcionalidade');

      const result = await response.json();
      if (result.ok) {
        // Atualizar estado local
        setFeatures(prev => prev.map(feature => 
          feature.id === featureId 
            ? { ...feature, enabled: result.feature.enabled }
            : feature
        ));
        
        // Recarregar configurações do usuário
        await loadUserFeatures();
        setError(null);
      } else {
        throw new Error(result.error || 'Erro ao alterar funcionalidade');
      }
    } catch (err: any) {
      console.error('Erro ao alterar funcionalidade:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetFeatures = async () => {
    if (!vipPin) {
      setError('PIN VIP necessário para resetar funcionalidades');
      return;
    }

    if (!confirm('Tem certeza que deseja resetar todas as funcionalidades para o padrão? Esta ação não pode ser desfeita.')) {
      return;
    }

    setProcessing(true);
    
    try {
      const response = await fetch('/.netlify/functions/feature-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_features',
          siteSlug,
          vipPin
        })
      });

      if (!response.ok) throw new Error('Falha ao resetar funcionalidades');

      const result = await response.json();
      if (result.ok) {
        await Promise.all([loadFeatures(), loadUserFeatures()]);
        setError(null);
      } else {
        throw new Error(result.error || 'Erro ao resetar');
      }
    } catch (err: any) {
      console.error('Erro ao resetar funcionalidades:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getVisibleFeatures = () => {
    if (selectedCategory === 'all') {
      return features;
    }
    return features.filter(f => f.category === selectedCategory);
  };

  const getFeatureStatusIcon = (feature: FeatureConfig) => {
    if (feature.isCore) {
      return <LockIcon className="w-4 h-4 text-slate-400" />;
    }
    if (feature.enabled) {
      return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
    }
    return <UnlockIcon className="w-4 h-4 text-slate-400" />;
  };

  const canToggleFeature = (feature: FeatureConfig) => {
    return !feature.isCore && feature.plan === 'essential' || (feature.plan === 'vip' && userPlan === 'vip');
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadFeatures(), loadUserFeatures()]);
      setLoading(false);
    };

    loadData();
  }, [siteSlug]);

  if (loading) {
    return <DashboardCardSkeleton />;
  }

  return (
    <Card className="rounded-2xl border border-white/10 bg-white/5 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Gerenciar Funcionalidades
            </CardTitle>
            <CardDescription className="text-slate-400">
              Ative ou desative funcionalidades do seu plano {userPlan === 'vip' ? 'VIP' : 'Essential'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`px-3 py-1 ${userPlan === 'vip' ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30' : 'bg-blue-600/20 text-blue-300 border-blue-500/30'}`}>
              {userPlan === 'vip' ? (
                <>
                  <CrownIcon className="w-3 h-3 mr-1" />
                  VIP
                </>
              ) : (
                'Essential'
              )}
            </Badge>
            <Badge className="px-3 py-1 bg-green-600/20 text-green-300 border-green-500/30">
              {features.filter(f => f.enabled).length} ativas
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filtros por Categoria */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Todas ({features.length})
          </button>
          
          {Object.entries(CATEGORY_NAMES).map(([key, name]) => {
            const count = features.filter(f => f.category === key).length;
            if (count === 0) return null;
            
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {name} ({count})
              </button>
            );
          })}
        </div>

        {/* Lista de Funcionalidades */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {getVisibleFeatures().map((feature) => (
            <div 
              key={feature.id} 
              className={`p-4 rounded-lg border transition-all ${
                feature.enabled 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Ícone e Status */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{feature.icon}</span>
                    {getFeatureStatusIcon(feature)}
                  </div>
                  
                  {/* Informações */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{feature.name}</h3>
                      
                      {/* Badges */}
                      <Badge className={`px-2 py-1 text-xs ${CATEGORY_COLORS[feature.category]}`}>
                        {CATEGORY_NAMES[feature.category]}
                      </Badge>
                      
                      {feature.plan === 'vip' && (
                        <Badge className="px-2 py-1 text-xs bg-yellow-600/20 text-yellow-300 border-yellow-500/30">
                          <CrownIcon className="w-3 h-3 mr-1" />
                          VIP
                        </Badge>
                      )}
                      
                      {feature.isCore && (
                        <Badge className="px-2 py-1 text-xs bg-gray-600/20 text-gray-300 border-gray-500/30">
                          Essencial
                        </Badge>
                      )}
                      
                      {feature.setupRequired && feature.enabled && (
                        <Badge className="px-2 py-1 text-xs bg-orange-600/20 text-orange-300 border-orange-500/30">
                          <AlertTriangleIcon className="w-3 h-3 mr-1" />
                          Config. Necessária
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-400">{feature.description}</p>
                    
                    {/* Benefícios */}
                    <div className="flex flex-wrap gap-1">
                      {feature.benefits.slice(0, 3).map((benefit, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-400/10 text-blue-300 rounded"
                        >
                          {benefit}
                        </span>
                      ))}
                      {feature.benefits.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-slate-600/20 text-slate-400 rounded">
                          +{feature.benefits.length - 3} mais
                        </span>
                      )}
                    </div>
                    
                    {/* Instruções de Setup */}
                    {feature.setupRequired && feature.enabled && feature.setupInstructions && (
                      <div className="mt-3 p-3 rounded-lg bg-orange-400/10 border border-orange-400/20">
                        <div className="flex items-center gap-2 mb-2">
                          <InfoIcon className="w-4 h-4 text-orange-400" />
                          <span className="text-sm font-medium text-orange-300">Configuração Necessária</span>
                        </div>
                        <p className="text-sm text-orange-200">{feature.setupInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Controles */}
                <div className="flex items-center gap-3">
                  {/* Switch para alternar */}
                  {canToggleFeature(feature) && vipPin ? (
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                      disabled={processing || feature.isCore}
                    />
                  ) : feature.plan === 'vip' && userPlan !== 'vip' ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <LockIcon className="w-4 h-4" />
                      <span className="text-xs">VIP</span>
                    </div>
                  ) : !vipPin ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <LockIcon className="w-4 h-4" />
                      <span className="text-xs">PIN VIP</span>
                    </div>
                  ) : (
                    <Switch
                      checked={feature.enabled}
                      disabled={true}
                    />
                  )}
                  
                  {/* Botão de informações */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <InfoIcon className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {getVisibleFeatures().length === 0 && (
            <div className="text-center py-8 text-slate-400">
              Nenhuma funcionalidade encontrada nesta categoria.
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button 
            onClick={() => Promise.all([loadFeatures(), loadUserFeatures()])} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={processing}
          >
            {processing ? (
              <RefreshCwIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCwIcon className="w-4 h-4 mr-2" />
            )}
            Atualizar
          </Button>
          
          {vipPin && (
            <Button 
              onClick={resetFeatures}
              variant="outline" 
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              disabled={processing}
            >
              Resetar Padrão
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              // TODO: Abrir modal de onboarding/configuração avançada
              console.log('Configuração avançada')
            }}
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Configurar
          </Button>
        </div>

        {/* Informações do Plano */}
        <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <div className="flex items-center gap-2 mb-2">
            <InfoIcon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Informações do Plano</span>
          </div>
          <div className="text-sm text-blue-200 space-y-1">
            {userPlan === 'vip' ? (
              <>
                <p>• Acesso completo a todas as funcionalidades IA</p>
                <p>• Automações avançadas e integrações</p>
                <p>• E-commerce completo e templates premium</p>
                <p>• Suporte prioritário e recursos exclusivos</p>
              </>
            ) : (
              <>
                <p>• Website profissional e Google Meu Negócio</p>
                <p>• Funcionalidades essenciais incluídas</p>
                <p>• Upgrade para VIP para acessar IA e automações</p>
                <p>• Suporte padrão incluído</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}