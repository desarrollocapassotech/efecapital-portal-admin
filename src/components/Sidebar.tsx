import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Users,
  MessageCircle,
  FileText,
  Menu,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { UserMenu } from '@/components/UserMenu';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Mensajes', href: '/messages', icon: MessageCircle },
  { name: 'Informes', href: '/reports', icon: FileText },
];

const COLLAPSE_KEY = 'efe-admin-sidebar-collapsed';

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

const BrandLockup = ({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) => (
  <div className={`flex items-center gap-3 ${iconOnly ? 'justify-center' : ''}`}>
    <img src="logo-white.png" alt="EFE Capital" className={`shrink-0 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`} />
    {!iconOnly && (
      <span className="whitespace-nowrap font-display text-sm font-semibold tracking-[0.18em] text-white">
        EFE CAPITAL
      </span>
    )}
  </div>
);

const CountBadge = ({ value }: { value: number | string }) => (
  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-gold-light px-1.5 text-[11px] font-semibold text-gold-foreground">
    {value}
  </span>
);

export const Sidebar = () => {
  const location = useLocation();
  const { messages } = useDataStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // "Contraído" solo aplica en desktop (lg+); en móvil el menú es un panel deslizable
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* sin almacenamiento disponible */
      }
      return next;
    });
  };

  // Oculta un elemento solo en desktop cuando el menú está contraído
  const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';

  const newMessagesCount = messages.filter((m) => !m.isFromAdvisor && !m.read).length;
  const displayNewMessagesCount = newMessagesCount > 99 ? '99+' : newMessagesCount;
  const hasNewMessages = newMessagesCount > 0;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* === NAVBAR MÓVIL === */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar">
        <div className="flex h-14 items-center justify-between px-3">
          <button
            onClick={() => setIsSidebarOpen((open) => !open)}
            className="p-2 text-white hover:bg-sidebar-accent"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/clients" onClick={() => setIsSidebarOpen(false)}>
            <BrandLockup compact />
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/messages"
              className="relative p-2 text-white hover:bg-sidebar-accent"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Mensajes"
            >
              <MessageCircle className="h-5 w-5" />
              {hasNewMessages && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center bg-gold-light px-1 text-[10px] font-semibold text-gold-foreground">
                  {displayNewMessagesCount}
                </span>
              )}
            </Link>
            <UserMenu variant="dark" />
          </div>
        </div>
        <div className="brand-bar h-[2px]" />
      </header>

      {/* === SIDEBAR (deslizable en móvil, fijo y contraíble en desktop) === */}
      <aside
        className={`
          fixed lg:static left-0 bottom-0 z-40 shrink-0 overflow-hidden
          w-64 ${collapsed ? 'lg:w-16' : ''} bg-sidebar text-sidebar-foreground
          transform transition-[transform,width] duration-200 ease-out
          ${isSidebarOpen ? 'translate-x-0 top-[58px]' : '-translate-x-full top-0'}
          lg:translate-x-0 lg:top-0
        `}
      >
        <div className="flex h-full flex-col">
          {/* Marca (solo desktop) */}
          <div className="hidden lg:block">
            <Link to="/clients" className={`block py-6 ${collapsed ? 'px-3' : 'px-6'}`} title="EFE Capital">
              <BrandLockup iconOnly={collapsed} />
            </Link>
            <div className="brand-bar h-[2px]" />
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6">
            <p
              className={`${collapsed ? 'lg:invisible' : ''} px-6 pb-3 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50`}
            >
              Menú
            </p>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const showBadge = item.name === 'Mensajes' && hasNewMessages;

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`
                    relative flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors
                    ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                    ${active
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white'}
                  `}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-gold-light" />}
                  <span className="relative shrink-0">
                    <Icon className={`h-4 w-4 ${active ? 'text-gold-light' : ''}`} />
                    {collapsed && showBadge && (
                      <span className="absolute -right-1.5 -top-1.5 hidden h-2 w-2 bg-gold-light lg:block" />
                    )}
                  </span>
                  <span className={`whitespace-nowrap ${hideWhenCollapsed}`}>{item.name}</span>
                  {showBadge && (
                    <span className={`ml-auto ${hideWhenCollapsed}`}>
                      <CountBadge value={displayNewMessagesCount} />
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Contraer / expandir (solo desktop) */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-expanded={!collapsed}
            className={`hidden lg:flex items-center gap-3 border-t border-sidebar-border py-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-white ${
              collapsed ? 'justify-center px-0' : 'px-6'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && <span className="whitespace-nowrap">Contraer</span>}
          </button>

        </div>
      </aside>

      {/* Overlay oscuro (solo móvil) */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 top-[58px] z-30 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
};
