import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wand2, Copy, CheckCircle } from 'lucide-react';
import { generateSiteContent, generateSEOSuggestions, generateMarketingEmail, ContentSuggestion } from '@/lib/openai';
import { useToast } from '@/hooks/use-toast';

// Interfaces para type safety
interface SEOSuggestions {
  title: string;
  description: string;
  keywords: string[];
  suggestions: string[];
}

interface EmailResult {
  subject: string;
  content: string;
  callToAction: string;
}

interface AICopywriterProps {
  businessName?: string;
  businessType?: string;
  businessDescription?: string;
}

export function AICopywriter({ businessName = '', businessType = '', businessDescription = '' }: AICopywriterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentSuggestion[]>([]);
  const [seoSuggestions, setSeoSuggestions] = useState<any>(null);
  const [emailContent, setEmailContent] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    businessName: businessName,
    businessType: businessType,
    businessDescription: businessDescription,
    location: '',
    currentContent: '',
    emailType: 'welcome' as 'welcome' | 'followup' | 'promotion' | 'newsletter',
    clientName: '',
    service: ''
  });

  const handleGenerateContent = async () => {
    // Validação com foco no primeiro campo inválido
    if (!formData.businessName.trim()) {
      const field = document.getElementById('businessName') as HTMLInputElement;
      field?.focus();
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do negócio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.businessType.trim()) {
      const field = document.getElementById('businessType') as HTMLInputElement;
      field?.focus();
      toast({
        title: "Campo obrigatório", 
        description: "Preencha o tipo do negócio",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingContent(true);
    try {
      // Limitar tamanho da entrada para controle de custo
      const limitedDescription = formData.businessDescription.slice(0, 500);
      
      const content = await generateSiteContent(
        formData.businessType.trim(),
        formData.businessName.trim(),
        limitedDescription
      );
      setGeneratedContent(content);
      
      toast({
        title: "Conteúdo gerado!",
        description: "IA criou sugestões personalizadas para seu site",
      });
    } catch (error) {
      console.error('Erro na geração:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar conteúdo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateSEO = async () => {
    // Validação com foco nos campos
    if (!formData.businessName.trim()) {
      const field = document.getElementById('seoBusinessName') as HTMLInputElement;
      field?.focus();
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do negócio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.currentContent.trim()) {
      const field = document.getElementById('currentContent') as HTMLTextAreaElement;
      field?.focus();
      toast({
        title: "Campo obrigatório",
        description: "Preencha o conteúdo atual para otimização",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingSEO(true);
    try {
      // Limitar conteúdo atual para controle de custo
      const limitedContent = formData.currentContent.slice(0, 1000);
      
      const seo = await generateSEOSuggestions(
        formData.businessType.trim() || 'negócio',
        formData.businessName.trim(),
        limitedContent,
        formData.location.trim()
      );
      
      // Validar shape do retorno
      if (seo && typeof seo === 'object' && 'title' in seo) {
        setSeoSuggestions(seo as SEOSuggestions);
        toast({
          title: "SEO otimizado!",
          description: "Sugestões de SEO prontas para implementar",
        });
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro na geração SEO:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar SEO. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!formData.businessName.trim()) {
      const field = document.getElementById('emailBusinessName') as HTMLInputElement;
      field?.focus();
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome do negócio",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingEmail(true);
    try {
      const email = await generateMarketingEmail(formData.emailType, {
        name: formData.businessName.trim(),
        type: formData.businessType.trim() || 'negócio',
        clientName: formData.clientName.trim(),
        service: formData.service.trim()
      });
      
      // Validar shape e sanitizar HTML
      if (email && typeof email === 'object' && 'content' in email) {
        const sanitizedEmail: EmailResult = {
          subject: email.subject || 'Assunto',
          content: DOMPurify.sanitize(email.content || 'Conteúdo indisponível', {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u'],
            ALLOWED_ATTR: []
          }),
          callToAction: email.callToAction || 'Clique aqui'
        };
        
        setEmailContent(sanitizedEmail);
        toast({
          title: "Email criado!",
          description: "Template de email personalizado pronto",
        });
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error) {
      console.error('Erro na geração de email:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar email. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const copyToClipboard = async (text: string, index?: number) => {
    try {
      // Tentar navigator.clipboard primeiro (moderno)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para navegadores antigos/HTTP
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        if (!document.execCommand('copy')) {
          throw new Error('execCommand copy falhou');
        }
        
        document.body.removeChild(textarea);
      }
      
      // Corrigir bug do índice
      setCopiedIndex(index ?? null);
      
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência",
      });

      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Falha ao copiar texto",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Wand2 className="h-12 w-12 mx-auto text-primary mb-4" />
        <h2 className="text-3xl font-bold">AI Copywriter</h2>
        <p className="text-muted-foreground mt-2">
          Gere textos persuasivos e otimizados para SEO usando inteligência artificial
        </p>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Conteúdo do Site</TabsTrigger>
          <TabsTrigger value="seo">Otimização SEO</TabsTrigger>
          <TabsTrigger value="email">Email Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Conteúdo do Site</CardTitle>
              <CardDescription>
                Crie textos persuasivos para todas as seções do seu site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Nome do Negócio *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Ex: Bella Estética"
                  />
                </div>
                <div>
                  <Label htmlFor="businessType">Tipo de Negócio *</Label>
                  <Input
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                    placeholder="Ex: Clínica de estética"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="businessDescription">Descrição do Negócio</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) => setFormData({...formData, businessDescription: e.target.value})}
                  placeholder="Descreva brevemente o que sua empresa faz, seus diferenciais..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleGenerateContent} 
                disabled={isGeneratingContent}
                className="w-full"
              >
                {isGeneratingContent ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando conteúdo...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" /> Gerar Conteúdo</>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedContent.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Conteúdo Gerado</h3>
              {generatedContent.map((content, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{content.title}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(
                          `${content.title}\n\n${content.subtitle}\n\n${content.description}\n\nCTA: ${content.callToAction}`
                        )}
                      >
                        {copiedIndex === index ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <CardDescription>{content.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm">{content.description}</p>
                      
                      <div>
                        <Badge variant="secondary">{content.callToAction}</Badge>
                      </div>
                      
                      {content.keywords && content.keywords.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Palavras-chave:</p>
                          <div className="flex flex-wrap gap-1">
                            {content.keywords.map((keyword, kIndex) => (
                              <Badge key={kIndex} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Otimização SEO</CardTitle>
              <CardDescription>
                Otimize seu conteúdo para melhor ranqueamento no Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seoBusinessName">Nome do Negócio *</Label>
                  <Input
                    id="seoBusinessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Ex: Bella Estética"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Ex: São Paulo, SP"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="currentContent">Conteúdo Atual *</Label>
                <Textarea
                  id="currentContent"
                  value={formData.currentContent}
                  onChange={(e) => setFormData({...formData, currentContent: e.target.value})}
                  placeholder="Cole aqui o texto atual do seu site para otimização..."
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleGenerateSEO} 
                disabled={isGeneratingSEO}
                className="w-full"
              >
                {isGeneratingSEO ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Otimizando SEO...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" /> Otimizar SEO</>
                )}
              </Button>
            </CardContent>
          </Card>

          {seoSuggestions && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sugestões de SEO</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `Título SEO: ${seoSuggestions.title}\n\nDescrição: ${seoSuggestions.description}\n\nPalavras-chave: ${seoSuggestions.keywords.join(', ')}\n\nSugestões:\n${seoSuggestions.suggestions.join('\n')}`
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título SEO (50-60 caracteres)</Label>
                  <p className="p-2 bg-muted rounded text-sm">{seoSuggestions.title}</p>
                </div>
                
                <div>
                  <Label>Meta Description (150-160 caracteres)</Label>
                  <p className="p-2 bg-muted rounded text-sm">{seoSuggestions.description}</p>
                </div>
                
                <div>
                  <Label>Palavras-chave</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {seoSuggestions.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Sugestões de Melhoria</Label>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    {seoSuggestions.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Marketing</CardTitle>
              <CardDescription>
                Crie templates de email profissionais e persuasivos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emailBusinessName">Nome do Negócio *</Label>
                  <Input
                    id="emailBusinessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Ex: Bella Estética"
                  />
                </div>
                <div>
                  <Label htmlFor="emailType">Tipo de Email</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={formData.emailType}
                    onChange={(e) => setFormData({...formData, emailType: e.target.value as any})}
                  >
                    <option value="welcome">Boas-vindas</option>
                    <option value="followup">Follow-up</option>
                    <option value="promotion">Promocional</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Nome do Cliente (opcional)</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    placeholder="Para personalizar o email"
                  />
                </div>
                <div>
                  <Label htmlFor="service">Serviço (opcional)</Label>
                  <Input
                    id="service"
                    value={formData.service}
                    onChange={(e) => setFormData({...formData, service: e.target.value})}
                    placeholder="Serviço relacionado ao email"
                  />
                </div>
              </div>

              <Button 
                onClick={handleGenerateEmail} 
                disabled={isGeneratingEmail}
                className="w-full"
              >
                {isGeneratingEmail ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando email...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" /> Criar Email</>
                )}
              </Button>
            </CardContent>
          </Card>

          {emailContent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Email Gerado</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `Assunto: ${emailContent.subject}\n\n${emailContent.content}\n\nCTA: ${emailContent.callToAction}`
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Assunto do Email</Label>
                  <p className="p-2 bg-muted rounded text-sm font-medium">{emailContent.subject}</p>
                </div>
                
                <div>
                  <Label>Conteúdo</Label>
                  <div 
                    className="p-4 bg-muted rounded text-sm"
                    dangerouslySetInnerHTML={{ __html: emailContent.content }}
                  />
                </div>
                
                <div>
                  <Label>Call-to-Action</Label>
                  <Badge className="mt-2">{emailContent.callToAction}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}