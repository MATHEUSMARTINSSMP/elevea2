import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Edit3, Trash2, Plus, Eye, EyeOff, GripVertical } from 'lucide-react'

interface SectionField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'url' | 'number' | 'boolean'
  required?: boolean
  placeholder?: string
  value?: any
}

interface CustomSection {
  id: string
  name: string
  type: 'hero' | 'about' | 'services' | 'products' | 'gallery' | 'contact' | 'custom'
  title: string
  subtitle?: string
  description?: string
  image?: string
  order: number
  visible: boolean
  customFields: SectionField[]
  lastUpdated?: string
}

interface SectionCustomizerProps {
  siteSlug: string
  vipPin: string
  onSectionsUpdated?: (sections: CustomSection[]) => void
}

export default function SectionCustomizer({ 
  siteSlug, 
  vipPin, 
  onSectionsUpdated 
}: SectionCustomizerProps) {
  const [sections, setSections] = useState<CustomSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)

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
      
      // Converter para formato customizável
      const customSections = (data.sections || []).map((section: any) => ({
        ...section,
        customFields: section.editableFields || []
      }))
      
      setSections(customSections)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar seções do site')
    } finally {
      setLoading(false)
    }
  }

  const updateSection = async (sectionId: string, updates: Partial<CustomSection>) => {
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
          sectionData: updates,
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
          ? { ...section, ...updates, lastUpdated: new Date().toISOString() }
          : section
      ))
      
      setSuccess('Seção atualizada com sucesso!')
      onSectionsUpdated?.(sections)
      
      // Limpar sucesso após 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar seção')
    } finally {
      setSaving(false)
    }
  }

  const addCustomField = (sectionId: string) => {
    const newField: SectionField = {
      key: `custom_${Date.now()}`,
      label: 'Novo Campo',
      type: 'text',
      placeholder: 'Digite aqui...'
    }

    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { 
            ...section, 
            customFields: [...section.customFields, newField]
          }
        : section
    ))
  }

  const updateCustomField = (sectionId: string, fieldKey: string, updates: Partial<SectionField>) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? {
            ...section,
            customFields: section.customFields.map(field =>
              field.key === fieldKey ? { ...field, ...updates } : field
            )
          }
        : section
    ))
  }

  const removeCustomField = (sectionId: string, fieldKey: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? {
            ...section,
            customFields: section.customFields.filter(field => field.key !== fieldKey)
          }
        : section
    ))
  }

  const saveSection = async (section: CustomSection) => {
    await updateSection(section.id, section)
    setEditingSection(null)
  }

  const toggleSectionVisibility = async (sectionId: string, visible: boolean) => {
    await updateSection(sectionId, { visible })
  }

  const reorderSections = (fromIndex: number, toIndex: number) => {
    const newSections = [...sections]
    const [movedSection] = newSections.splice(fromIndex, 1)
    newSections.splice(toIndex, 0, movedSection)
    
    // Atualizar ordem
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      order: index + 1
    }))
    
    setSections(updatedSections)
    
    // Salvar nova ordem
    updatedSections.forEach(section => {
      updateSection(section.id, { order: section.order })
    })
  }

  const renderFieldEditor = (section: CustomSection, field: SectionField) => {
    const handleFieldChange = (updates: Partial<SectionField>) => {
      updateCustomField(section.id, field.key, updates)
    }

    return (
      <div key={field.key} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={field.label}
              onChange={(e) => handleFieldChange({ label: e.target.value })}
              placeholder="Nome do campo"
              className="text-sm"
            />
            <select
              value={field.type}
              onChange={(e) => handleFieldChange({ type: e.target.value as any })}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="text">Texto</option>
              <option value="textarea">Texto Longo</option>
              <option value="image">Imagem</option>
              <option value="url">URL</option>
              <option value="number">Número</option>
              <option value="boolean">Sim/Não</option>
            </select>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => handleFieldChange({ placeholder: e.target.value })}
              placeholder="Placeholder"
              className="text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => removeCustomField(section.id, field.key)}
            className="ml-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            checked={field.required || false}
            onCheckedChange={(checked) => handleFieldChange({ required: checked })}
          />
          <Label className="text-sm">Campo obrigatório</Label>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando seções...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Personalizador de Seções</h2>
          <p className="text-muted-foreground">
            Personalize completamente as seções do seu site
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

      <div className="space-y-4">
        {sections
          .sort((a, b) => a.order - b.order)
          .map((section, index) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {section.title}
                        <Badge variant="outline">{section.type}</Badge>
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
                      </CardTitle>
                      {section.subtitle && (
                        <CardDescription>{section.subtitle}</CardDescription>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={section.visible}
                      onCheckedChange={(checked) => toggleSectionVisibility(section.id, checked)}
                      disabled={saving}
                    />
                    {editingSection === section.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => saveSection(section)}
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSection(null)}
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
                        <Edit3 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {editingSection === section.id && (
                <CardContent className="space-y-6">
                  {/* Campos básicos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Título da Seção</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => setSections(prev => prev.map(s => 
                          s.id === section.id ? { ...s, title: e.target.value } : s
                        ))}
                        placeholder="Título da seção"
                      />
                    </div>
                    <div>
                      <Label>Subtítulo</Label>
                      <Input
                        value={section.subtitle || ''}
                        onChange={(e) => setSections(prev => prev.map(s => 
                          s.id === section.id ? { ...s, subtitle: e.target.value } : s
                        ))}
                        placeholder="Subtítulo da seção"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={section.description || ''}
                      onChange={(e) => setSections(prev => prev.map(s => 
                        s.id === section.id ? { ...s, description: e.target.value } : s
                      ))}
                      placeholder="Descrição da seção"
                      rows={3}
                    />
                  </div>

                  {/* Campos personalizados */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Campos Personalizados</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addCustomField(section.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Campo
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {section.customFields.map(field => renderFieldEditor(section, field))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
      </div>
    </div>
  )
}
