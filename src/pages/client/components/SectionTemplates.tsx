import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Eye, Copy } from 'lucide-react'

interface SectionTemplate {
  id: string
  name: string
  description: string
  type: 'hero' | 'about' | 'services' | 'products' | 'gallery' | 'contact' | 'custom'
  category: 'health' | 'food' | 'automotive' | 'jewelry' | 'construction' | 'technology' | 'general'
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'image' | 'url' | 'number' | 'boolean'
    required?: boolean
    placeholder?: string
  }>
  preview: {
    title: string
    subtitle?: string
    description?: string
    image?: string
  }
}

interface SectionTemplatesProps {
  siteSlug: string
  vipPin: string
  businessType: string
  onTemplateSelected?: (template: SectionTemplate) => void
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  // Hero Sections
  {
    id: 'hero-basic',
    name: 'Hero Básico',
    description: 'Seção principal com título, subtítulo e botão de ação',
    type: 'hero',
    category: 'general',
    fields: [
      { key: 'title', label: 'Título Principal', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'cta_text', label: 'Texto do Botão', type: 'text' },
      { key: 'cta_link', label: 'Link do Botão', type: 'url' },
      { key: 'background_image', label: 'Imagem de Fundo', type: 'image' }
    ],
    preview: {
      title: 'Bem-vindo à Nossa Empresa',
      subtitle: 'Soluções de qualidade para você',
      description: 'Oferecemos os melhores serviços com excelência e dedicação.'
    }
  },
  {
    id: 'hero-health',
    name: 'Hero Saúde',
    description: 'Seção principal para clínicas e consultórios',
    type: 'hero',
    category: 'health',
    fields: [
      { key: 'title', label: 'Título Principal', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'cta_text', label: 'Texto do Botão', type: 'text' },
      { key: 'cta_link', label: 'Link do Botão', type: 'url' },
      { key: 'background_image', label: 'Imagem de Fundo', type: 'image' },
      { key: 'specialties', label: 'Especialidades', type: 'textarea' }
    ],
    preview: {
      title: 'Cuidando da Sua Saúde',
      subtitle: 'Especialistas em medicina preventiva',
      description: 'Oferecemos consultas e tratamentos com os melhores profissionais da área.'
    }
  },
  {
    id: 'hero-food',
    name: 'Hero Restaurante',
    description: 'Seção principal para restaurantes e lanchonetes',
    type: 'hero',
    category: 'food',
    fields: [
      { key: 'title', label: 'Nome do Restaurante', type: 'text', required: true },
      { key: 'subtitle', label: 'Slogan', type: 'text' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'cta_text', label: 'Texto do Botão', type: 'text' },
      { key: 'cta_link', label: 'Link do Botão', type: 'url' },
      { key: 'background_image', label: 'Imagem de Fundo', type: 'image' },
      { key: 'specialties', label: 'Especialidades', type: 'textarea' }
    ],
    preview: {
      title: 'Nosso Restaurante',
      subtitle: 'Sabores únicos para você',
      description: 'Oferecemos uma experiência gastronômica única com pratos especiais.'
    }
  },

  // About Sections
  {
    id: 'about-basic',
    name: 'Sobre Básico',
    description: 'Seção sobre a empresa com história e valores',
    type: 'about',
    category: 'general',
    fields: [
      { key: 'title', label: 'Título da Seção', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'image', label: 'Imagem', type: 'image' },
      { key: 'history', label: 'Nossa História', type: 'textarea' },
      { key: 'mission', label: 'Missão', type: 'textarea' },
      { key: 'vision', label: 'Visão', type: 'textarea' }
    ],
    preview: {
      title: 'Sobre Nós',
      subtitle: 'Conheça nossa história e valores',
      description: 'Somos especializados em oferecer os melhores serviços com qualidade e dedicação.'
    }
  },

  // Services Sections
  {
    id: 'services-basic',
    name: 'Serviços Básico',
    description: 'Lista de serviços oferecidos pela empresa',
    type: 'services',
    category: 'general',
    fields: [
      { key: 'title', label: 'Título da Seção', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'image', label: 'Imagem', type: 'image' },
      { key: 'services_list', label: 'Lista de Serviços', type: 'textarea' },
      { key: 'pricing', label: 'Preços', type: 'textarea' }
    ],
    preview: {
      title: 'Nossos Serviços',
      subtitle: 'Soluções completas para suas necessidades',
      description: 'Oferecemos uma gama completa de serviços para atender suas necessidades.'
    }
  },

  // Contact Sections
  {
    id: 'contact-basic',
    name: 'Contato Básico',
    description: 'Informações de contato da empresa',
    type: 'contact',
    category: 'general',
    fields: [
      { key: 'title', label: 'Título da Seção', type: 'text', required: true },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'image', label: 'Imagem', type: 'image' },
      { key: 'address', label: 'Endereço', type: 'textarea' },
      { key: 'phone', label: 'Telefone', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'text' },
      { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
      { key: 'schedule', label: 'Horários', type: 'textarea' }
    ],
    preview: {
      title: 'Entre em Contato',
      subtitle: 'Fale conosco para mais informações',
      description: 'Estamos prontos para atender você da melhor forma possível.'
    }
  }
]

export default function SectionTemplates({ 
  siteSlug, 
  vipPin, 
  businessType, 
  onTemplateSelected 
}: SectionTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtrar templates por categoria e tipo
  const filteredTemplates = SECTION_TEMPLATES.filter(template => {
    const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory
    const typeMatch = selectedType === 'all' || template.type === selectedType
    return categoryMatch && typeMatch
  })

  const handleTemplateSelect = async (template: SectionTemplate) => {
    try {
      setLoading(true)
      setError(null)

      // Aqui você pode implementar a lógica para adicionar a seção ao site
      // Por enquanto, apenas chama o callback
      onTemplateSelected?.(template)
      
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar seção')
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { id: 'all', name: 'Todas as Categorias' },
    { id: 'general', name: 'Geral' },
    { id: 'health', name: 'Saúde' },
    { id: 'food', name: 'Alimentação' },
    { id: 'automotive', name: 'Automotivo' },
    { id: 'jewelry', name: 'Joias' },
    { id: 'construction', name: 'Construção' },
    { id: 'technology', name: 'Tecnologia' }
  ]

  const types = [
    { id: 'all', name: 'Todos os Tipos' },
    { id: 'hero', name: 'Hero' },
    { id: 'about', name: 'Sobre' },
    { id: 'services', name: 'Serviços' },
    { id: 'products', name: 'Produtos' },
    { id: 'gallery', name: 'Galeria' },
    { id: 'contact', name: 'Contato' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Templates de Seções</h3>
        <p className="text-sm text-muted-foreground">
          Escolha um template para adicionar uma nova seção ao seu site
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-48">
          <label className="text-sm font-medium mb-2 block">Categoria</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-sm font-medium mb-2 block">Tipo</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {types.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Lista de templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {template.type}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium text-sm">{template.preview.title}</h4>
                {template.preview.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.preview.subtitle}
                  </p>
                )}
                {template.preview.description && (
                  <p className="text-xs mt-2">{template.preview.description}</p>
                )}
              </div>

              {/* Campos */}
              <div>
                <p className="text-xs font-medium mb-2">Campos incluídos:</p>
                <div className="flex flex-wrap gap-1">
                  {template.fields.slice(0, 4).map((field) => (
                    <Badge key={field.key} variant="secondary" className="text-xs">
                      {field.label}
                    </Badge>
                  ))}
                  {template.fields.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.fields.length - 4} mais
                    </Badge>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleTemplateSelect(template)}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Adicionar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {/* TODO: Implementar preview */}}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Nenhum template encontrado para os filtros selecionados.
          </p>
        </div>
      )}
    </div>
  )
}
