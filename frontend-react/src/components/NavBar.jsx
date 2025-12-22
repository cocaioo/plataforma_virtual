import { Link, useLocation } from "react-router-dom";
import { api } from "../api";

export function NavBar() {
  const location = useLocation();
  const token = api.getToken();
  const currentUser = api.getCurrentUser();

  const isAuthPage = location.pathname === "/" || location.pathname === "/register";

  return (
    <header className="navbar">
      <div className="brand">Plataforma UBS</div>
      <nav className="nav-links">
        {!token && (
          <>
            <Link to="/">Login</Link>
            <Link to="/register">Cadastro</Link>
          </>
        )}
        {token && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/diagnostico">Diagnóstico</Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => api.logout()}
              style={{ marginLeft: "8px" }}
            >
              Sair
            </button>
            {currentUser && (
              <span className="muted" style={{ marginLeft: "8px", fontSize: "13px" }}>
                {currentUser.is_profissional ? "Profissional" : "Usuário"}
              </span>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
