import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/ui/card';
import { Button } from '../../../src/components/ui/button';
import { Input } from '../../../src/components/ui/input';
import { Badge } from '../../../src/components/ui/badge';
import { 
  ShoppingCart, 
  Star, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Heart,
  ArrowLeft,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '../../../src/components/ui/alert';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  images: string[];
  preview_url: string;
  demo_url: string;
  tags: string[];
  features: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  responsive: boolean;
  includes_dark_mode: boolean;
  file_size: string;
  last_updated: string;
  downloads_count: number;
  rating: number;
  reviews_count: number;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
  };
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  template_count: number;
}

interface PurchaseHistory {
  id: string;
  template_id: string;
  template_name: string;
  price_paid: number;
  currency: string;
  purchase_date: string;
  download_url: string;
  license_key: string;
  status: 'completed' | 'pending' | 'refunded';
}

interface TemplateMarketplaceProps {
  siteSlug: string;
  vipPin: string;
}

export default function TemplateMarketplace({ siteSlug, vipPin }: TemplateMarketplaceProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [currentView, setCurrentView] = useState<'marketplace' | 'template-details' | 'purchases' | 'checkout'>('marketplace');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    loadTemplates();
    loadCategories();
    loadPurchaseHistory();
  }, []);

  const loadTemplates = async (filters: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/template-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_templates',
          filters: {
            ...filters,
            category: selectedCategory,
            searchTerm: searchTerm,
            priceMin: priceRange.min,
            priceMax: priceRange.max
          }
        })
      });

      const data = await response.json();
      if (data.ok) {
        setTemplates(data.templates);
      } else {
        setError(data.error || 'Erro ao carregar templates');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/.netlify/functions/template-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_categories'
        })
      });

      const data = await response.json();
      if (data.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const loadPurchaseHistory = async () => {
    try {
      const response = await fetch('/.netlify/functions/template-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_purchase_history',
          siteSlug,
          vipPin
        })
      });

      const data = await response.json();
      if (data.ok) {
        setPurchaseHistory(data.purchases);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const getTemplateDetails = async (templateId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/template-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_template_details',
          templateId
        })
      });

      const data = await response.json();
      if (data.ok) {
        setSelectedTemplate(data.template);
        setCurrentView('template-details');
      } else {
        setError(data.error || 'Erro ao carregar detalhes');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const purchaseTemplate = async (templateId: string, paymentData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/template-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase_template',
          siteSlug,
          vipPin,
          templateId,
          paymentData
        })
      });

      const data = await response.json();
      if (data.ok) {
        setSuccess('Template comprado com sucesso!');
        setCurrentView('purchases');
        loadPurchaseHistory();
      } else {
        setError(data.error || 'Erro no pagamento');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId: string, customizations: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/template-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_template',
          siteSlug,
          vipPin,
          templateId,
          customizations
        })
      });

      const data = await response.json();
      if (data.ok) {
        setSuccess('Template aplicado ao seu site!');
      } else {
        setError(data.error || 'Erro ao aplicar template');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTemplateCard = (template: Template) => (
    <Card key={template.id} className="group hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={template.images[0] || '/placeholder-template.jpg'} 
          alt={template.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge className={getDifficultyColor(template.difficulty)}>
            {template.difficulty}
          </Badge>
          {template.responsive && (
            <Badge variant="secondary">Responsivo</Badge>
          )}
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm">{template.rating.toFixed(1)}</span>
          <span className="text-xs opacity-75">({template.reviews_count})</span>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
            {template.name}
          </h3>
          <span className="font-bold text-lg text-green-600">
            {template.currency} {template.price}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {template.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>{template.downloads_count.toLocaleString()} downloads</span>
          </div>
          <span>{template.file_size}</span>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(template.demo_url, '_blank')}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => getTemplateDetails(template.id)}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Comprar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTemplateDetails = () => {
    if (!selectedTemplate) return null;

    const isPurchased = purchaseHistory.some(p => p.template_id === selectedTemplate.id && p.status === 'completed');

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={() => setCurrentView('marketplace')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <img 
              src={selectedTemplate.images[0]} 
              alt={selectedTemplate.name}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
            
            <div className="grid grid-cols-3 gap-2">
              {selectedTemplate.images.slice(1, 4).map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  alt={`${selectedTemplate.name} ${index + 2}`}
                  className="w-full h-20 object-cover rounded"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">
                {selectedTemplate.currency} {selectedTemplate.price}
              </span>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{selectedTemplate.rating.toFixed(1)}</span>
                <span className="text-gray-500">({selectedTemplate.reviews_count} avaliações)</span>
              </div>
            </div>

            <p className="text-gray-700">{selectedTemplate.description}</p>

            <div className="space-y-2">
              <h4 className="font-semibold">Funcionalidades:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {selectedTemplate.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Categoria:</span>
                <p className="text-gray-600">{selectedTemplate.category}</p>
              </div>
              <div>
                <span className="font-semibold">Dificuldade:</span>
                <Badge className={getDifficultyColor(selectedTemplate.difficulty)}>
                  {selectedTemplate.difficulty}
                </Badge>
              </div>
              <div>
                <span className="font-semibold">Tamanho:</span>
                <p className="text-gray-600">{selectedTemplate.file_size}</p>
              </div>
              <div>
                <span className="font-semibold">Downloads:</span>
                <p className="text-gray-600">{selectedTemplate.downloads_count.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.open(selectedTemplate.demo_url, '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Demo
              </Button>
              
              {isPurchased ? (
                <Button 
                  className="flex-1"
                  onClick={() => applyTemplate(selectedTemplate.id)}
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aplicar ao Site
                </Button>
              ) : (
                <Button 
                  className="flex-1"
                  onClick={() => setCurrentView('checkout')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Comprar Agora
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPurchases = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6">Meus Templates</h2>
      
      {purchaseHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma compra ainda</h3>
            <p className="text-gray-600 mb-4">Explore nossa coleção de templates premium</p>
            <Button onClick={() => setCurrentView('marketplace')}>
              Ver Templates
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchaseHistory.map(purchase => (
            <Card key={purchase.id}>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">{purchase.template_name}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Comprado em: {new Date(purchase.purchase_date).toLocaleDateString()}</p>
                  <p>Valor pago: {purchase.currency} {purchase.price_paid}</p>
                  <p className="flex items-center gap-2">
                    Status: 
                    <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                      {purchase.status}
                    </Badge>
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(purchase.download_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => applyTemplate(purchase.template_id)}
                  >
                    Aplicar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderMarketplace = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">Marketplace de Templates</h2>
        <Button 
          variant="outline" 
          onClick={() => setCurrentView('purchases')}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Meus Templates ({purchaseHistory.length})
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              <option value="">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <Button onClick={() => loadTemplates()} disabled={loading}>
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map(renderTemplateCard)}
        </div>
      )}

      {templates.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou termos de busca</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCheckout = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={() => setCurrentView('template-details')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold">Finalizar Compra</h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <img 
                src={selectedTemplate.images[0]} 
                alt={selectedTemplate.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
                <p className="text-gray-600">{selectedTemplate.category}</p>
                <p className="font-bold text-xl text-green-600">
                  {selectedTemplate.currency} {selectedTemplate.price}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <Input placeholder="Seu nome completo" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" placeholder="seu@email.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Método de Pagamento</label>
                <select className="w-full border rounded-md px-3 py-2">
                  <option value="credit">Cartão de Crédito</option>
                  <option value="debit">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>

              <Button 
                className="w-full"
                onClick={() => purchaseTemplate(selectedTemplate.id, {
                  method: 'credit',
                  token: 'demo-token',
                  email: 'cliente@exemplo.com',
                  name: 'Cliente Demo'
                })}
                disabled={loading}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {loading ? 'Processando...' : `Pagar ${selectedTemplate.currency} ${selectedTemplate.price}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {currentView === 'marketplace' && renderMarketplace()}
      {currentView === 'template-details' && renderTemplateDetails()}
      {currentView === 'purchases' && renderPurchases()}
      {currentView === 'checkout' && renderCheckout()}
    </div>
  );
}