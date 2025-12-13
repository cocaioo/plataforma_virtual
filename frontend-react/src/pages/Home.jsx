import { AuthCard } from "../components/AuthCard";
import { CardGrid } from "../components/CardGrid";

export function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">UBS · Relatórios e Indicadores</p>
          <h1>Diagnóstico situacional simples e rápido</h1>
          <p className="muted">
            Centralize o cadastro da UBS, indicadores epidemiológicos e equipe, tudo em um só lugar.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/register">Criar conta</a>
            <a className="btn btn-secondary" href="#cards">Ver funcionalidades</a>
          </div>
        </div>
        <AuthCard />
      </section>

      <div id="cards">
        <CardGrid />
      </div>
    </main>
  );
}
