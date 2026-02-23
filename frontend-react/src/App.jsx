import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import RelatoriosSituacionais from './pages/RelatoriosSituacionais';
import GestorSolicitacoes from './pages/GestorSolicitacoes';
import Agendamento from './pages/Agendamento';
import Notificacoes from './pages/Notificacoes';
import MapaProblemasIntervencoes from './pages/MapaProblemasIntervencoes';
import MateriaisEducativos from './pages/MateriaisEducativos';
import Cronograma from './pages/Cronograma';
import SuporteFeedback from './pages/SuporteFeedback';
import GerenciarMensagens from './pages/GerenciarMensagens';
import GestaoEquipesMicroareas from './pages/GestaoEquipesMicroareas';
import NavBar from './components/NavBar';
import { NotificationsProvider } from './components/ui/Notifications';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const [isDark, setIsDark] = useState(false);

  const handleToggleTheme = () => {
    setIsDark((current) => !current);
  };

  return (
    <NotificationsProvider>
      <div className={isDark ? 'dark' : ''}>
        <Router>
          <NavBar isDark={isDark} onToggleTheme={handleToggleTheme} />
          <main className="bg-gray-50 dark:bg-slate-950 min-h-screen">
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/agendamento" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO', 'ACS']}>
                  <Agendamento />
                </ProtectedRoute>
              } />
              
              <Route path="/relatorios-situacionais" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']}>
                  <RelatoriosSituacionais />
                </ProtectedRoute>
              } />
              
              <Route path="/solicitacoes" element={
                <ProtectedRoute allowedRoles={['GESTOR']}>
                  <GestorSolicitacoes />
                </ProtectedRoute>
              } />

              <Route path="/notificacoes" element={
                <ProtectedRoute allowedRoles={['GESTOR', 'RECEPCAO']}>
                  <Notificacoes />
                </ProtectedRoute>
              } />

              <Route path="/mapa-problemas-intervencoes" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR']}>
                  <MapaProblemasIntervencoes />
                </ProtectedRoute>
              } />

              <Route path="/materiais-educativos" element={
                <ProtectedRoute allowedRoles={['PROFISSIONAL', 'GESTOR']}>
                  <MateriaisEducativos />
                </ProtectedRoute>
              } />

              <Route path="/cronograma" element={
                <ProtectedRoute allowedRoles={['PROFISSIONAL', 'GESTOR']}>
                  <Cronograma />
                </ProtectedRoute>
              } />

              <Route path="/suporte-feedback" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']}>
                  <SuporteFeedback />
                </ProtectedRoute>
              } />

              <Route path="/gerenciar-mensagens" element={
                <ProtectedRoute allowedRoles={['RECEPCAO']}>
                  <GerenciarMensagens />
                </ProtectedRoute>
              } />

              <Route path="/gestao-equipes" element={
                <ProtectedRoute allowedRoles={['GESTOR', 'RECEPCAO']}>
                  <GestaoEquipesMicroareas />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </Router>
      </div>
    </NotificationsProvider>
  );
}

export default App;
