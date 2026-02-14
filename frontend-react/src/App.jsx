import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import RelatoriosSituacionais from './pages/RelatoriosSituacionais';
import GestorSolicitacoes from './pages/GestorSolicitacoes';
import Agendamento from './pages/Agendamento';
import Notificacoes from './pages/Notificacoes';
import MapaProblemasIntervencoes from './pages/MapaProblemasIntervencoes';
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
  return (
    <NotificationsProvider>
      <Router>
        <NavBar />
        <main className="bg-gray-50 min-h-screen">
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
          </Routes>
        </main>
      </Router>
    </NotificationsProvider>
  );
}

export default App;
