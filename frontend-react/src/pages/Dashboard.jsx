import { api } from "../api";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

// Menu de funcionalidades após login.
// Por enquanto, sempre mostramos a visão completa de gestor
// para qualquer usuário autenticado (mais simples para testar a UI).
export function Dashboard() {
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
      } finally {
        setCarregandoUsuario(false);
      }
    })();
  }, []);

  const usuarioAtual = api.getCurrentUser();
  const papel = (usuarioAtual?.role || (usuarioAtual?.is_profissional ? "profissional" : "usuario")).toLowerCase();
  const rotuloPapel =
    papel === "gestor" ? "Gestor da UBS" : papel === "profissional" ? "Profissional da UBS" : "Usuário";

  // Distribuição simples de funcionalidades com base no dashboard_ideal.md
  const itensComuns = [
    {
      title: "Solicitar acesso profissional",
      desc: "Enviar sua solicitação para avaliação do gestor da UBS.",
      to: "/solicitacao-profissional",
      allowedFor: ["usuario"],
    },
    {
      title: "Novo relatório situacional",
      desc: "Preencher o formulário de diagnóstico para criar um relatório situacional do zero.",
      to: "/diagnostico",
      allowedFor: ["profissional"],
    },
    {
      title: "Gerenciar relatórios situacionais",
      desc: "Ver e gerir rascunhos e relatórios situacionais já criados.",
      to: "/relatorios",
      allowedFor: ["profissional"],
    },
    {
      title: "Marcação de Consultas",
      desc: "Registrar e acompanhar agendamentos de consultas na UBS.",
      to: "#",
      allowedFor: ["profissional"],
    },
    {
      title: "Materiais Educativos",
      desc: "Acesso a orientações e documentos sobre diagnóstico situacional.",
      to: "#",
      allowedFor: ["usuario", "profissional"],
    },
    {
      title: "Suporte e Feedback",
      desc: "Envie sugestões, dúvidas ou reporte problemas.",
      to: "#",
      allowedFor: ["usuario", "profissional"],
    },
  ];

  const extrasGestor = [
    {
      title: "Gestão de Equipes e Microáreas",
      desc: "Visão de equipes da ESF, microáreas e território (futuro).",
      to: "#",
      allowedFor: ["profissional"],
    },
    {
      title: "Relatórios e Priorizações",
      desc: "Relatórios, priorização de problemas (GUT) e planos de intervenção.",
      to: "#",
      allowedFor: ["profissional"],
    },
  ];

  const allowed = (item) => {
    if (!item.allowedFor) return true;
    if (item.allowedFor.includes(papel)) return true;
    // Gestor herda permissões de profissional
    if (papel === "gestor" && item.allowedFor.includes("profissional")) return true;
    return false;
  };

  const itens = [...itensComuns, ...extrasGestor].filter(allowed);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Bem-vindo à plataforma UBS</p>
          <h1>Menu principal</h1>
          <p className="muted">
            Você está autenticado como <strong>{rotuloPapel}</strong>.
          </p>
          {carregandoUsuario && <p className="muted">Atualizando permissões…</p>}
        </div>
      </section>

      <section className="card-grid">
        {itens.map((cartao) => (
          <article className="card" key={cartao.title}>
            <h3>{cartao.title}</h3>
            <p>{cartao.desc}</p>
            {cartao.to === "#" ? (
              <button className="btn btn-primary" type="button" disabled>
                Em desenvolvimento
              </button>
            ) : (
              <Link className="btn btn-primary" to={cartao.to}>
                Acessar
              </Link>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
