import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
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

    markClientMessagesAsRead(id).catch((error) => {
      console.error('Error al marcar los mensajes como leídos', error);
    });
  }, [id, markClientMessagesAsRead]);

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
      <div className="flex-1 p-6 pt-16 lg:pt-0">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Chat no disponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              No encontramos la información del cliente solicitada. Es posible que haya sido eliminado
              o que la dirección sea incorrecta.
            </p>
            <Button onClick={handleGoBack}>Volver a mensajes</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={handleGoBack} className="hidden lg:inline-flex">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <span className="text-lg font-semibold text-primary-foreground">{initials}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Conversación con {client.firstName} {client.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">Canal directo con el cliente</p>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="lg:hidden">
          <Link to="/messages">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mensajes
          </Link>
        </Button>
      </div>

      <Card className="max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle>Chat</CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {conversation.length} mensaje{conversation.length === 1 ? '' : 's'}
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {conversation.length > 0 ? (
              conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isFromAdvisor ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                      message.isFromAdvisor
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <span className="mt-1 block text-[10px] text-muted-foreground/80">
                      {format(message.timestamp, 'dd MMM yyyy HH:mm', {
                        locale: es,
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-muted-foreground">
                Todavía no hay mensajes en esta conversación.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Escribe tu mensaje para el cliente..."
              rows={4}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReply('')}
                disabled={isSending || reply.length === 0}
              >
                Limpiar
              </Button>
              <Button onClick={handleSendMessage} disabled={isSending || reply.trim().length === 0}>
                <Send className="mr-2 h-4 w-4" /> Enviar mensaje
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientChat;
