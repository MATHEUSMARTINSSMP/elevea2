// /src/pages/obrigado/steps/ReviewStep.tsx
import React from "react";

type Endereco = {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

type ReviewData = {
  plano: "vip" | "essential";
  siteSlugInput: string;
  email: string;
  phone: string;
  documentCPF: string;
  driveFolderUrl?: string;
  historia?: string;
  produtos?: string;   // lista simples (texto)
  fundacao?: string;
  paleta: string;
  template: string;
  endereco?: Endereco;
  // Novos campos para personalização
  tipoNegocio?: string;
  publicoAlvo?: string;
  diferencial?: string;
  valores?: string;
  missao?: string;
  visao?: string;
  especialidades?: string;
  horarios?: string;
  formasPagamento?: string;
  promocoes?: string;
  certificacoes?: string;
  premios?: string;
  depoimentos?: string;
  redesSociais?: string;
  secoesPersonalizadas?: string;
};

export function ReviewStep({ data }: { data: ReviewData }) {
  const {
    plano,
    siteSlugInput,
    email,
    phone,
    documentCPF,
    driveFolderUrl,
    historia,
    produtos,
    fundacao,
    paleta,
    template,
    endereco,
    // Novos campos
    tipoNegocio,
    publicoAlvo,
    diferencial,
    valores,
    missao,
    visao,
    especialidades,
    horarios,
    formasPagamento,
    promocoes,
    certificacoes,
    premios,
    depoimentos,
    redesSociais,
    secoesPersonalizadas,
  } = data;

  const addr =
    endereco &&
    [endereco.logradouro, endereco.bairro, endereco.cidade && `${endereco.cidade} - ${endereco.uf}`]
      .filter(Boolean)
      .join(" · ");

  const Row = ({
    label,
    value,
  }: {
    label: string;
    value?: React.ReactNode;
  }) => (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-white/10 last:border-0">
      <div className="text-white/60 text-sm">{label}</div>
      <div className="col-span-2 text-white text-sm break-words">{value || <span className="text-white/40">—</span>}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-white font-medium mb-4">📋 Informações Básicas</h3>
        <Row label="Plano" value={plano} />
        <Row label="Slug" value={siteSlugInput} />
        <Row label="E-mail" value={email} />
        <Row label="WhatsApp" value={phone} />
        <Row label="CPF/CNPJ" value={documentCPF} />
        <Row
          label="Pasta do Drive"
          value={
            driveFolderUrl ? (
              <a className="underline text-emerald-400 hover:text-emerald-300" href={driveFolderUrl} target="_blank" rel="noreferrer">
                Abrir pasta
              </a>
            ) : (
              undefined
            )
          }
        />
        <Row label="Tipo de Negócio" value={tipoNegocio} />
        <Row label="Público-Alvo" value={publicoAlvo} />
        <Row label="Diferencial" value={diferencial} />
        <Row label="Fundação" value={fundacao} />
        <Row label="Endereço" value={addr} />
      </div>

      {/* História e Valores */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-white font-medium mb-4">🏢 História e Valores</h3>
        <Row label="História" value={historia} />
        <Row label="Missão" value={missao} />
        <Row label="Visão" value={visao} />
        <Row label="Valores" value={valores} />
      </div>

      {/* Produtos e Serviços */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-white font-medium mb-4">🛍️ Produtos e Serviços</h3>
        <Row label="Produtos/Serviços" value={produtos} />
        <Row label="Especialidades" value={especialidades} />
        <Row label="Horários" value={horarios} />
        <Row label="Formas de Pagamento" value={formasPagamento} />
        <Row label="Promoções" value={promocoes} />
      </div>

      {/* Diferenciais */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-white font-medium mb-4">🎯 Diferenciais</h3>
        <Row label="Certificações" value={certificacoes} />
        <Row label="Prêmios" value={premios} />
        <Row label="Depoimentos" value={depoimentos} />
        <Row label="Redes Sociais" value={redesSociais} />
        <Row label="Seções Personalizadas" value={secoesPersonalizadas} />
      </div>

      {/* Visual */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-white font-medium mb-4">🎨 Visual</h3>
        <Row label="Paleta" value={paleta} />
        <Row label="Template" value={template} />
      </div>
    </div>
  );
}

// ✅ exports para evitar erros de build
export default ReviewStep;
