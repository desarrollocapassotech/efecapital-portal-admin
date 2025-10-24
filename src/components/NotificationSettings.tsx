import { useEffect, useState } from 'react';
import { Bell, BellOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/lib/notifications';

export const NotificationSettings = () => {
  const { requestPermission, isPermissionGranted, getStatus } = useNotifications();
  const [status, setStatus] = useState(getStatus());
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setStatus(getStatus());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const newPermission = await requestPermission();
      setStatus(getStatus());
      
      if (newPermission === 'granted') {
        // Mostrar notificación de prueba
        await new Notification('Notificaciones activadas', {
          body: 'Ahora recibirás notificaciones cuando lleguen mensajes nuevos',
          icon: '/favicon.png',
        });
      }
    } catch (error) {
      console.error('Error al solicitar permisos:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const getPermissionBadge = () => {
    switch (status.permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500">Activadas</Badge>;
      case 'denied':
        return <Badge variant="destructive">Bloqueadas</Badge>;
      default:
        return <Badge variant="secondary">No configuradas</Badge>;
    }
  };

  const getPermissionDescription = () => {
    switch (status.permission) {
      case 'granted':
        return 'Recibirás notificaciones cuando lleguen mensajes nuevos de tus clientes.';
      case 'denied':
        return 'Las notificaciones están bloqueadas. Puedes habilitarlas en la configuración de tu navegador.';
      default:
        return 'Habilita las notificaciones para recibir alertas cuando lleguen mensajes nuevos.';
    }
  };

  if (!status.supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificaciones no soportadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Tu navegador no soporta notificaciones push. Considera usar un navegador más moderno.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Estado actual:</span>
              {getPermissionBadge()}
            </div>
            <p className="text-sm text-muted-foreground">
              {getPermissionDescription()}
            </p>
          </div>
        </div>

        {status.permission !== 'granted' && (
          <div className="space-y-3">
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting || status.permission === 'denied'}
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Solicitando permisos...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  {status.permission === 'denied' ? 'Permisos bloqueados' : 'Activar notificaciones'}
                </>
              )}
            </Button>

            {status.permission === 'denied' && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                <p className="font-medium">¿Cómo habilitar las notificaciones?</p>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>Haz clic en el ícono de candado o información en la barra de direcciones</li>
                  <li>Selecciona "Permitir" en la sección de notificaciones</li>
                  <li>Recarga la página</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {status.permission === 'granted' && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
            <p className="font-medium">✓ Notificaciones activadas</p>
            <p className="mt-1">
              Recibirás alertas cuando lleguen mensajes nuevos de tus clientes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
