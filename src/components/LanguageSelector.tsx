import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

interface LanguageSelectorProps {
  variant?: 'header' | 'dashboard' | 'dropdown';
  onLanguageChange?: (language: string) => void;
}

export default function LanguageSelector({ variant = 'dropdown', onLanguageChange }: LanguageSelectorProps) {
  const [currentLanguage, setCurrentLanguage] = useState('pt');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Detectar idioma atual do navegador ou localStorage
    const savedLanguage = localStorage.getItem('elevea-language');
    const browserLanguage = navigator.language.split('-')[0];
    
    const detectedLanguage = savedLanguage || browserLanguage || 'pt';
    const supportedLanguage = LANGUAGES.find(lang => lang.code === detectedLanguage)?.code || 'pt';
    
    setCurrentLanguage(supportedLanguage);
    
    // Aplicar tradução automática se necessário
    if (supportedLanguage !== 'pt') {
      applyTranslation(supportedLanguage);
    }
  }, []);

  const applyTranslation = async (languageCode: string) => {
    try {
      // Aqui você pode implementar a tradução automática usando a API que preferir
      // Por exemplo, Google Translate API ou Azure Translator
      
      // Para demonstração, vou simular a tradução alterando alguns textos chave
      const elements = document.querySelectorAll('[data-translate]');
      elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (key && translations[languageCode] && translations[languageCode][key]) {
          element.textContent = translations[languageCode][key];
        }
      });
      
      // Alterar meta tags de idioma
      document.documentElement.lang = languageCode;
      
      const metaLang = document.querySelector('meta[name="language"]');
      if (metaLang) {
        metaLang.setAttribute('content', languageCode);
      } else {
        const newMetaLang = document.createElement('meta');
        newMetaLang.name = 'language';
        newMetaLang.content = languageCode;
        document.head.appendChild(newMetaLang);
      }
      
    } catch (error) {
      console.error('Erro ao aplicar tradução:', error);
    }
  };

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('elevea-language', languageCode);
    setIsOpen(false);
    
    // Aplicar tradução
    applyTranslation(languageCode);
    
    // Callback opcional
    if (onLanguageChange) {
      onLanguageChange(languageCode);
    }
    
    // Recarregar página para aplicar mudanças completas
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  if (variant === 'header') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Selecionar idioma"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden md:inline">{currentLang.code.toUpperCase()}</span>
        </button>
        
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg py-2 z-50 min-w-[160px]">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                  currentLanguage === language.code ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <span>{language.flag}</span>
                <span className="text-sm">{language.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
          aria-label="Selecionar idioma"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLang.flag}</span>
          <span>{currentLang.name}</span>
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg py-2 z-50 min-w-[180px]">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                  currentLanguage === language.code ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <span>{language.flag}</span>
                <span className="text-sm">{language.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // variant === 'dropdown' (padrão)
  return (
    <select 
      value={currentLanguage}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="bg-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Selecionar idioma"
    >
      {LANGUAGES.map((language) => (
        <option key={language.code} value={language.code}>
          {language.flag} {language.name}
        </option>
      ))}
    </select>
  );
}

// Traduções básicas para demonstração
// Em produção, isso viria de uma API ou arquivo JSON
const translations: Record<string, Record<string, string>> = {
  en: {
    'hero-title': 'Digital Agency for Small Businesses',
    'hero-subtitle': 'Complete solutions to take your business online',
    'contact-button': 'Contact Us',
    'member-area': 'Member Area',
    'about': 'About',
    'plans': 'Plans',
    'testimonials': 'Testimonials',
    'faq': 'FAQ',
    'contact': 'Contact'
  },
  es: {
    'hero-title': 'Agencia Digital para Pequeñas Empresas',
    'hero-subtitle': 'Soluciones completas para llevar tu negocio online',
    'contact-button': 'Contáctanos',
    'member-area': 'Área de Miembros',
    'about': 'Acerca de',
    'plans': 'Planes',
    'testimonials': 'Testimonios',
    'faq': 'Preguntas',
    'contact': 'Contacto'
  },
  fr: {
    'hero-title': 'Agence Numérique pour Petites Entreprises',
    'hero-subtitle': 'Solutions complètes pour mettre votre entreprise en ligne',
    'contact-button': 'Nous Contacter',
    'member-area': 'Espace Membre',
    'about': 'À Propos',
    'plans': 'Plans',
    'testimonials': 'Témoignages',
    'faq': 'FAQ',
    'contact': 'Contact'
  },
  it: {
    'hero-title': 'Agenzia Digitale per Piccole Imprese',
    'hero-subtitle': 'Soluzioni complete per portare la tua attività online',
    'contact-button': 'Contattaci',
    'member-area': 'Area Membri',
    'about': 'Chi Siamo',
    'plans': 'Piani',
    'testimonials': 'Testimonianze',
    'faq': 'FAQ',
    'contact': 'Contatto'
  },
  de: {
    'hero-title': 'Digitalagentur für Kleine Unternehmen',
    'hero-subtitle': 'Komplette Lösungen für Ihr Online-Geschäft',
    'contact-button': 'Kontakt',
    'member-area': 'Mitgliederbereich',
    'about': 'Über Uns',
    'plans': 'Pläne',
    'testimonials': 'Referenzen',
    'faq': 'FAQ',
    'contact': 'Kontakt'
  }
};