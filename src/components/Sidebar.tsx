import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  MessageCircle,
  FileText,
  Bell,
  LogOut,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Mensajes', href: '/messages', icon: MessageCircle },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { notifications, messages } = useDataStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const pendingMessages = messages.filter((m) => m.status === 'pendiente' && !m.isFromAdvisor).length;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* === NAVBAR (móvil): botón a la izquierda, título CENTRADO === */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Botón ☰ a la izquierda */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md text-foreground hover:bg-muted"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* FinanceAdvisor y Panel Profesional → AHORA CENTRADO */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-base font-semibold text-foreground">FinanceAdvisor</h1>
              <p className="text-xs text-muted-foreground">Panel Profesional</p>
            </div>
          </div>
        </div>
      </header>

      {/* === SIDEBAR (deslizable, empieza debajo de la navbar en móvil) === */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          lg:top-0
          ${isSidebarOpen ? 'top-16' : 'top-0'} /* Ajusta la posición: bajo la navbar en móvil */
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header (oculto en móvil, ya está en la navbar) */}
          <div className="hidden lg:block p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">FinanceAdvisor</h1>
                <p className="text-sm text-muted-foreground">Panel Profesional</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground">Asesora Financiera</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
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
                  {item.name === 'Mensajes' && pendingMessages > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                      {pendingMessages}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                logout();
                setIsSidebarOpen(false);
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay oscuro (solo móvil) */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};