import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from '@/lib/sentry'

// Inicializar Sentry para tracking de erros
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
