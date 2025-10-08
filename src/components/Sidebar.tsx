import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, MessageCircle, FileText, LogOut, TrendingUp, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Mensajes', href: '/messages', icon: MessageCircle },
  { name: 'Informes', href: '/reports', icon: FileText },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { notifications, messages } = useDataStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const newMessagesCount = messages.filter(
    (m) => !m.isFromAdvisor && (!m.read)
  ).length;
  const displayNewMessagesCount = newMessagesCount > 99 ? '99+' : newMessagesCount;
  const hasNewMessages = newMessagesCount > 0;

  const displayName = user?.name || user?.email || 'Usuario';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'FA';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    } finally {
      setIsSidebarOpen(false);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* === NAVBAR MÓVIL: botón ☰ a la izquierda, título centrado y clickeable === */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 relative">
          {/* Botón ☰ a la izquierda */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md text-foreground hover:bg-muted z-10"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            to="/clients"
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-2"
            onClick={() => setIsSidebarOpen(false)}
          >
            <div className="p-1.5 rounded-lg">
              <img src="logo11.png" alt="Logo" className='w-12' />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Panel de Administrador</p>
            </div>
          </Link>

          <Link
            to="/messages"
            className="p-2 rounded-md text-foreground hover:bg-muted relative"
            onClick={() => setIsSidebarOpen(false)}
          >
            <MessageCircle className="h-6 w-6" />
            {hasNewMessages && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-xs leading-none flex items-center justify-center"
              >
                {displayNewMessagesCount}
              </Badge>
            )}
          </Link>
        </div>
      </header>

      {/* === SIDEBAR (deslizable en móvil, fijo en desktop) === */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isSidebarOpen ? 'top-16' : 'top-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header del sidebar (solo desktop) */}
          <div className="hidden lg:block p-6 border-b border-border">
            <Link
              to="/clients"
              className="flex items-center space-x-3"
            >
              <div className="p-2 rounded-lg">
                <img src="logo11.png" alt="Logo" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Panel de Administrador</p>
              </div>
            </Link>
          </div>

          {/* Información del usuario */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {initials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    relative flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Notificaciones' && unreadNotifications > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-2 text-xs">
                      {unreadNotifications}
                    </Badge>
                  )}
                  {item.name === 'Mensajes' && hasNewMessages && (
                    <>
                      <Badge
                        variant="destructive"
                        className="hidden lg:flex absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-xs leading-none items-center justify-center"
                      >
                        {displayNewMessagesCount}
                      </Badge>
                      <Badge variant="secondary" className="lg:hidden ml-2 h-5 px-2 text-xs">
                        {displayNewMessagesCount}
                      </Badge>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Cerrar sesión */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay oscuro (solo en móvil cuando el sidebar está abierto) */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};