import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WHATSAPP_URL } from '@/lib/whatsapp';

const About = () => {
  const stats = [
    { label: 'Pequenos negócios sem site', value: '60%', icon: TrendingUp },
    { label: 'Sites criados', value: '+50', icon: Users },
    { label: 'Tempo de entrega', value: '7 dias', icon: Clock },
    { label: 'Garantia', value: '30 dias', icon: Shield },
  ];

  return (
    <section id="sobre" className="section-mobile bg-gradient-section">
      <div className="container">
        <div className="grid-responsive-2 items-center">
          <div className="space-mobile animate-fade-in">
            <div>
              <h2 className="text-responsive-xl font-bold mb-4">
                Democratizando a <span className="bg-gradient-primary bg-clip-text text-transparent">presença digital</span>
              </h2>
              <p className="text-responsive text-muted-foreground mb-6">
                Nossa missão é democratizar a presença digital para negócios locais, oferecendo soluções completas e acessíveis.
              </p>
            </div>

            <div className="space-mobile">
              <p className="text-responsive text-muted-foreground">
                Mais de 60% dos pequenos negócios ainda não têm site ou presença no Google. Nós mudamos isso.
              </p>
              
              <p className="text-responsive text-muted-foreground">
                Entendemos as necessidades específicas de pequenos e médios empresários. Por isso, criamos soluções que são ao mesmo tempo profissionais, acessíveis e fáceis de gerenciar.
              </p>
            </div>

            <div className="bg-muted/50 card-mobile rounded-lg border-l-4 border-primary space-mobile">
              <div>
                <h4 className="font-semibold mb-2">"Vou fazer pelo Wix mesmo"</h4>
                <p className="text-responsive text-muted-foreground">
                  Ferramentas como Wix e Loja Integrada vendem facilidade, mas na prática exigem conhecimento técnico, 
                  geram perda de tempo e resultado amador. Você acaba gastando horas configurando, lutando com bugs e 
                  tendo um site lento e mal posicionado no Google. O "barato" sai caro.
                </p>
              </div>

              <Button asChild size="lg" className="btn-gold shadow-elegant btn-mobile">
                <a 
                  href={WHATSAPP_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Quero meu site profissional
                </a>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 animate-slide-up">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center hover:shadow-card transition-all duration-300 card-gradient">
                <CardContent className="card-mobile">
                  <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                    <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
