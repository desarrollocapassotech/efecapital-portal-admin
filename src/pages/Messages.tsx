import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Search, Send } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const Messages = () => {
  const { messages, clients, addMessage, markClientMessagesAsRead } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [quickReply, setQuickReply] = useState('');
  const [isSending, setIsSending] = useState(false);

  const newMessagesCount = messages.filter(
    (msg) => !msg.isFromAdvisor && (!msg.visto || msg.status === 'pendiente')
  ).length;
  const displayNewMessagesCount = newMessagesCount > 99 ? '99+' : newMessagesCount;
  const hasNewMessages = newMessagesCount > 0;

  // Filtrar clientes que tengan mensajes y coincidan con el término de búsqueda
  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        const clientMessages = messages.filter((m) => m.clientId === client.id);
        if (clientMessages.length === 0) return false;

        const matchesSearch =
          searchTerm === '' ||
          client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.lastName.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
      })
      .sort((a, b) => {
        // Ordenar por mensaje más reciente
        const aMessages = messages.filter((m) => m.clientId === a.id);
        const bMessages = messages.filter((m) => m.clientId === b.id);

        const aLatest = aMessages.length ? new Date(aMessages[0].timestamp) : new Date(0);
        const bLatest = bMessages.length ? new Date(bMessages[0].timestamp) : new Date(0);

        return bLatest.getTime() - aLatest.getTime();
      });
  }, [clients, messages, searchTerm]);

  // Verificar si hay mensajes no leídos (del cliente y no leídos)
  const hasUnreadMessages = (clientId: string) => {
    return messages.some(
      (msg) => msg.clientId === clientId && !msg.isFromAdvisor && !msg.visto
    );
  };

  const toggleClientQuickReply = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      setQuickReply('');
      return;
    }

    setExpandedClientId(clientId);
    setQuickReply('');

    if (hasUnreadMessages(clientId)) {
      markClientMessagesAsRead(clientId).catch((error) => {
        console.error('Error al marcar mensajes como leídos', error);
      });
    }
  };

  const handleSendQuickReply = async () => {
    if (!expandedClientId || !quickReply.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await addMessage({
        clientId: expandedClientId,
        content: quickReply.trim(),
        timestamp: new Date(),
        isFromAdvisor: true,
        status: 'respondido',
      });
      setQuickReply('');
    } catch (error) {
      console.error('Error al enviar la respuesta rápida', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="relative lg:hidden">
            <MessageCircle className="h-10 w-10 text-primary" />
            {hasNewMessages && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-6 min-w-[1.5rem] px-1 text-xs leading-none flex items-center justify-center"
              >
                {displayNewMessagesCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Centro de Mensajes</h1>
            <p className="text-muted-foreground">
              Gestiona todas las comunicaciones con tus clientes
            </p>
          </div>
        </div>
        {hasNewMessages && (
          <Badge className="hidden lg:inline-flex h-6 min-w-[1.5rem] px-2 text-xs items-center justify-center">
            {displayNewMessagesCount}
          </Badge>
        )}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? 'No se encontraron clientes con ese nombre'
                : 'No tienes mensajes todavía'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => {
                const clientMessages = messages.filter((m) => m.clientId === client.id);
                const latestMessage = clientMessages[0];
                const recentMessages = clientMessages
                  .slice(0, 5)
                  .map((message) => ({
                    ...message,
                    timestamp: new Date(message.timestamp),
                  }))
                  .reverse();
                const isExpanded = expandedClientId === client.id;

                return (
                  <div
                    key={client.id}
                    className="rounded-lg border border-border/60 bg-background/80 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-col gap-3 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4">
                          {/* Avatar con indicador de no leído */}
                          <div className="relative">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                              <span className="text-base font-medium text-primary-foreground">
                                {client.firstName[0]}
                                {client.lastName[0]}
                              </span>
                            </div>
                            {hasUnreadMessages(client.id) && (
                              <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-background"></span>
                            )}
                          </div>

                          {/* Información del cliente */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/clients/${client.id}`}
                                className="font-semibold text-foreground transition-colors hover:text-primary"
                              >
                                {client.firstName} {client.lastName}
                              </Link>
                              {hasUnreadMessages(client.id) && (
                                <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                              )}
                            </div>
                            {latestMessage ? (
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {latestMessage.content}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Sin mensajes</p>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center justify-between gap-3 lg:justify-end">
                          {latestMessage && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(latestMessage.timestamp), 'dd MMM HH:mm', {
                                locale: es,
                              })}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/clients/${client.id}`}>Ver detalle</Link>
                            </Button>
                            <Button
                              variant={isExpanded ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() => toggleClientQuickReply(client.id)}
                            >
                              {isExpanded ? 'Ocultar' : 'Responder'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-4 border-t border-border/60 pt-4">
                          <div className="space-y-3">
                            {recentMessages.length > 0 ? (
                              recentMessages.map((message) => (
                                <div
                                  key={message.id}
                                  className={`flex ${
                                    message.isFromAdvisor ? 'justify-end' : 'justify-start'
                                  }`}
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
                              <p className="text-sm text-muted-foreground">
                                No hay mensajes previos en esta conversación.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Textarea
                              value={quickReply}
                              onChange={(event) => setQuickReply(event.target.value)}
                              placeholder="Escribe una respuesta rápida..."
                              rows={3}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQuickReply('')}
                                disabled={isSending}
                              >
                                Limpiar
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSendQuickReply}
                                disabled={isSending || quickReply.trim().length === 0}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Enviar respuesta
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};