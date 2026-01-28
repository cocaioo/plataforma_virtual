import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api";

export function NavBar() {
  const location = useLocation();
  const tokenAcesso = api.getToken();
  const usuarioAtual = api.getCurrentUser();
  const role = `${usuarioAtual?.role || ""}`.toLowerCase();

  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    if (!tokenAcesso || role !== "gestor") {
      setPendentes(0);
      return;
    }
    (async () => {
      try {
        const count = await api.getPendingProfessionalRequestsCount();
        setPendentes(count);
      } catch {
        // silencioso: não bloqueia navbar
      }
    })();
  }, [tokenAcesso, role, location.pathname]);

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
            {role === "gestor" && (
              <Link to="/gestor/solicitacoes" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span>Solicitações</span>
                <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {pendentes > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        minWidth: "16px",
                        height: "16px",
                        padding: "0 4px",
                        borderRadius: "999px",
                        background: "#ef4444",
                        color: "white",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                      title={`${pendentes} solicitações pendentes`}
                    >
                      {pendentes > 99 ? "99+" : pendentes}
                    </span>
                  )}
                </span>
              </Link>
            )}
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
