import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Messages = () => {
  const { messages, clients } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');

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
                                to={`/messages/${client.id}`}
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
                            <Button asChild size="sm">
                              <Link to={`/messages/${client.id}`}>Abrir chat</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
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