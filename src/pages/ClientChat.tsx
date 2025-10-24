import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Send,
  Image as ImageIcon,
  FileText,
  FileDown,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDataStore } from '@/stores/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ClientChat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, messages, addMessage, markClientMessagesAsRead } = useDataStore();
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const client = useMemo(() => clients.find((item) => item.id === id), [clients, id]);

  const initials = useMemo(() => {
    if (!client) {
      return '??';
    }

    const firstInitial = client.firstName?.charAt(0) ?? '';
    const lastInitial = client.lastName?.charAt(0) ?? '';

    const combined = `${firstInitial}${lastInitial}`.trim();
    return combined || '??';
  }, [client]);

  const conversation = useMemo(
    () =>
      messages
        .filter((message) => message.clientId === id)
        .map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    [messages, id]
  );

  useEffect(() => {
    if (!id) {
      return;
    }

    const hasUnseenMessages = conversation.some(
      (message) => !message.isFromAdvisor && !message.read
    );

    if (hasUnseenMessages) {
      markClientMessagesAsRead(id).catch((error) => {
        console.error('Error al marcar los mensajes como leídos', error);
      });
    }
  }, [conversation, id, markClientMessagesAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation.length]);

  const handleSendMessage = async () => {
    if (!id || !reply.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await addMessage({
        clientId: id,
        content: reply.trim(),
        timestamp: new Date(),
        isFromAdvisor: true,
        status: 'respondido',
      });

      setReply('');
    } catch (error) {
      console.error('Error al enviar el mensaje', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleGoBack = () => {
    navigate('/messages');
  };

  if (!client) {
    return (
      <div className="flex-1 p-3 sm:p-6 pt-16 lg:pt-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Chat no disponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base text-muted-foreground">
              No encontramos la información del cliente solicitada. Es posible que haya sido eliminado
              o que la dirección sea incorrecta.
            </p>
            <Button onClick={handleGoBack} className="w-full sm:w-auto">Volver a mensajes</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 pt-16 lg:pt-6">

      <Card className="flex flex-1 flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle>Chat con {client.firstName}</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {conversation.length} mensaje{conversation.length === 1 ? '' : 's'}
          </span>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-4">
          <div
            className="flex-1 space-y-3 overflow-y-auto p-2"
            style={{
              maxHeight: 'calc(100vh - 360px)',
              scrollbarWidth: 'thin',
              scrollbarColor: '#9ca3af transparent',
            }}
          >
            {conversation.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">No hay mensajes todavía</p>
            ) : (
              conversation.map((message) => {
                const isFile =
                  message.content.startsWith('[PDF:') || message.content.startsWith('[Imagen:');

                const getFileName = () => {
                  const match = message.content.match(/\[.*?:\s*(.+?)\]/);
                  return match ? match[1] : 'Archivo';
                };

                const fileName = getFileName();

                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${message.isFromAdvisor
                        ? 'ml-auto bg-primary/10 border-l-4 border-primary'
                        : 'mr-auto bg-muted border-l-4 border-border'
                      }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 sm:gap-4">
                      <span className="text-xs sm:text-sm font-medium">
                        {message.isFromAdvisor ? 'Tú (Asesora)' : client.firstName}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(message.timestamp), 'dd/MM HH:mm', { locale: es })}</span>
                        {message.read ? (
                          <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" aria-label="Mensaje visto" />
                        ) : (
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" aria-label="Mensaje enviado" />
                        )}
                      </div>
                    </div>

                    {isFile ? (
                      <div
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow"
                        onClick={() => alert(`Simulando descarga de: ${fileName}`)}
                      >
                        {message.content.startsWith('[Imagen:') ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-medium">{fileName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {message.content.startsWith('[Imagen:') ? 'Imagen' : 'Documento PDF'}
                          </p>
                        </div>

                        <FileDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Escribe tu mensaje para el cliente..."
                rows={3}
                className="flex-1 text-sm sm:text-base"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              <Button
                onClick={handleSendMessage}
                disabled={isSending || !reply.trim()}
                className="h-12 w-full sm:w-16 sm:h-12 flex items-center justify-center gap-2 sm:gap-0"
                aria-label="Enviar mensaje"
              >
                <Send className="h-4 w-4" />
                <span className="sm:hidden">Enviar</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Presiona <kbd className="rounded border bg-background px-1">Enter</kbd> para enviar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientChat;
