import { NotificationSettings } from '@/components/NotificationSettings';
import { NotificationTester } from '@/components/NotificationTester';

const Index = () => {
  return (
    <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 pt-16 lg:pt-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center space-y-2 px-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Gestiona tus clientes, mensajes y documentos desde aquí.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <NotificationSettings />
          
          <div className="bg-card rounded-lg border p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Accesos rápidos</h3>
            <div className="space-y-2 sm:space-y-3">
              <a 
                href="/clients" 
                className="block p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm sm:text-base">Clientes</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Gestiona tu cartera de clientes</div>
              </a>
              <a 
                href="/messages" 
                className="block p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm sm:text-base">Mensajes</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Comunícate con tus clientes</div>
              </a>
              <a 
                href="/reports" 
                className="block p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm sm:text-base">Reportes</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Documentos y análisis</div>
              </a>
            </div>
          </div>
        </div>

        <div className="w-full">
          <NotificationTester />
        </div>
      </div>
    </div>
  );
};

export default Index;
