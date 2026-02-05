import { Link, useLocation } from 'react-router-dom';
import { 
  BellIcon, 
  ArrowRightOnRectangleIcon, 
  Squares2X2Icon,
  UserCircleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const NavBar = () => {
  const location = useLocation();
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 w-full transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2 group">
              <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                Plataforma UBS
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              <Link 
                to="/dashboard" 
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/dashboard') 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <Link 
                to="/solicitacoes" 
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/solicitacoes') 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <BellIcon className="w-5 h-5 mr-2" />
                Solicitações
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden sm:flex flex-col items-end border-r border-gray-200 pr-6 mr-2">
              <span className="text-sm font-semibold text-gray-900">
                Bem-vindo, {user.nome}!
              </span>
              <span className="text-xs text-gray-500 flex items-center capitalize">
                <UserCircleIcon className="w-3 h-3 mr-1" />
                Acesso: {user.role?.toLowerCase() || 'Usuário'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="group flex items-center text-gray-500 hover:text-red-600 font-medium transition-all duration-200"
            >
              <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors mr-1">
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </div>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
