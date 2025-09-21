import React, { useEffect } from 'react';
import { usePWA, useOfflineData } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';

interface PWAHandlerProps {
  children: React.ReactNode;
}

export function PWAHandler({ children }: PWAHandlerProps) {
  const { 
    isInstallable, 
    isOffline, 
    isUpdateAvailable, 
    installApp, 
    updateApp 
  } = usePWA();
  
  const { pendingChanges } = useOfflineData();

  // Notificações automáticas
  useEffect(() => {
    if (isOffline) {
      toast.info(
        'Você está offline, mas o dashboard continua funcionando!',
        {
          icon: <WifiOff className="h-4 w-4" />,
          duration: 5000,
        }
      );
    }
  }, [isOffline]);

  useEffect(() => {
    if (pendingChanges > 0) {
      toast.info(
        `${pendingChanges} alterações serão sincronizadas quando voltar online`,
        {
          icon: <Cloud className="h-4 w-4" />,
          duration: 3000,
        }
      );
    }
  }, [pendingChanges]);

  useEffect(() => {
    if (isUpdateAvailable) {
      toast.success(
        'Nova versão disponível!',
        {
          icon: <RefreshCw className="h-4 w-4" />,
          action: {
            label: 'Atualizar',
            onClick: updateApp,
          },
          duration: 10000,
        }
      );
    }
  }, [isUpdateAvailable, updateApp]);

  return (
    <>
      {children}
      
      {/* PWA Install Banner */}
      {isInstallable && (
        <PWAInstallBanner onInstall={installApp} />
      )}

      {/* Status Indicators */}
      <PWAStatusIndicators
        isOffline={isOffline}
        pendingChanges={pendingChanges}
        isUpdateAvailable={isUpdateAvailable}
        onUpdate={updateApp}
      />
    </>
  );
}

// Banner de instalação PWA
interface PWAInstallBannerProps {
  onInstall: () => Promise<void>;
}

function PWAInstallBanner({ onInstall }: PWAInstallBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gradient-to-r from-primary to-secondary p-4 rounded-xl shadow-2xl border border-border/20">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Download className="h-5 w-5 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">
              Instalar Elevea Dashboard
            </h3>
            <p className="text-white/80 text-xs mt-1">
              Acesso rápido mesmo offline
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={onInstall}
            className="flex-1 bg-white text-primary hover:bg-white/90"
          >
            Instalar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsVisible(false)}
            className="text-white hover:bg-white/10"
          >
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}

// Indicadores de status PWA
interface PWAStatusIndicatorsProps {
  isOffline: boolean;
  pendingChanges: number;
  isUpdateAvailable: boolean;
  onUpdate: () => void;
}

function PWAStatusIndicators({ 
  isOffline, 
  pendingChanges, 
  isUpdateAvailable,
  onUpdate 
}: PWAStatusIndicatorsProps) {
  return (
    <div className="fixed top-4 right-4 z-40 space-y-2">
      {/* Status de conexão */}
      {isOffline && (
        <div className="bg-orange-100 border border-orange-200 text-orange-800 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </div>
      )}

      {/* Mudanças pendentes */}
      {pendingChanges > 0 && (
        <div className="bg-blue-100 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <Cloud className="h-4 w-4" />
          <span>{pendingChanges} pendente{pendingChanges > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Atualização disponível */}
      {isUpdateAvailable && (
        <div className="bg-green-100 border border-green-200 text-green-800 px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            <span>Atualização</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onUpdate}
              className="h-6 px-2 text-xs text-green-800 hover:bg-green-200"
            >
              Instalar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PWAHandler;