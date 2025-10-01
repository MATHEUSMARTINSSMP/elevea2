import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, Image as ImageIcon, X, Check } from 'lucide-react'

interface ImageManagerProps {
  siteSlug: string
  vipPin: string
  onImageSelected?: (imageUrl: string) => void
  currentImageUrl?: string
  label?: string
  description?: string
}

export default function ImageManager({ 
  siteSlug, 
  vipPin, 
  onImageSelected, 
  currentImageUrl = '',
  label = 'Imagem',
  description 
}: ImageManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState(currentImageUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem')
      return
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 10MB')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setSuccess(null)

      // Converter para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remover prefixo data:image/...;base64,
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload para o GAS
      const response = await fetch('/.netlify/functions/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: siteSlug,
          email: 'dashboard@elevea.com', // Email padrão para uploads do dashboard
          base64: base64,
          filename: file.name,
          mimeType: file.type,
          subfolder: 'dashboard'
        })
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(data.error || 'Erro no upload')
      }

      const newImageUrl = data.url || data.saved?.[0]?.url
      if (newImageUrl) {
        setImageUrl(newImageUrl)
        setSuccess('Imagem enviada com sucesso!')
        onImageSelected?.(newImageUrl)
        
        // Limpar sucesso após 3 segundos
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error('URL da imagem não retornada')
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleUrlChange = (url: string) => {
    setImageUrl(url)
    onImageSelected?.(url)
  }

  const clearImage = () => {
    setImageUrl('')
    onImageSelected?.('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {label}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload de arquivo */}
        <div className="space-y-2">
          <Label>Enviar arquivo</Label>
          <div className="flex items-center space-x-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar arquivo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* URL da imagem */}
        <div className="space-y-2">
          <Label>Ou cole a URL da imagem</Label>
          <div className="flex items-center space-x-2">
            <Input
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              disabled={uploading}
            />
            {imageUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearImage}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Preview da imagem */}
        {imageUrl && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-md border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  setError('Erro ao carregar imagem. Verifique se a URL está correta.')
                }}
              />
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearImage}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mensagens de status */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              <AlertDescription>{success}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Informações sobre upload */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Formatos aceitos: JPG, PNG, GIF, WebP</p>
          <p>• Tamanho máximo: 10MB</p>
          <p>• As imagens são armazenadas no Google Drive</p>
        </div>
      </CardContent>
    </Card>
  )
}
