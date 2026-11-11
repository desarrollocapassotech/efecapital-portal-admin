import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from '@/components/Sidebar';
import { UserMenu } from '@/components/UserMenu';
import { useDataStore } from '@/stores/dataStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export const Layout = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const isDataLoading = useDataStore((state) => state.isLoading);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground">Verificando sesión...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative flex h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (desktop): usuario y cerrar sesión */}
        <header className="hidden h-14 shrink-0 items-center justify-end border-b border-border bg-card px-6 lg:flex">
          <UserMenu />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {isDataLoading ? <LoadingOverlay /> : null}
    </div>
  );
};
