import { NotificationSettings } from '@/components/NotificationSettings';
import { NotificationTester } from '@/components/NotificationTester';

const Index = () => {
  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona tus clientes, mensajes y documentos desde aquí.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <NotificationSettings />
          
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Accesos rápidos</h3>
            <div className="space-y-3">
              <a 
                href="/clients" 
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium">Clientes</div>
                <div className="text-sm text-muted-foreground">Gestiona tu cartera de clientes</div>
              </a>
              <a 
                href="/messages" 
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium">Mensajes</div>
                <div className="text-sm text-muted-foreground">Comunícate con tus clientes</div>
              </a>
              <a 
                href="/reports" 
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium">Reportes</div>
                <div className="text-sm text-muted-foreground">Documentos y análisis</div>
              </a>
            </div>
          </div>
        </div>

        <NotificationTester />
      </div>
    </div>
  );
};

export default Index;
