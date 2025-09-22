import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProfessionCarousel from '@/components/ProfessionCarousel';
import About from '@/components/About';
import WhyDigital from '@/components/WhyDigital';
import Chatbot from '@/components/Chatbot';
import Pricing from '@/components/Pricing';
import Features from '@/components/Features';
import Testimonials from '@/components/Testimonials';
import HowItWorks from '@/components/HowItWorks';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { ExternalLink } from 'lucide-react';

/* ===== SEO CONSTANTES ===== */
const SITE_URL = 'https://agenciaelevea.netlify.app/';
const OG_IMAGE =
  'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fagenciaelevea.netlify.app%2F?w=1200';

/* Helpers metas/links */
function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
function upsertMetaByProp(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
}

/* ===== PORTFÓLIO ===== */
type Item = {
  id: string;
  title: string;
  image: string;
  description: string;
  url: string;
};

const items: Item[] = [
  {
    id: 'feminina',
    title: 'Moda Feminina',
    image:
      'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fsacadaohboyamapa.netlify.app?w=1200',
    description:
      'Landing de vitrine para Sacada | Oh, Boy! com foco em coleções e campanhas sazonais. Destaques visuais, CTAs claros e navegação direta para descoberta de produtos.',
    url: 'https://sacadaohboyamapa.netlify.app',
  },
  {
  id: 'intima',
  title: 'Moda Íntima Feminina',
  image: '/lojaloungerie.png', // ← usa o arquivo em /public
  description:
    'Showcase para Loungerie com abordagem elegante: apresentação de linhas, chamadas para WhatsApp e mapa integrado para visita à loja.',
  url: 'https://loungerieamapagarden.netlify.app',
},

  {
    id: 'masculina',
    title: 'Moda Masculina',
    image:
      'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fmrkitschamapagarden.netlify.app?w=1200',
    description:
      'Site da Mr. Kitsch com hero dinâmico, seções de produtos, contato rápido e localização — pensado para conversão no varejo físico.',
    url: 'https://mrkitschamapagarden.netlify.app',
  },
  {
    id: 'eleve',
    title: 'Agência Elevea',
    image:
      'https://s.wordpress.com/mshots/v1/https://eleveaagencia.com.br?w=1200',
    description:
      'Site institucional da agência com apresentação de serviços, diferenciais e canais de contato — base para captação de leads.',
    url: 'https://agenciaelevea.netlify.app/',
  },
];

const Index = () => {
  /* ===== SEO “invisível” ===== */
  useEffect(() => {
    const title = 'Agência Elevea — Sites rápidos, SEO local e captação via WhatsApp';
    const description =
      'Criamos sites profissionais para pequenos negócios, integrados ao Google Meu Negócio, SEO local e atendimento automatizado no WhatsApp. Design moderno, performance e foco em conversão.';

    document.title = title;
    upsertMetaByName('description', description);
    upsertMetaByName(
      'keywords',
      [
        'site para pequenos negócios',
        'site profissional',
        'Google Meu Negócio',
        'SEO local',
        'chatbot WhatsApp',
        'landing page',
        'hospedagem com SSL',
        'agência digital em Macapá',
        'Amapá',
        'Elevea',
      ].join(', ')
    );
    upsertMetaByName('robots', 'index,follow,max-image-preview:large');
    upsertMetaByName('content-language', 'pt-BR');
    upsertLink('canonical', SITE_URL);
    upsertLink('alternate', SITE_URL, { hreflang: 'pt-BR' });
    upsertMetaByName('theme-color', '#1f2937');

    // OG / Twitter
    upsertMetaByProp('og:site_name', 'Agência Elevea');
    upsertMetaByProp('og:type', 'website');
    upsertMetaByProp('og:url', SITE_URL);
    upsertMetaByProp('og:title', title);
    upsertMetaByProp('og:description', description);
    upsertMetaByProp('og:image', OG_IMAGE);

    upsertMetaByName('twitter:card', 'summary_large_image');
    upsertMetaByName('twitter:title', title);
    upsertMetaByName('twitter:description', description);
    upsertMetaByName('twitter:image', OG_IMAGE);

    // JSON-LD (ProfessionalService)
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: 'Agência Elevea',
      url: SITE_URL,
      image: OG_IMAGE,
      description,
      areaServed: 'Macapá, AP',
      serviceType: [
        'Criação de Sites',
        'SEO Local',
        'Google Meu Negócio',
        'Landing Pages',
        'Chatbot / WhatsApp',
      ],
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="min-h-screen">
      {/* H1 acessível para SEO (sem impacto visual) */}
      <h1 className="sr-only">
        Agência Elevea — criação de sites, SEO local, Google Meu Negócio e WhatsApp para pequenos
        negócios em Macapá.
      </h1>

      {/* ===== GHOST FORM (Netlify Forms) =====
          Observação: o ideal é também ter esse mesmo <form> no /public/index.html
          para o Netlify detectar no build estático. Aqui deixamos oculto no React
          como redundância. */}
      <div className="hidden" aria-hidden="true">
        <form name="pos-onboarding" method="POST" data-netlify="true" netlify-honeypot="bot-field">
          <input type="hidden" name="form-name" value="pos-onboarding" />
          <input type="text" name="bot-field" />
          {/* Campos principais (espelho do /obrigado) */}
          <input type="text" name="fullName" />
          <input type="text" name="document" />
          <input type="email" name="email" />
          <input type="text" name="phone" />
          <input type="text" name="company" />
          <input type="text" name="siteSlug" />
          {/* Metadados opcionais */}
          <input type="text" name="plan" />
          <input type="text" name="brand" />
          <input type="text" name="order" />
          <input type="text" name="mp_preapprovalId" />
          <input type="text" name="mp_paymentId" />
        </form>
      </div>

      <Header />
      <main>
        <Hero />

        {/* Portfolio - logo abaixo da Hero */}
        <section id="portfolio" className="py-20 bg-section-gradient">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-primary">
                Confira nossos trabalhos
              </h2>
              <p className="text-lg text-muted-foreground mt-4">
                Projetos por segmento — pensados para destacar a marca e gerar ação.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {items.map((w) => (
                <article
                  key={w.id}
                  className="bg-card rounded-2xl overflow-hidden shadow-[var(--elegant-shadow)] hover:shadow-lg transition"
                >
                  <div className="aspect-[4/3]">
                    <img
                      src={w.image}
                      alt={w.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-primary">{w.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{w.description}</p>

                    <div className="mt-5">
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold shadow-md
                                   bg-gradient-to-br from-[hsl(35_65%_38%)] to-[hsl(30_60%_28%)]
                                   hover:from-[hsl(35_70%_34%)] hover:to-[hsl(30_65%_24%)]
                                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(35_65%_38%)]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver o site
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ProfessionCarousel />
        <About />
        <WhyDigital />
        <Chatbot />
        <Pricing />
        <Features />
        <Testimonials />
        <HowItWorks />
        <FAQ />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
