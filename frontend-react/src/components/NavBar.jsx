import { Link, NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";

export function NavBar() {
  const navigate = useNavigate();
  const tokenAcesso = api.getToken();
  const usuarioAtual = api.getCurrentUser();

  const handleLogout = () => {
    api.logout();
    navigate("/"); // Redirect to home after logout to refresh state
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          {/* Simple SVG Logo for Health Platform */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <span>Plataforma Saúde</span>
        </Link>
        <nav className="navbar-nav">
          {!tokenAcesso ? (
            <>
              <NavLink to="/" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Login</NavLink>
              <NavLink to="/register" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Cadastro</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Dashboard</NavLink>
              <NavLink to="/diagnostico" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>Novo Relatório</NavLink>
              <div className="navbar-user">
                {usuarioAtual && (
                  <span className="user-role">
                    {usuarioAtual.is_profissional ? "Profissional" : "Usuário"}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-logout"
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}