import { Link, useLocation } from "react-router-dom";
import { api } from "../api";

export function NavBar() {
  const location = useLocation();
  const tokenAcesso = api.getToken();
  const usuarioAtual = api.getCurrentUser();

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
            <Link to="/diagnostico">Novo relatório situacional</Link>
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
                {usuarioAtual.is_profissional ? "Profissional" : "Usuário"}
              </span>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
