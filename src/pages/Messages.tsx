import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Messages = () => {
  const { messages, clients } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar clientes que tengan mensajes y coincidan con el término de búsqueda
  const filteredClients = clients
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Mensajes</h1>
          <p className="text-muted-foreground">
            Gestiona todas las comunicaciones con tus clientes
          </p>
        </div>
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
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className="block"
                  >
                    <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                      {/* Avatar con indicador de no leído */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-foreground">
                            {client.firstName[0]}{client.lastName[0]}
                          </span>
                        </div>
                        {hasUnreadMessages(client.id) && (
                          <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-background"></span>
                        )}
                      </div>

                      {/* Información del cliente */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-foreground truncate">
                            {client.firstName} {client.lastName}
                          </h3>
                          {hasUnreadMessages(client.id) && (
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </div>
                        {latestMessage ? (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {latestMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin mensajes</p>
                        )}
                      </div>

                      {/* Fecha del último mensaje */}
                      {latestMessage && (
                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(latestMessage.timestamp), 'HH:mm', { locale: es })}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};