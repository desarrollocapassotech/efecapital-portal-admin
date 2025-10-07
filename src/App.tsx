import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Clients } from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import { ClientForm } from "./pages/ClientForm";
import { Messages } from "./pages/Messages";
import ClientChat from "./pages/ClientChat";
import { Reports } from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { useAuthStore } from "@/stores/authStore";
import { useDataStore } from "@/stores/dataStore";

const queryClient = new QueryClient();

const App = () => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  useEffect(() => {
    const { startDataListeners, stopDataListeners } = useDataStore.getState();

    if (isAuthenticated) {
      startDataListeners();
      return () => {
        stopDataListeners();
      };
    }

    stopDataListeners();
    return undefined;
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="clients/:id/edit" element={<ClientForm />} />
              <Route path="clients/new" element={<ClientForm />} />
              <Route path="messages" element={<Messages />} />
              <Route path="messages/:id" element={<ClientChat />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
