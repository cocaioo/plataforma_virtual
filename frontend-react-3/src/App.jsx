import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DiagnosticoUBS from './pages/DiagnosticoUBS';
import RelatoriosSituacionais from './pages/RelatoriosSituacionais';
import GestorSolicitacoes from './pages/GestorSolicitacoes';
import Agendamento from './pages/Agendamento';
import NavBar from './components/NavBar';

function App() {
  return (
    <Router>
      <NavBar />
      <main className="bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agendamento" element={<Agendamento />} />
          <Route path="/diagnostico-ubs" element={<DiagnosticoUBS />} />
          <Route path="/diagnostico/:id" element={<DiagnosticoUBS />} />
          <Route path="/relatorios-situacionais" element={<RelatoriosSituacionais />} />
          <Route path="/solicitacoes" element={<GestorSolicitacoes />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
