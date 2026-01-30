import { Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import { Home } from "./pages/Home.jsx";
import { Register } from "./pages/Register.jsx";
import { DiagnosticoUBS } from "./pages/DiagnosticoUBS.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { RelatoriosSituacionais } from "./pages/RelatoriosSituacionais.jsx";
import { SolicitacaoProfissional } from "./pages/SolicitacaoProfissional.jsx";
import { GestorSolicitacoes } from "./pages/GestorSolicitacoes.jsx";
import { api } from "./api";

function RequerAutenticacao({ children }) {
  const tokenAcesso = api.getToken();
  if (!tokenAcesso) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequerProfissional({ children }) {
  const tokenAcesso = api.getToken();
  const usuarioAtual = api.getCurrentUser();
  if (!tokenAcesso) return <Navigate to="/" replace />;
  const role = `${usuarioAtual?.role || ""}`.toLowerCase();
  if (!usuarioAtual?.is_profissional && role !== "gestor") return <Navigate to="/dashboard" replace />;
  return children;
}

function RequerGestor({ children }) {
  const tokenAcesso = api.getToken();
  const usuarioAtual = api.getCurrentUser();
  if (!tokenAcesso) return <Navigate to="/" replace />;
  const role = `${usuarioAtual?.role || ""}`.toLowerCase();
  if (role !== "gestor") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequerAutenticacao>
              <Dashboard />
            </RequerAutenticacao>
          }
        />
        <Route
          path="/solicitacao-profissional"
          element={
            <RequerAutenticacao>
              <SolicitacaoProfissional />
            </RequerAutenticacao>
          }
        />
        <Route
          path="/gestor/solicitacoes"
          element={
            <RequerGestor>
              <GestorSolicitacoes />
            </RequerGestor>
          }
        />
        <Route
          path="/relatorios"
          element={
            <RequerProfissional>
              <RelatoriosSituacionais />
            </RequerProfissional>
          }
        />
        <Route
          path="/diagnostico"
          element={
            <RequerProfissional>
              <DiagnosticoUBS />
            </RequerProfissional>
          }
        />
      </Routes>
    </div>
  );
}
