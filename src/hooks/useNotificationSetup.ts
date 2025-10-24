import { useEffect } from 'react';
import { useDataStore } from '@/stores/dataStore';
import { notificationService } from '@/lib/notifications';

/**
 * Hook para manejar notificaciones automáticas
 * Se ejecuta cuando la aplicación se carga y configura las notificaciones
 */
export const useNotificationSetup = () => {
  const { messages, clients } = useDataStore();

  useEffect(() => {
    // Verificar si las notificaciones están soportadas y configuradas
    const status = notificationService.getStatus();
    
    if (!status.supported) {
      console.warn('Las notificaciones push no están soportadas en este navegador');
      return;
    }

    // Si los permisos no están concedidos, mostrar un mensaje en consola
    if (!status.granted) {
      console.info('Para recibir notificaciones de mensajes nuevos, habilita las notificaciones en tu navegador');
    }

    // Configurar el servicio de notificaciones
    console.log('Servicio de notificaciones configurado:', status);
  }, []);

  // Efecto para detectar mensajes nuevos y mostrar notificaciones
  useEffect(() => {
    if (!notificationService.isPermissionGranted()) {
      return;
    }

    // Obtener mensajes no leídos del cliente (no del asesor)
    const unreadClientMessages = messages.filter(
      (msg) => !msg.isFromAdvisor && !msg.read
    );

    // Si hay mensajes no leídos, mostrar una notificación general
    if (unreadClientMessages.length > 0) {
      const latestMessage = unreadClientMessages[0];
      const client = clients.find((c) => c.id === latestMessage.clientId);
      
      if (client) {
        notificationService.showMessageNotification(
          `${client.firstName} ${client.lastName}`,
          latestMessage.content,
          client.id
        ).catch((error) => {
          console.warn('No se pudo mostrar la notificación:', error);
        });
      }
    }
  }, [messages, clients]);

  return {
    requestPermission: () => notificationService.requestPermission(),
    isPermissionGranted: () => notificationService.isPermissionGranted(),
    getStatus: () => notificationService.getStatus(),
  };
};
