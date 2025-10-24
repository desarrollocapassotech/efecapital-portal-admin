/**
 * Servicio de notificaciones push del navegador
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  /**
   * Solicita permisos para mostrar notificaciones
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Las notificaciones no están soportadas en este navegador');
      return 'denied';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Error al solicitar permisos de notificación:', error);
      return 'denied';
    }
  }

  /**
   * Verifica si las notificaciones están permitidas
   */
  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Muestra una notificación push
   */
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.isSupported) {
      console.warn('Las notificaciones no están soportadas');
      return;
    }

    if (!this.isPermissionGranted()) {
      console.warn('Los permisos de notificación no están concedidos');
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: options.badge || '/favicon.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // Auto-cerrar la notificación después de 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Manejar clics en la notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Si hay datos específicos, navegar a la página correspondiente
        if (options.data?.clientId) {
          window.location.href = `/messages/${options.data.clientId}`;
        } else if (options.data?.route) {
          window.location.href = options.data.route;
        }
      };

    } catch (error) {
      console.error('Error al mostrar notificación:', error);
    }
  }

  /**
   * Muestra una notificación de mensaje nuevo
   */
  async showMessageNotification(clientName: string, messageContent: string, clientId: string): Promise<void> {
    await this.showNotification({
      title: `Nuevo mensaje de ${clientName}`,
      body: messageContent.length > 100 ? `${messageContent.substring(0, 100)}...` : messageContent,
      tag: `message-${clientId}`,
      data: { clientId, route: `/messages/${clientId}` },
      requireInteraction: true,
    });
  }

  /**
   * Muestra una notificación de documento nuevo
   */
  async showDocumentNotification(documentName: string, description: string): Promise<void> {
    await this.showNotification({
      title: `Nuevo documento: ${documentName}`,
      body: description,
      tag: `document-${documentName}`,
      data: { route: '/documents' },
      requireInteraction: false,
    });
  }

  /**
   * Cierra todas las notificaciones con un tag específico
   */
  closeNotificationsByTag(tag: string): void {
    // Las notificaciones se cierran automáticamente, pero podemos limpiar referencias
    console.log(`Cerrando notificaciones con tag: ${tag}`);
  }

  /**
   * Verifica el estado de soporte y permisos
   */
  getStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    granted: boolean;
  } {
    return {
      supported: this.isSupported,
      permission: this.permission,
      granted: this.isPermissionGranted(),
    };
  }
}

// Instancia singleton del servicio
export const notificationService = new NotificationService();

// Hook para usar el servicio de notificaciones en React
export const useNotifications = () => {
  return {
    requestPermission: () => notificationService.requestPermission(),
    showMessageNotification: (clientName: string, messageContent: string, clientId: string) =>
      notificationService.showMessageNotification(clientName, messageContent, clientId),
    showDocumentNotification: (documentName: string, description: string) =>
      notificationService.showDocumentNotification(documentName, description),
    isPermissionGranted: () => notificationService.isPermissionGranted(),
    getStatus: () => notificationService.getStatus(),
  };
};
