import { Button } from '@/components/ui/button';
import { WHATSAPP_URL } from '@/lib/whatsapp';
import { OptimizedHeroImage } from '@/components/ui/optimized-image';
import heroMockup from '@/assets/hero-mockup.jpg';

const Hero = () => {
  return (
    <section className="hero-mobile bg-gradient-section" id="topo">
      <div className="container">
        <div className="grid-responsive-2 items-center">
          <div className="space-mobile animate-fade-in">
            <div className="space-mobile">
              <h1 className="hero-title font-bold leading-tight">
                Transforme seu{' '}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Negócio Local
                </span>{' '}
                em Sucesso Digital
              </h1>

              <p className="hero-subtitle text-muted-foreground max-w-lg">
                A Agência Elevea democratiza a presença digital para pequenos negócios. 
                Sites profissionais, Google Meu Negócio e atendimento automatizado - tudo em um só lugar.
              </p>
            </div>

            {/* CTAs */}
            <div className="btn-group-mobile">
              {/* WhatsApp */}
              <Button asChild size="lg" className="btn-gold shadow-elegant btn-mobile">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Fale conosco no WhatsApp
                </a>
              </Button>

              {/* Scroll para planos */}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary/10 btn-mobile"
              >
                <a href="#planos">Ver Planos</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="stats-mobile pt-8 border-t border-border">
              <div className="stat-mobile">
                <div className="stat-value-mobile text-primary">+50</div>
                <div className="stat-label-mobile">Sites Criados</div>
              </div>
              <div className="stat-mobile">
                <div className="stat-value-mobile text-primary">100%</div>
                <div className="stat-label-mobile">Responsivos</div>
              </div>
              <div className="stat-mobile">
                <div className="stat-value-mobile text-primary">7 dias</div>
                <div className="stat-label-mobile">Para publicar</div>
              </div>
            </div>
          </div>

          {/* Mockup */}
          <div className="relative animate-float">
            <div className="relative">
              <OptimizedHeroImage
                src={heroMockup}
                alt="Mockup de site em notebook e celular"
                className="img-responsive rounded-xl shadow-card"
                width={600}
                height={400}
              />
              <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
