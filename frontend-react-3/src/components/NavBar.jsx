import { Link } from 'react-router-dom';
import { BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const NavBar = () => {
  const handleLogout = () => {
    // For now, just redirect to login
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-800">
              Plataforma UBS
            </Link>
            <div className="hidden md:flex items-center space-x-4">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                    Dashboard
                </Link>
                <Link to="/diagnostico-ubs" className="text-gray-600 hover:text-gray-900">
                    Novo relatório situacional
                </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
              <Link to="/solicitacoes" className="relative flex items-center text-gray-600 hover:text-gray-900">
                <BellIcon className="h-6 w-6" />
                <span className="ml-2">Solicitações</span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    3
                </span>
              </Link>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Gestor
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6 mr-1" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;