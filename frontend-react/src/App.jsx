import { Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import { Home } from "./pages/Home.jsx";
import { Register } from "./pages/Register.jsx";
import { DiagnosticoUBS } from "./pages/DiagnosticoUBS.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { api } from "./api";

function RequireAuth({ children }) {
  const token = api.getToken();
  if (!token) {
    return <Navigate to="/" replace />;
  }
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
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/diagnostico"
          element={
            <RequireAuth>
              <DiagnosticoUBS />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}
