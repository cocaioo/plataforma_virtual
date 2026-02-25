import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import RelatoriosSituacionais from './pages/RelatoriosSituacionais';
import SetupUbs from './pages/SetupUbs';
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
import { api } from './services/api';

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

const UbsGate = ({ children }) => {
  const [status, setStatus] = useState({ loading: true, hasUbs: true });
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const canSetupUbs = ['PROFISSIONAL', 'GESTOR'].includes(user?.role);

  useEffect(() => {
    let active = true;
    const checkUbs = async () => {
      try {
        const data = await api.request('/ubs?page=1&page_size=1', { requiresAuth: true });
        const hasUbs = Array.isArray(data?.items) && data.items.length > 0;
        if (active) setStatus({ loading: false, hasUbs });
      } catch {
        if (active) setStatus({ loading: false, hasUbs: false });
      }
    };

    checkUbs();
    return () => { active = false; };
  }, []);

  if (status.loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!status.hasUbs) {
    if (canSetupUbs) {
      return <Navigate to="/setup-ubs" replace />;
    }

    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-semibold">UBS ainda nao configurada</h2>
          <p className="mt-2 text-sm text-amber-800">
            A configuracao inicial precisa ser feita por um gestor ou profissional. Fale com o administrador
            para liberar o acesso.
          </p>
        </div>
      </div>
    );
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
                  <UbsGate>
                    <Dashboard />
                  </UbsGate>
                </ProtectedRoute>
              } />
              
              <Route path="/agendamento" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO', 'ACS']}>
                  <UbsGate>
                    <Agendamento />
                  </UbsGate>
                </ProtectedRoute>
              } />
              
              <Route path="/relatorios-situacionais" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']}>
                  <UbsGate>
                    <RelatoriosSituacionais />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/setup-ubs" element={
                <ProtectedRoute allowedRoles={['PROFISSIONAL', 'GESTOR']}>
                  <SetupUbs />
                </ProtectedRoute>
              } />
              
              <Route path="/solicitacoes" element={
                <ProtectedRoute allowedRoles={['GESTOR']}>
                  <UbsGate>
                    <GestorSolicitacoes />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/notificacoes" element={
                <ProtectedRoute allowedRoles={['GESTOR', 'RECEPCAO']}>
                  <UbsGate>
                    <Notificacoes />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/mapa-problemas-intervencoes" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR']}>
                  <UbsGate>
                    <MapaProblemasIntervencoes />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/materiais-educativos" element={
                <ProtectedRoute allowedRoles={['PROFISSIONAL', 'GESTOR']}>
                  <UbsGate>
                    <MateriaisEducativos />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/cronograma" element={
                <ProtectedRoute allowedRoles={['PROFISSIONAL', 'GESTOR']}>
                  <UbsGate>
                    <Cronograma />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/suporte-feedback" element={
                <ProtectedRoute allowedRoles={['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']}>
                  <UbsGate>
                    <SuporteFeedback />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/gerenciar-mensagens" element={
                <ProtectedRoute allowedRoles={['RECEPCAO']}>
                  <UbsGate>
                    <GerenciarMensagens />
                  </UbsGate>
                </ProtectedRoute>
              } />

              <Route path="/gestao-equipes" element={
                <ProtectedRoute allowedRoles={['GESTOR', 'RECEPCAO']}>
                  <UbsGate>
                    <GestaoEquipesMicroareas />
                  </UbsGate>
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
