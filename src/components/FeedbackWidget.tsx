import React, { useState, useEffect } from 'react';
import { StarIcon, MessageSquareIcon, XIcon, CheckIcon, SendIcon } from 'lucide-react';

interface FeedbackWidgetProps {
  siteSlug: string;
  className?: string;
}

interface Feedback {
  id: string;
  name: string;
  rating: number;
  message: string;
  createdAt: string;
}

export default function FeedbackWidget({ siteSlug, className = '' }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rating: 0,
    message: ''
  });

  // Buscar feedbacks aprovados
  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/.netlify/functions/feedback?action=get_public&site=${siteSlug}&limit=5`);
      const result = await response.json();
      
      if (result.ok) {
        setFeedbacks(result.data.feedbacks);
      }
    } catch (error) {
      console.error('Erro ao buscar feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Submeter feedback
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.rating || !formData.message) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          siteSlug,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          rating: formData.rating,
          message: formData.message,
          source: 'website'
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', rating: 0, message: '' });
        // Atualizar lista após 2 segundos
        setTimeout(() => {
          fetchFeedbacks();
          setSubmitted(false);
          setShowForm(false);
        }, 2000);
      } else {
        alert('Erro ao enviar feedback. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen && !showForm) {
      fetchFeedbacks();
    }
  }, [isOpen, showForm]);

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} ${
          interactive ? 'cursor-pointer hover:text-yellow-300' : ''
        }`}
        onClick={interactive ? () => setFormData({ ...formData, rating: i + 1 }) : undefined}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${className}`}
        title="Deixe seu feedback"
      >
        <MessageSquareIcon className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {showForm ? 'Deixe seu Feedback' : 'Feedbacks dos Clientes'}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowForm(false);
                  setSubmitted(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {showForm ? (
                // Formulário de Feedback
                <form onSubmit={submitFeedback} className="space-y-4">
                  {submitted ? (
                    <div className="text-center py-8">
                      <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Feedback Enviado!
                      </h4>
                      <p className="text-gray-600 text-sm">
                        Obrigado pelo seu feedback. Ele será analisado e poderá aparecer no site.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Seu nome"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Avaliação *
                        </label>
                        <div className="flex gap-1">
                          {renderStars(formData.rating, true)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mensagem *
                        </label>
                        <textarea
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Conte-nos sua experiência..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            E-mail
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="seu@email.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="(96) 99999-9999"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <SendIcon className="w-4 h-4" />
                            Enviar Feedback
                          </>
                        )}
                      </button>
                    </>
                  )}
                </form>
              ) : (
                // Lista de Feedbacks
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">Carregando feedbacks...</p>
                    </div>
                  ) : feedbacks.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquareIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum feedback ainda
                      </h4>
                      <p className="text-gray-600 text-sm mb-4">
                        Seja o primeiro a deixar seu feedback!
                      </p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        Deixar Feedback
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {feedbacks.map((feedback) => (
                          <div key={feedback.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900 text-sm">
                                {feedback.name}
                              </h5>
                              <span className="text-xs text-gray-500">
                                {formatDate(feedback.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {renderStars(feedback.rating)}
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {feedback.message}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setShowForm(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
                      >
                        Deixar meu Feedback
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
