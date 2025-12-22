import { AuthCard } from "../components/AuthCard";

// Tela inicial: foco em login ou criação de conta
export function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">UBS · Acesso à plataforma</p>
          <h1>Faça login para acessar o diagnóstico</h1>
          <p className="muted">
            Entre com seu email e senha para acessar as funcionalidades da plataforma. Se ainda não tiver conta,
            crie um cadastro para começar.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="/register">Criar conta</a>
          </div>
        </div>
        <AuthCard />
      </section>
    </main>
  );
}
