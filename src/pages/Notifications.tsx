import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  MessageCircle, 
  FileText, 
  DollarSign,
  Trash2
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Notifications = () => {
  const { notifications, clients, markNotificationAsRead } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredNotifications = notifications.filter(notification => {
    const client = notification.clientId ? clients.find(c => c.id === notification.clientId) : null;
    
    const matchesSearch = searchTerm === '' ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client && (
        client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      ));

    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'read' && notification.read) ||
      (statusFilter === 'unread' && !notification.read);

    return matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mensaje': return MessageCircle;
      case 'informe': return FileText;
      case 'capital': return DollarSign;
      default: return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mensaje': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'informe': return 'bg-green-100 text-green-800 border-green-200';
      case 'capital': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mensaje': return 'Mensaje';
      case 'informe': return 'Informe';
      case 'capital': return 'Capital';
      default: return type;
    }
  };

  const markAsRead = (id: string) => {
    markNotificationAsRead(id);
  };

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }
    });
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    mensaje: notifications.filter(n => n.type === 'mensaje').length,
    informe: notifications.filter(n => n.type === 'informe').length,
    capital: notifications.filter(n => n.type === 'capital').length
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Centro de Notificaciones</h1>
          <p className="text-muted-foreground">
            Mantente al día con todas las actividades importantes
          </p>
        </div>
        <Button onClick={markAllAsRead} disabled={stats.unread === 0}>
          <Check className="h-4 w-4 mr-2" />
          Marcar Todas como Leídas
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sin Leer</p>
                <p className="text-2xl font-bold text-warning">{stats.unread}</p>
              </div>
              <Bell className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mensajes</p>
                <p className="text-2xl font-bold text-blue-600">{stats.mensaje}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Informes</p>
                <p className="text-2xl font-bold text-success">{stats.informe}</p>
              </div>
              <FileText className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Capital</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.capital}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
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
                  placeholder="Buscar por título, mensaje o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="mensaje">Mensajes</SelectItem>
                <SelectItem value="informe">Informes</SelectItem>
                <SelectItem value="capital">Capital</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Sin leer</SelectItem>
                <SelectItem value="read">Leídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Notificaciones ({filteredNotifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'No se encontraron notificaciones con los filtros aplicados'
                : 'No hay notificaciones todavía'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const client = notification.clientId ? clients.find(c => c.id === notification.clientId) : null;
                const TypeIcon = getTypeIcon(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      notification.read 
                        ? 'border-border bg-background' 
                        : 'border-primary/20 bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          notification.read 
                            ? 'bg-muted' 
                            : 'bg-primary/10'
                        }`}>
                          <TypeIcon className={`h-5 w-5 ${
                            notification.read 
                              ? 'text-muted-foreground' 
                              : 'text-primary'
                          }`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className={`font-medium ${
                              notification.read 
                                ? 'text-foreground' 
                                : 'text-foreground font-semibold'
                            }`}>
                              {notification.title}
                            </h3>
                            <Badge className={getTypeColor(notification.type)}>
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.read && (
                              <Badge variant="default" className="h-5 px-2 text-xs">
                                Nuevo
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>
                              {format(notification.timestamp, 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                            {client && (
                              <span>
                                Cliente: {client.firstName} {client.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Marcar Leída
                          </Button>
                        )}
                        {client && (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/clients/${client.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Cliente
                            </Link>
                          </Button>
                        )}
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