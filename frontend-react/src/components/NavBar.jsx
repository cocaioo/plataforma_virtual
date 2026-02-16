import { Link, useLocation } from 'react-router-dom';
import { 
  BellIcon, 
  ArrowRightOnRectangleIcon, 
  Squares2X2Icon,
  UserCircleIcon,
  BookOpenIcon,
  CalendarIcon,
  MoonIcon,
  SunIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  LifebuoyIcon
} from '@heroicons/react/24/outline';

const NavBar = ({ isDark, onToggleTheme }) => {
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
  const role = (user.role || 'USER').toUpperCase();
  const roleLabel = role.toLowerCase();

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 w-full transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2 group">
              <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-slate-300">
                Plataforma UBS
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              <Link 
                to="/dashboard" 
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/dashboard') 
                    ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Squares2X2Icon className="w-5 h-5 mr-2" />
                Dashboard
              </Link>

              {['PROFISSIONAL', 'GESTOR'].includes(role) && (
                <Link
                  to="/materiais-educativos"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/materiais-educativos')
                      ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <BookOpenIcon className="w-5 h-5 mr-2" />
                  Materiais
                </Link>
              )}

              {['PROFISSIONAL', 'GESTOR'].includes(role) && (
                <Link
                  to="/cronograma"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/cronograma')
                      ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Cronograma
                </Link>
              )}
              
              {(role === 'GESTOR' || role === 'RECEPCAO') && (
                <Link 
                  to="/notificacoes" 
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive('/notificacoes') 
                      ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <BellIcon className="w-5 h-5 mr-2" />
                  Notificações
                </Link>
              )}
            </div>
          </div>

            <div className="flex items-center space-x-6">
              <button
                type="button"
                onClick={onToggleTheme}
                className="group flex items-center text-gray-500 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white transition-all duration-200"
                aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                <div className="p-2 rounded-full group-hover:bg-gray-100 dark:group-hover:bg-slate-800 transition-colors">
                  {isDark ? (
                    <SunIcon className="h-5 w-5" />
                  ) : (
                    <MoonIcon className="h-5 w-5" />
                  )}
                </div>
              </button>

              <div className="hidden sm:flex flex-col items-end border-r border-gray-200 dark:border-slate-700 pr-6 mr-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Bem-vindo, {user.nome}!
              </span>
                <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center capitalize">
                <UserCircleIcon className="w-3 h-3 mr-1" />
                Acesso: {roleLabel}
              </span>
            </div>

            <button
              onClick={handleLogout}
                className="group flex items-center text-gray-500 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 font-medium transition-all duration-200"
            >
                <div className="p-2 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-950 transition-colors mr-1">
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
