import { useState } from 'react';
import { Bell, MessageCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications } from '@/lib/notifications';

export const NotificationTester = () => {
  const { showMessageNotification, showDocumentNotification, isPermissionGranted } = useNotifications();
  const [clientName, setClientName] = useState('Juan Pérez');
  const [messageContent, setMessageContent] = useState('Hola, tengo una consulta sobre mi portafolio de inversiones.');
  const [documentName, setDocumentName] = useState('Informe Mensual');
  const [documentDescription, setDocumentDescription] = useState('Análisis del rendimiento del portafolio para el mes actual.');

  const handleTestMessageNotification = async () => {
    if (!isPermissionGranted()) {
      alert('Primero debes activar las notificaciones en la configuración');
      return;
    }

    await showMessageNotification(clientName, messageContent, 'test-client-id');
  };

  const handleTestDocumentNotification = async () => {
    if (!isPermissionGranted()) {
      alert('Primero debes activar las notificaciones en la configuración');
      return;
    }

    await showDocumentNotification(documentName, documentDescription);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Probar notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          <p className="font-medium">ℹ️ Instrucciones de prueba:</p>
          <ol className="mt-2 list-decimal list-inside space-y-1">
            <li>Asegúrate de que las notificaciones estén activadas</li>
            <li>Personaliza el contenido de las notificaciones de prueba</li>
            <li>Haz clic en los botones para probar las notificaciones</li>
            <li>Las notificaciones aparecerán en tu sistema operativo</li>
          </ol>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Prueba de notificación de mensaje */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <h3 className="font-medium">Notificación de mensaje</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="client-name">Nombre del cliente</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              
              <div>
                <Label htmlFor="message-content">Contenido del mensaje</Label>
                <Textarea
                  id="message-content"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Escribe el mensaje de prueba..."
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleTestMessageNotification}
                className="w-full"
                disabled={!clientName.trim() || !messageContent.trim()}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Probar notificación de mensaje
              </Button>
            </div>
          </div>

          {/* Prueba de notificación de documento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <h3 className="font-medium">Notificación de documento</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="document-name">Nombre del documento</Label>
                <Input
                  id="document-name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ej: Informe Mensual"
                />
              </div>
              
              <div>
                <Label htmlFor="document-description">Descripción</Label>
                <Textarea
                  id="document-description"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Escribe la descripción del documento..."
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleTestDocumentNotification}
                className="w-full"
                disabled={!documentName.trim() || !documentDescription.trim()}
              >
                <FileText className="mr-2 h-4 w-4" />
                Probar notificación de documento
              </Button>
            </div>
          </div>
        </div>

        {!isPermissionGranted() && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            <p className="font-medium">⚠️ Notificaciones no activadas</p>
            <p className="mt-1">
              Ve a la configuración de notificaciones para activarlas antes de probar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
