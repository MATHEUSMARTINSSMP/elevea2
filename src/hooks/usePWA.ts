import { useState, useEffect } from 'react';

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  installPrompt: PWAInstallPrompt | null;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => void;
  registerSW: () => Promise<void>;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    isUpdateAvailable: false,
    installPrompt: null,
  });

  // Registrar Service Worker
  const registerSW = async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('✅ Service Worker registrado:', registration.scope);

        // Detectar atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });

        // Escutar mensagens do SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            setState(prev => ({ ...prev, isUpdateAvailable: true }));
          }
        });

      } catch (error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      }
    }
  };

  // Instalar app PWA
  const installApp = async (): Promise<void> => {
    if (state.installPrompt) {
      try {
        await state.installPrompt.prompt();
        const { outcome } = await state.installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setState(prev => ({ 
            ...prev, 
            isInstalled: true, 
            isInstallable: false,
            installPrompt: null 
          }));
          console.log('✅ PWA instalado com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao instalar PWA:', error);
      }
    }
  };

  // Atualizar app
  const updateApp = (): void => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  useEffect(() => {
    // Registrar SW no mount
    registerSW();

    // Detectar prompt de instalação
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ 
        ...prev, 
        isInstallable: true, 
        installPrompt: e as PWAInstallPrompt 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Detectar se já está instalado
    const handleAppInstalled = () => {
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false,
        installPrompt: null 
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Monitorar conexão
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar se está sendo executado como PWA instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setState(prev => ({ ...prev, isInstalled: true }));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    ...state,
    installApp,
    updateApp,
    registerSW,
  };
}

// Hook para dados offline
export function useOfflineData() {
  const [pendingChanges, setPendingChanges] = useState<number>(0);

  const addOfflineAction = (action: {
    id: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: number;
  }) => {
    const pending = JSON.parse(localStorage.getItem('offline-pending-data') || '[]');
    pending.push(action);
    localStorage.setItem('offline-pending-data', JSON.stringify(pending));
    setPendingChanges(pending.length);
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offline-pending-data');
    setPendingChanges(0);
  };

  useEffect(() => {
    const updatePendingCount = () => {
      const pending = JSON.parse(localStorage.getItem('offline-pending-data') || '[]');
      setPendingChanges(pending.length);
    };

    updatePendingCount();
    
    // Atualizar count quando online/offline
    window.addEventListener('online', updatePendingCount);
    return () => window.removeEventListener('online', updatePendingCount);
  }, []);

  return {
    pendingChanges,
    addOfflineAction,
    clearOfflineData,
  };
}