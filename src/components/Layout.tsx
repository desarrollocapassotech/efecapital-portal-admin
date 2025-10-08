import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from '@/components/Sidebar';
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {isDataLoading ? <LoadingOverlay /> : null}
    </div>
  );
};
