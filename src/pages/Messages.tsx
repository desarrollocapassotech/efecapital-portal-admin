import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Search, Filter, Eye, Clock, CheckCircle } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Messages = () => {
  const { messages, clients, updateMessageStatus } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMessages = messages.filter(message => {
    const client = clients.find(c => c.id === message.clientId);
    if (!client) return false;

    const matchesSearch = searchTerm === '' ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-warning text-warning-foreground';
      case 'respondido': return 'bg-success text-success-foreground';
      case 'en_revision': return 'bg-primary text-primary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente': return Clock;
      case 'respondido': return CheckCircle;
      case 'en_revision': return Eye;
      default: return MessageCircle;
    }
  };

  const stats = {
    total: messages.length,
    pendiente: messages.filter(m => m.status === 'pendiente').length,
    respondido: messages.filter(m => m.status === 'respondido').length,
    en_revision: messages.filter(m => m.status === 'en_revision').length
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Mensajes</h1>
          <p className="text-muted-foreground">
            Gestiona todas las comunicaciones con tus clientes
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-warning">{stats.pendiente}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Respondidos</p>
                <p className="text-2xl font-bold text-success">{stats.respondido}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Revisión</p>
                <p className="text-2xl font-bold text-primary">{stats.en_revision}</p>
              </div>
              <Eye className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por contenido o nombre del cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="respondido">Respondidos</SelectItem>
                <SelectItem value="en_revision">En Revisión</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Mensajes ({filteredMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron mensajes con los filtros aplicados'
                : 'No hay mensajes todavía'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => {
                const client = clients.find(c => c.id === message.clientId);
                if (!client) return null;

                const StatusIcon = getStatusIcon(message.status);

                return (
                  <div
                    key={message.id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Client Avatar */}
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary-foreground">
                            {client.firstName[0]}{client.lastName[0]}
                          </span>
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-foreground">
                              {client.firstName} {client.lastName}
                            </h3>
                            <Badge className={getStatusColor(message.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {message.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(message.timestamp, 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                            {!message.isFromAdvisor && (
                              <Badge variant="outline">Del cliente</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.content}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {!message.isFromAdvisor && message.status === 'pendiente' && (
                          <Select
                            value={message.status}
                            onValueChange={(value) => updateMessageStatus(message.id, value as any)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_revision">En Revisión</SelectItem>
                              <SelectItem value="respondido">Respondido</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/clients/${client.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Cliente
                          </Link>
                        </Button>
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