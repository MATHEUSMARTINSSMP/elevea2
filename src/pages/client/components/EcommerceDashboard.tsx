import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, DollarSign, Users, Settings, Plus, Edit, Trash2, Eye, TrendingUp, ArrowUpRight } from 'lucide-react';

interface EcommerceDashboardProps {
  siteSlug: string;
  vipPin: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  category: string;
  tags: string[];
  images: string[];
  inventory: {
    quantity: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  customerEmail: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface StoreConfig {
  storeName: string;
  storeDescription: string;
  currency: string;
  taxRate: number;
  shippingRates: any[];
  paymentMethods: any[];
  notificationEmails: string[];
  termsAndConditions: string;
  privacyPolicy: string;
  returnPolicy: string;
}

export function EcommerceDashboard({ siteSlug, vipPin }: EcommerceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'config'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadStoreData();
  }, []);

  async function loadStoreData() {
    setLoading(true);
    try {
      await Promise.all([
        loadStoreConfig(),
        loadProducts(),
        loadOrders(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados da loja:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStoreConfig() {
    try {
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_store_settings',
          siteSlug,
          vipPin
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        setStoreConfig(data.settings);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_products',
          siteSlug,
          vipPin
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_orders',
          siteSlug,
          vipPin
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  }

  async function loadAnalytics() {
    try {
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_store_analytics',
          siteSlug,
          vipPin
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  }

  async function saveProduct(productData: Partial<Product>) {
    try {
      setLoading(true);
      const action = editingProduct ? 'update_product' : 'create_product';
      
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          siteSlug,
          vipPin,
          ...(editingProduct && { productId: editingProduct.id }),
          product: productData
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        await loadProducts();
        setShowProductForm(false);
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_product',
          siteSlug,
          vipPin,
          productId
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order_status',
          siteSlug,
          vipPin,
          orderId,
          order: { status }
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        await loadOrders();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !storeConfig) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white text-slate-900 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">E-commerce</h2>
            <p className="text-slate-600">Gerencie sua loja online completa</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
          { id: 'products', label: 'Produtos', icon: Package },
          { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
          { id: 'config', label: 'Configurações', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Visão Geral */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          {/* Métricas principais */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Receita Total</p>
                  <p className="text-2xl font-bold text-green-900">
                    {analytics.revenue.currency} {analytics.revenue.total.toFixed(2)}
                  </p>
                  <p className="text-green-600 text-sm flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +{analytics.revenue.growth}%
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Pedidos</p>
                  <p className="text-2xl font-bold text-blue-900">{analytics.orders.total}</p>
                  <p className="text-blue-600 text-sm flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +{analytics.orders.growth}%
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Produtos Vendidos</p>
                  <p className="text-2xl font-bold text-purple-900">{analytics.products.totalSold}</p>
                  <p className="text-purple-600 text-sm">Últimos 30 dias</p>
                </div>
                <Package className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-orange-900">{analytics.customers.conversionRate}%</p>
                  <p className="text-orange-600 text-sm">Visitantes → Vendas</p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Produtos mais vendidos */}
          <div className="bg-slate-50 p-4 rounded-xl">
            <h3 className="font-semibold mb-3">Produtos Mais Vendidos</h3>
            <div className="space-y-2">
              {analytics.products.topSelling.map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-slate-600">{product.sales} vendas</p>
                  </div>
                  <p className="font-semibold text-green-600">
                    R$ {product.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Produtos */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Gerenciar Produtos</h3>
            <button
              onClick={() => setShowProductForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Produto
            </button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum produto cadastrado ainda</p>
              <p className="text-sm">Comece adicionando seu primeiro produto</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="aspect-video bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  
                  <h4 className="font-medium mb-1">{product.name}</h4>
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-green-600">
                      R$ {product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-slate-600">
                      Estoque: {product.inventory.quantity}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setShowProductForm(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pedidos */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="font-semibold">Pedidos Recentes</h3>
          
          {orders.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pedido ainda</p>
              <p className="text-sm">Os pedidos aparecerão aqui quando chegarem</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">Pedido #{order.id}</h4>
                      <p className="text-sm text-slate-600">{order.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">R$ {order.total.toFixed(2)}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'pending' ? 'Pendente' :
                         order.status === 'processing' ? 'Processando' :
                         order.status === 'shipped' ? 'Enviado' :
                         order.status === 'delivered' ? 'Entregue' : 'Cancelado'}
                      </span>
                      <span className="text-sm text-slate-600">
                        {order.items.length} item(s)
                      </span>
                    </div>

                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="text-sm border border-slate-300 rounded px-2 py-1"
                    >
                      <option value="pending">Pendente</option>
                      <option value="processing">Processando</option>
                      <option value="shipped">Enviado</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configurações */}
      {activeTab === 'config' && storeConfig && (
        <div className="space-y-6">
          <h3 className="font-semibold">Configurações da Loja</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Loja</label>
                <input
                  type="text"
                  value={storeConfig.storeName}
                  onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={storeConfig.storeDescription}
                  onChange={(e) => setStoreConfig({ ...storeConfig, storeDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg h-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Moeda</label>
                <select
                  value={storeConfig.currency}
                  onChange={(e) => setStoreConfig({ ...storeConfig, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="BRL">Real (BRL)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cor Principal</label>
                <input
                  type="color"
                  value={storeConfig.theme.primaryColor}
                  onChange={(e) => setStoreConfig({
                    ...storeConfig,
                    theme: { ...storeConfig.theme, primaryColor: e.target.value }
                  })}
                  className="w-full h-10 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Layout</label>
                <select
                  value={storeConfig.theme.layout}
                  onChange={(e) => setStoreConfig({
                    ...storeConfig,
                    theme: { ...storeConfig.theme, layout: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="grid">Grade</option>
                  <option value="list">Lista</option>
                  <option value="minimal">Minimalista</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Métodos de Pagamento</label>
                <div className="space-y-2">
                  {['stripe', 'mercadopago', 'pix', 'paypal'].map((method) => (
                    <label key={method} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={storeConfig.paymentMethods.includes(method)}
                        onChange={(e) => {
                          const methods = e.target.checked
                            ? [...storeConfig.paymentMethods, method]
                            : storeConfig.paymentMethods.filter(m => m !== method);
                          setStoreConfig({ ...storeConfig, paymentMethods: methods });
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{method}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              // Salvar configurações
              fetch('/.netlify/functions/ecommerce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'update_store_settings',
                  siteSlug,
                  vipPin,
                  settings: storeConfig
                })
              });
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salvar Configurações
          </button>
        </div>
      )}

      {/* Modal de produto */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onSave={saveProduct}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Formulário de produto separado
function ProductForm({ 
  product, 
  onSave, 
  onCancel 
}: { 
  product: Product | null; 
  onSave: (product: Partial<Product>) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '',
      description: '',
      price: 0,
      sku: '',
      category: '',
      tags: [],
      images: [],
      inventory: {
        quantity: 0,
        trackQuantity: false,
        allowBackorder: false
      },
      seo: {
        title: '',
        description: '',
        keywords: []
      },
      status: 'draft',
      featured: false
    }
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {product ? 'Editar Produto' : 'Adicionar Produto'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Produto</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Nome do produto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg h-24"
              placeholder="Descrição detalhada do produto"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preço</label>
              <input
                type="number"
                step="0.01"
                value={formData.price || 0}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estoque</label>
              <input
                type="number"
                value={formData.inventory?.quantity || 0}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  inventory: { 
                    ...formData.inventory || { quantity: 0, trackQuantity: false, allowBackorder: false },
                    quantity: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="ex: roupas, eletrônicos, livros"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.featured || false}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Produto em destaque</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {product ? 'Atualizar' : 'Adicionar'} Produto
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}