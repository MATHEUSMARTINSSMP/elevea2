import React, { useState } from 'react';

interface ContentSuggestion {
  title: string;
  subtitle: string;
  description: string;
  callToAction: string;
  keywords: string[];
}

interface AIContentGeneratorProps {
  businessType?: string;
  businessName?: string;
  businessDescription?: string;
  onContentGenerated: (content: ContentSuggestion[]) => void;
  onClose: () => void;
}

export default function AIContentGenerator({ 
  businessType = '', 
  businessName = '', 
  businessDescription = '',
  onContentGenerated,
  onClose 
}: AIContentGeneratorProps) {
  const [formData, setFormData] = useState({
    businessType: businessType,
    businessName: businessName,
    businessDescription: businessDescription
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentSuggestion[]>([]);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!formData.businessType.trim() || !formData.businessName.trim()) {
      setError('Tipo de negócio e nome são obrigatórios');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/ai-content-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();

      if (data.ok && data.content) {
        setGeneratedContent(data.content);
      } else {
        throw new Error(data.error || 'Erro na geração de conteúdo');
      }
    } catch (error) {
      console.error('Erro na geração:', error);
      setError('Erro ao gerar conteúdo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyContent = () => {
    onContentGenerated(generatedContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Gerador de Conteúdo IA</h3>
              <p className="text-purple-100 text-sm">Crie conteúdo profissional para seu site automaticamente</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!generatedContent.length ? (
            /* Formulário de Configuração */
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Negócio *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione o tipo de negócio</option>
                  <option value="restaurante">Restaurante</option>
                  <option value="salão de beleza">Salão de Beleza</option>
                  <option value="clínica médica">Clínica Médica</option>
                  <option value="escritório advocacia">Escritório de Advocacia</option>
                  <option value="oficina mecânica">Oficina Mecânica</option>
                  <option value="loja roupas">Loja de Roupas</option>
                  <option value="academia">Academia</option>
                  <option value="escola">Escola/Curso</option>
                  <option value="pet shop">Pet Shop</option>
                  <option value="imobiliária">Imobiliária</option>
                  <option value="consultoria">Consultoria</option>
                  <option value="e-commerce">E-commerce</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Negócio *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Ex: Pizzaria do João, Salão Bella Vista..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Negócio (opcional)
                </label>
                <textarea
                  value={formData.businessDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                  placeholder="Descreva brevemente seu negócio, diferenciais, público-alvo..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Gerando conteúdo...</span>
                  </div>
                ) : (
                  'Gerar Conteúdo com IA'
                )}
              </button>
            </div>
          ) : (
            /* Conteúdo Gerado */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-800">
                  Conteúdo Gerado para {formData.businessName}
                </h4>
                <button
                  onClick={() => setGeneratedContent([])}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  ← Voltar ao formulário
                </button>
              </div>

              <div className="space-y-4">
                {generatedContent.map((section, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-semibold text-gray-800 mb-2">{section.title}</h5>
                    {section.subtitle && (
                      <p className="text-sm text-gray-600 mb-2 font-medium">{section.subtitle}</p>
                    )}
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{section.description}</p>
                    {section.callToAction && (
                      <p className="text-sm font-medium text-purple-600 mb-2">
                        💬 Call to Action: {section.callToAction}
                      </p>
                    )}
                    {section.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {section.keywords.slice(0, 5).map((keyword, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleApplyContent}
                  className="flex-1 p-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Aplicar ao Site
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 p-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  Gerar Novo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}