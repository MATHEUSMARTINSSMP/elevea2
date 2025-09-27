// src/pages/politicas/index.tsx
import React from "react";

export default function PoliticasPage() {
  const year = new Date().getFullYear();
  const updated = new Date().toLocaleDateString("pt-BR");

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} style={{ margin: "2rem 0" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>{title}</h2>
      <div style={{ lineHeight: 1.6 }}>{children}</div>
    </section>
  );

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "2rem", fontFamily: "Inter, system-ui, Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Políticas da Elevea Agência</h1>
      <div style={{ color: "#667085", fontSize: 14, marginBottom: 24 }}>Última atualização: {updated}</div>

      <nav aria-label="Âncoras" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <a href="#privacidade">Política de Privacidade</a>
        <a href="#termos">Termos de Serviço</a>
        <a href="#exclusao">Exclusão de Dados</a>
        <a href="#contato">Contato</a>
      </nav>

      <hr />

      <Section id="privacidade" title="Política de Privacidade">
        <p>
          Coletamos dados mínimos necessários para operar nossos serviços (ex.: nome, e-mail, telefone e registros de uso).
          Usamos essas informações para autenticação, suporte, comunicações transacionais e melhorias da plataforma.
        </p>
        <p>
          Não vendemos seus dados. Compartilhamos somente com provedores essenciais (ex.: hospedagem, e-mail) sob contrato
          e com base legal aplicável. Você pode solicitar acesso, correção ou exclusão dos dados pessoalmente identificáveis.
        </p>
      </Section>

      <Section id="termos" title="Termos de Serviço">
        <p>
          Ao usar a plataforma, você concorda em não realizar atividades ilícitas, abusivas ou que violem direitos de terceiros.
          Podemos suspender contas em caso de violação. Os serviços são fornecidos “no estado em que se encontram” e podem
          sofrer alterações. Alterações nestes termos serão publicadas nesta página.
        </p>
      </Section>

      <Section id="exclusao" title="Exclusão de Dados do Usuário">
        <p>
          Para solicitar exclusão dos seus dados, envie um e-mail para{" "}
          <a href="mailto:suporte@eleveaagencia.com.br">suporte@eleveaagencia.com.br</a> com o assunto
          “Exclusão de dados”. Processaremos a solicitação em até 30 dias, observando a legislação aplicável (ex.: LGPD).
        </p>
        <p>
          Após a exclusão, poderemos manter dados estritamente necessários para cumprimento de obrigações legais
          e prevenção de fraude, conforme permitido por lei.
        </p>
      </Section>

      <Section id="contato" title="Contato">
        <p>
          Dúvidas sobre estas políticas? Fale com a gente em{" "}
          <a href="mailto:suporte@eleveaagencia.com.br">suporte@eleveaagencia.com.br</a>.
        </p>
      </Section>

      <hr />
      <footer style={{ color: "#667085", fontSize: 14, marginTop: 16 }}>
        Elevea Agência • {year}
      </footer>
    </main>
  );
}
