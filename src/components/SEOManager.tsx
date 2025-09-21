import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  businessName?: string;
  businessType?: string;
  location?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  priceRange?: string;
  image?: string;
  url?: string;
}

interface SEOManagerProps {
  data: SEOData;
  businessStructuredData?: any;
}

export function SEOManager({ data, businessStructuredData }: SEOManagerProps) {
  const {
    title,
    description,
    keywords = [],
    businessName,
    businessType,
    location,
    phone,
    website,
    openingHours,
    priceRange,
    image,
    url
  } = data;

  // Meta tags otimizados
  const metaTitle = title || `${businessName} - ${businessType} em ${location}`;
  const metaDescription = description || `${businessName}: ${businessType} profissional em ${location}. Contato: ${phone}. Qualidade e atendimento diferenciado.`;
  const metaKeywords = keywords.length > 0 ? keywords.join(', ') : `${businessType}, ${location}, ${businessName}`;
  const metaImage = image || 'https://agenciaelevea.netlify.app/logo-elevea.png';
  const metaUrl = url || website || 'https://agenciaelevea.netlify.app';

  // Schema markup para negócio local
  const businessSchema = {
    "@context": "https://schema.org",
    "@type": businessStructuredData?.type || "LocalBusiness",
    "name": businessName,
    "description": metaDescription,
    ...(businessType && { "category": businessType }),
    ...(location && { 
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location,
        "addressCountry": "BR"
      }
    }),
    ...(phone && { "telephone": phone }),
    ...(website && { "url": website }),
    ...(openingHours && { "openingHours": openingHours }),
    ...(priceRange && { "priceRange": priceRange }),
    ...(metaImage && { "image": metaImage }),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "50"
    },
    "sameAs": businessStructuredData?.socialMedia || []
  };

  // Schema para website
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": businessName,
    "url": metaUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${metaUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  // Schema para organização
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": businessName,
    "url": metaUrl,
    "logo": metaImage,
    ...(location && {
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location,
        "addressCountry": "BR"
      }
    }),
    ...(phone && { "contactPoint": {
      "@type": "ContactPoint",
      "telephone": phone,
      "contactType": "customer service"
    }})
  };

  return (
    <Helmet>
      {/* Meta tags básicos */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <meta name="author" content={businessName} />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content={businessName} />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={metaUrl} />

      {/* Schema markup JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(businessSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
    </Helmet>
  );
}

// Hook para gerar dados SEO automaticamente
export function useAutoSEO(siteData: any) {
  const {
    businessName,
    businessType,
    location,
    phone,
    website,
    description,
    openingHours,
    priceRange
  } = siteData || {};

  // Geração automática de keywords baseada nos dados do negócio
  const autoKeywords = [
    businessType,
    businessName,
    location,
    `${businessType} em ${location}`,
    `${businessType} ${location}`,
    businessType?.split(' ').join(', '),
    'profissional',
    'qualidade',
    'atendimento'
  ].filter(Boolean);

  // Título otimizado automaticamente
  const autoTitle = `${businessName} - ${businessType} em ${location} | Qualidade e Profissionalismo`;

  // Descrição otimizada automaticamente
  const autoDescription = description || 
    `${businessName} oferece serviços de ${businessType} em ${location}. ` +
    `Atendimento profissional e qualidade garantida. ` +
    `${phone ? `Entre em contato: ${phone}` : 'Solicite um orçamento!'}`;

  return {
    title: autoTitle,
    description: autoDescription,
    keywords: autoKeywords,
    businessName,
    businessType,
    location,
    phone,
    website,
    openingHours,
    priceRange
  };
}