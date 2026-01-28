import { Link, useLocation } from "react-router-dom";
import { api } from "../api";

export function NavBar() {
  const location = useLocation();
  const tokenAcesso = api.getToken();
  const usuarioAtual = api.getCurrentUser();
  const role = `${usuarioAtual?.role || ""}`.toLowerCase();

  const estaEmPaginaDeAuth = location.pathname === "/" || location.pathname === "/register";

  return (
    <header className="navbar">
      <div className="brand">Plataforma UBS</div>
      <nav className="nav-links">
        {!tokenAcesso && (
          <>
            <Link to="/">Login</Link>
            <Link to="/register">Cadastro</Link>
          </>
        )}
        {tokenAcesso && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {(usuarioAtual?.is_profissional || role === "gestor") && (
              <Link to="/diagnostico">Novo relatório situacional</Link>
            )}
            {role === "gestor" && <Link to="/gestor/solicitacoes">Solicitações</Link>}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => api.logout()}
              style={{ marginLeft: "8px" }}
            >
              Sair
            </button>
            {usuarioAtual && (
              <span className="muted" style={{ marginLeft: "8px", fontSize: "13px" }}>
                {role === "gestor" ? "Gestor" : usuarioAtual.is_profissional ? "Profissional" : "Usuário"}
              </span>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
