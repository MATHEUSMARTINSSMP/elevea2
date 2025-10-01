import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Eye, EyeOff, Image as ImageIcon, Upload, Plus } from 'lucide-react'
import ImageManager from './ImageManager'
import SectionTemplates from './SectionTemplates'
import SectionCustomizer from './SectionCustomizer'

interface SectionField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'url' | 'number' | 'boolean'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
}

interface SiteSection {
  id: string
  type: 'hero' | 'about' | 'services' | 'products' | 'gallery' | 'contact' | 'custom'
  title: string
  subtitle?: string
  description?: string
  image?: string
  order: number
  visible: boolean
  customFields?: Record<string, any>
  lastUpdated?: string
  editableFields?: SectionField[]
}

interface SiteEditorProps {
  siteSlug: string
  vipPin: string
  onContentUpdated?: (sectionId: string, field: string, value: any) => void
}

export default function SiteEditor({ siteSlug, vipPin, onContentUpdated }: SiteEditorProps) {
  const [sections, setSections] = useState<SiteSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [sectionData, setSectionData] = useState<Record<string, any>>({})
  const [showTemplates, setShowTemplates] = useState(false)

  // Carregar seções do site
  useEffect(() => {
    loadSections()
  }, [siteSlug])

  const loadSections = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/.netlify/functions/site-content-editor?site=${encodeURIComponent(siteSlug)}`)
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.error || 'Erro ao carregar seções')
      }
      
      setSections(data.sections || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar seções do site')
    } finally {
      setLoading(false)
    }
  }

  const updateSectionField = async (sectionId: string, field: string, value: any) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/.netlify/functions/site-content-editor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: siteSlug,
          sectionId,
          field,
          value,
          pin: vipPin
        })
      })
      
      const data = await response.json()
      
      if (!data.ok) {
        throw new Error(data.error || 'Erro ao atualizar seção')
      }
      
      // Atualizar estado local
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, [field]: value, lastUpdated: new Date().toISOString() }
          : section
      ))
      
      setSuccess('Seção atualizada com sucesso!')
      onContentUpdated?.(sectionId, field, value)
      
      // Limpar sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar seção')
    } finally {
      setSaving(false)
    }
  }

  const updateSectionData = async (sectionId: string, data: Record<string, any>) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/.netlify/functions/site-content-editor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: siteSlug,
          sectionId,
          sectionData: data,
          pin: vipPin
        })
      })
      
      const result = await response.json()
      
      if (!result.ok) {
        throw new Error(result.error || 'Erro ao atualizar seção')
      }
      
      // Atualizar estado local
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, ...data, lastUpdated: new Date().toISOString() }
          : section
      ))
      
      setSuccess('Seção atualizada com sucesso!')
      onContentUpdated?.(sectionId, 'sectionData', data)
      
      // Limpar sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar seção')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (sectionId: string, field: string, value: any) => {
    setSectionData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value
      }
    }))
  }

  const saveSection = (sectionId: string) => {
    const data = sectionData[sectionId] || {}
    updateSectionData(sectionId, data)
    setEditingSection(null)
    setSectionData(prev => {
      const newData = { ...prev }
      delete newData[sectionId]
      return newData
    })
  }

  const cancelEdit = (sectionId: string) => {
    setEditingSection(null)
    setSectionData(prev => {
      const newData = { ...prev }
      delete newData[sectionId]
      return newData
    })
  }

  const handleTemplateSelected = (template: any) => {
    // TODO: Implementar adição de nova seção baseada no template
    console.log('Template selecionado:', template)
    setShowTemplates(false)
  }

  const renderField = (section: SiteSection, field: SectionField) => {
    const currentValue = editingSection === section.id 
      ? (sectionData[section.id]?.[field.key] ?? section[field.key as keyof SiteSection])
      : section[field.key as keyof SiteSection]

    const handleChange = (value: any) => {
      if (editingSection === section.id) {
        handleFieldChange(section.id, field.key, value)
      } else {
        updateSectionField(section.id, field.key, value)
      }
    }

    switch (field.type) {
      case 'text':
      case 'url':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`${section.id}-${field.key}`}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={`${section.id}-${field.key}`}
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={saving}
            />
          </div>
        )

      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`${section.id}-${field.key}`}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={`${section.id}-${field.key}`}
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={saving}
              rows={4}
            />
          </div>
        )

      case 'boolean':
        return (
          <div key={field.key} className="flex items-center space-x-2">
            <Switch
              id={`${section.id}-${field.key}`}
              checked={currentValue || false}
              onCheckedChange={handleChange}
              disabled={saving}
            />
            <Label htmlFor={`${section.id}-${field.key}`}>
              {field.label}
            </Label>
          </div>
        )

      case 'image':
        return (
          <div key={field.key} className="space-y-2">
            <ImageManager
              siteSlug={siteSlug}
              vipPin={vipPin}
              currentImageUrl={currentValue || ''}
              label={field.label}
              description={field.placeholder}
              onImageSelected={(url) => handleChange(url)}
            />
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando seções do site...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Editor de Site</h2>
          <p className="text-muted-foreground">
            Edite o conteúdo das seções do seu site
          </p>
        </div>
        <Button onClick={loadSections} variant="outline" disabled={loading}>
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

               <Tabs defaultValue="sections" className="space-y-4">
                 <TabsList>
                   <TabsTrigger value="sections">Seções</TabsTrigger>
                   <TabsTrigger value="customizer">Personalizar</TabsTrigger>
                   <TabsTrigger value="templates">Templates</TabsTrigger>
                   <TabsTrigger value="preview">Preview</TabsTrigger>
                 </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Seções do Site</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie o conteúdo das seções do seu site
              </p>
            </div>
            <Button
              onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Seção
            </Button>
          </div>

          {sections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhuma seção encontrada para este site.
                </p>
                <Button
                  onClick={() => setShowTemplates(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Primeira Seção
                </Button>
              </CardContent>
            </Card>
          ) : (
            sections.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <Badge variant={section.visible ? "default" : "secondary"}>
                        {section.visible ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Visível
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Oculto
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline">{section.type}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingSection === section.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveSection(section.id)}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelEdit(section.id)}
                            disabled={saving}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSection(section.id)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                  {section.subtitle && (
                    <CardDescription>{section.subtitle}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {section.editableFields?.map((field) => renderField(section, field))}
                  
                  {section.lastUpdated && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Última atualização: {new Date(section.lastUpdated).toLocaleString('pt-BR')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

                 <TabsContent value="customizer" className="space-y-4">
                   <SectionCustomizer
                     siteSlug={siteSlug}
                     vipPin={vipPin}
                     onSectionsUpdated={(updatedSections) => {
                       console.log('Seções atualizadas:', updatedSections)
                       // Recarregar seções após personalização
                       loadSections()
                     }}
                   />
                 </TabsContent>

                 <TabsContent value="templates" className="space-y-4">
                   <SectionTemplates
                     siteSlug={siteSlug}
                     vipPin={vipPin}
                     businessType="general" // TODO: Obter do contexto do site
                     onTemplateSelected={handleTemplateSelected}
                   />
                 </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview do Site</CardTitle>
              <CardDescription>
                Visualização das seções do seu site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {sections
                  .filter(section => section.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div key={section.id} className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                      {section.subtitle && (
                        <p className="text-muted-foreground mb-4">{section.subtitle}</p>
                      )}
                      {section.description && (
                        <p className="text-sm mb-4">{section.description}</p>
                      )}
                      {section.image && (
                        <img 
                          src={section.image} 
                          alt={section.title}
                          className="w-full h-48 object-cover rounded-md"
                        />
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
