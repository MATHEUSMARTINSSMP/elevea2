// /src/pages/obrigado/steps/ContentStep.tsx
import { useState } from 'react';

type Props = {
  historia: string; setHistoria: (v: string) => void;
  produtos: string; setProdutos: (v: string) => void;
  fundacao: string; setFundacao: (v: string) => void;
  // Novos campos para personalização
  tipoNegocio: string; setTipoNegocio: (v: string) => void;
  publicoAlvo: string; setPublicoAlvo: (v: string) => void;
  diferencial: string; setDiferencial: (v: string) => void;
  valores: string; setValores: (v: string) => void;
  missao: string; setMissao: (v: string) => void;
  visao: string; setVisao: (v: string) => void;
  especialidades: string; setEspecialidades: (v: string) => void;
  horarios: string; setHorarios: (v: string) => void;
  formasPagamento: string; setFormasPagamento: (v: string) => void;
  promocoes: string; setPromocoes: (v: string) => void;
  certificacoes: string; setCertificacoes: (v: string) => void;
  premios: string; setPremios: (v: string) => void;
  depoimentos: string; setDepoimentos: (v: string) => void;
  redesSociais: string; setRedesSociais: (v: string) => void;
  secoesPersonalizadas: string; setSecoesPersonalizadas: (v: string) => void;
};

export default function ContentStep({
  historia, setHistoria,
  produtos, setProdutos,
  fundacao, setFundacao,
  tipoNegocio, setTipoNegocio,
  publicoAlvo, setPublicoAlvo,
  diferencial, setDiferencial,
  valores, setValores,
  missao, setMissao,
  visao, setVisao,
  especialidades, setEspecialidades,
  horarios, setHorarios,
  formasPagamento, setFormasPagamento,
  promocoes, setPromocoes,
  certificacoes, setCertificacoes,
  premios, setPremios,
  depoimentos, setDepoimentos,
  redesSociais, setRedesSociais,
  secoesPersonalizadas, setSecoesPersonalizadas,
}: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full ${
                i + 1 <= currentStep ? 'bg-blue-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-white/60">
          {currentStep} de {totalSteps}
        </span>
      </div>

      {/* Step 1: Informações Básicas */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            📝 Informações Básicas do Negócio
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">
                Tipo de Negócio *
              </label>
              <select
                className="w-full border rounded-xl px-4 py-3 border-white/10 bg-white/[0.03] text-white"
                value={tipoNegocio}
                onChange={(e) => setTipoNegocio(e.target.value)}
              >
                <option value="">Selecione o tipo</option>
                <option value="servicos">Serviços</option>
                <option value="produtos">Produtos Físicos</option>
                <option value="hibrido">Híbrido (Serviços + Produtos)</option>
                <option value="ecommerce">E-commerce</option>
                <option value="consultoria">Consultoria</option>
                <option value="educacao">Educação</option>
                <option value="saude">Saúde</option>
                <option value="beleza">Beleza e Estética</option>
                <option value="automotivo">Automotivo</option>
                <option value="construcao">Construção</option>
                <option value="tecnologia">Tecnologia</option>
                <option value="alimentacao">Alimentação</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">
                Ano de Fundação
              </label>
              <input
                className="w-full border rounded-xl px-4 py-3 border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Ex: 2020"
                value={fundacao}
                onChange={(e) => setFundacao(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Público-Alvo *
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Descreva seu público-alvo (idade, perfil, necessidades)"
              value={publicoAlvo}
              onChange={(e) => setPublicoAlvo(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Principal Diferencial *
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="O que torna seu negócio único? Qual seu diferencial competitivo?"
              value={diferencial}
              onChange={(e) => setDiferencial(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 2: História e Valores */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            🏢 História e Valores da Empresa
          </h3>
          
          <div>
            <label className="block text-sm text-white/80 mb-2">
              História da Empresa *
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[120px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Conte a história da empresa (como começou, evolução, marcos importantes)"
              value={historia}
              onChange={(e) => setHistoria(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">
                Missão
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Qual a missão da empresa?"
                value={missao}
                onChange={(e) => setMissao(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">
                Visão
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Qual a visão da empresa?"
                value={visao}
                onChange={(e) => setVisao(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Valores e Princípios
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Quais são os valores e princípios da empresa?"
              value={valores}
              onChange={(e) => setValores(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 3: Produtos e Serviços */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            🛍️ Produtos e Serviços
          </h3>
          
          <div>
            <label className="block text-sm text-white/80 mb-2">
              Produtos/Serviços Principais *
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[120px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Liste os principais produtos ou serviços (separe por vírgula ou linhas)"
              value={produtos}
              onChange={(e) => setProdutos(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Especialidades
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Quais são suas especialidades ou áreas de expertise?"
              value={especialidades}
              onChange={(e) => setEspecialidades(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">
                Horários de Funcionamento
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[80px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Ex: Seg-Sex: 8h-18h, Sáb: 8h-12h"
                value={horarios}
                onChange={(e) => setHorarios(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">
                Formas de Pagamento
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[80px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Ex: Dinheiro, Cartão, PIX, Boleto"
                value={formasPagamento}
                onChange={(e) => setFormasPagamento(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Promoções e Ofertas Especiais
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Tem promoções especiais? Ofertas sazonais? Descontos?"
              value={promocoes}
              onChange={(e) => setPromocoes(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 4: Diferenciais e Personalização */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            🎯 Diferenciais e Personalização
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">
                Certificações e Qualificações
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Tem certificações, prêmios, qualificações especiais?"
                value={certificacoes}
                onChange={(e) => setCertificacoes(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">
                Prêmios e Reconhecimentos
              </label>
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
                placeholder="Já recebeu prêmios, reconhecimentos, menções?"
                value={premios}
                onChange={(e) => setPremios(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Depoimentos e Cases de Sucesso
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Tem depoimentos de clientes ou cases de sucesso para destacar?"
              value={depoimentos}
              onChange={(e) => setDepoimentos(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Redes Sociais e Contatos
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[80px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Instagram, Facebook, LinkedIn, YouTube, etc."
              value={redesSociais}
              onChange={(e) => setRedesSociais(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">
              Seções Personalizadas Desejadas
            </label>
            <textarea
              className="w-full border rounded-xl px-4 py-3 min-h-[100px] border-white/10 bg-white/[0.03] text-white placeholder:text-white/40"
              placeholder="Que seções específicas você gostaria no seu site? (ex: Galeria de trabalhos, Blog, FAQ, etc.)"
              value={secoesPersonalizadas}
              onChange={(e) => setSecoesPersonalizadas(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-6 py-2 border border-white/20 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
        >
          Anterior
        </button>
        
        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Próximo
          </button>
        ) : (
          <div className="text-sm text-white/60">
            ✅ Informações coletadas! Continue para o próximo passo.
          </div>
        )}
      </div>
    </div>
  );
}
