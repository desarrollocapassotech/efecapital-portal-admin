import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, 
  MessageCircle, 
  FileText, 
  Bell, 
  LogOut,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Mensajes', href: '/messages', icon: MessageCircle },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { notifications, messages } = useDataStore();
  
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const pendingMessages = messages.filter(m => m.status === 'pendiente' && !m.isFromAdvisor).length;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col w-64 bg-card border-r border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
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
              {user?.name.split(' ').map(n => n[0]).join('')}
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
          onClick={logout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};