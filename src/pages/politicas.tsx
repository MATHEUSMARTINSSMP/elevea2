// /pages/politicas.tsx
import React from "react";

export default function PoliticasPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Políticas da Elevea Agência</h1>
      <p>Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

      <hr style={{ margin: "2rem 0" }} />

      {/* Política de Privacidade */}
      <section>
        <h2>Política de Privacidade</h2>
        <p>
          Nós respeitamos a sua privacidade. Coletamos apenas informações necessárias
          para fornecer nossos serviços, como nome, e-mail e informações de contato.
          Os dados não são vendidos ou compartilhados com terceiros sem o seu
          consentimento, exceto quando exigido por lei.
        </p>
        <p>
          As informações coletadas são utilizadas para: autenticação no painel, envio
          de comunicações importantes, suporte técnico e melhoria contínua da
          plataforma.
        </p>
      </section>

      <hr style={{ margin: "2rem 0" }} />

      {/* Termos de Serviço */}
      <section>
        <h2>Termos de Serviço</h2>
        <p>
          Ao utilizar a plataforma Elevea Agência, você concorda em não usar nossos
          serviços para fins ilegais, abusivos ou que prejudiquem terceiros.
        </p>
        <p>
          Reservamo-nos o direito de suspender ou encerrar contas que violem estes
          termos. Alterações nesta política podem ocorrer a qualquer momento e serão
          publicadas nesta página.
        </p>
      </section>

      <hr style={{ margin: "2rem 0" }} />

      {/* Exclusão de Dados */}
      <section>
        <h2>Exclusão de Dados do Usuário</h2>
        <p>
          Caso deseje excluir suas informações pessoais de nossos sistemas, você pode
          enviar uma solicitação para:{" "}
          <a href="mailto:suporte@eleveaagencia.com.br">suporte@eleveaagencia.com.br</a>
        </p>
        <p>
          Sua solicitação será processada em até 30 dias, conforme a legislação
          aplicável (ex: LGPD).
        </p>
      </section>

      <hr style={{ margin: "2rem 0" }} />

      <footer style={{ fontSize: "0.9rem", color: "#666" }}>
        <p>
          Elevea Agência — {new Date().getFullYear()}.
        </p>
      </footer>
    </div>
  );
}
