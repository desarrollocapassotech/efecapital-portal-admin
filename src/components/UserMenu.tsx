import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

/**
 * Usuario (iniciales + nombre/email) y botón de cerrar sesión, uno al lado del otro.
 * `variant="dark"` para fondos azul marino (barra móvil), `"light"` para la barra superior de desktop.
 */
export const UserMenu = ({ variant = 'light' }: { variant?: 'light' | 'dark' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const displayName = user?.name || user?.email || 'Usuario';
  const initials =
    displayName
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
    }
  };

  if (variant === 'dark') {
    return (
      <div className="flex items-center gap-1">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-gold-light/60 font-display text-xs font-semibold text-gold-light"
          title={user?.email ? `${displayName} · ${user.email}` : displayName}
        >
          {initials}
        </span>
        <button
          onClick={handleLogout}
          className="p-2 text-white hover:bg-sidebar-accent"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary font-display text-xs font-semibold text-primary-foreground">
          {initials}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="max-w-[14rem] truncate text-sm font-medium text-foreground">{displayName}</p>
          {user?.email && user.email !== displayName && (
            <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{user.email}</p>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-border" />

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 border border-input px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
};
