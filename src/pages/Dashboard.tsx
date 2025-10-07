import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Users,
  MessageCircle,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const Dashboard = () => {
  const { clients, messages, notifications } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDays, setFilterDays] = useState<string>('all');
  const [filterMessages, setFilterMessages] = useState<string>('all');

  // Statistics
  const totalClients = clients.length;
  const pendingMessages = messages.filter(
    (m) => !m.isFromAdvisor && (!m.visto || m.status === 'pendiente')
  ).length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const clientsNoContact = clients.filter(
    (c) => differenceInDays(new Date(), c.lastContact) > 7
  ).length;

  // Filtered clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      searchTerm === '' ||
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const daysSinceContact = differenceInDays(new Date(), client.lastContact);
    const matchesDays =
      filterDays === 'all' ||
      (filterDays === '7' && daysSinceContact > 7) ||
      (filterDays === '14' && daysSinceContact > 14) ||
      (filterDays === '30' && daysSinceContact > 30);

    const clientPendingMessages = messages.filter(
      (m) =>
        m.clientId === client.id && m.status === 'pendiente' && !m.isFromAdvisor
    ).length;
    const matchesMessages =
      filterMessages === 'all' ||
      (filterMessages === 'pending' && clientPendingMessages > 0);

    return matchesSearch && matchesDays && matchesMessages;
  });

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'Conservador':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Moderado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Agresivo':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getContactStatusColor = (lastContact: Date) => {
    const days = differenceInDays(new Date(), lastContact);
    if (days <= 7) return 'text-success';
    if (days <= 14) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general de tu gestión financiera
          </p>
        </div>
        <div className="text-sm text-muted-foreground self-start sm:self-center">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">Cartera completa</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Pendientes</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingMessages}</div>
            <p className="text-xs text-muted-foreground">Requieren respuesta</p>
          </CardContent>
          {pendingMessages > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 min-w-[1.5rem] px-1 text-xs leading-none flex items-center justify-center"
            >
              {pendingMessages > 99 ? '99+' : pendingMessages}
            </Badge>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unreadNotifications}</div>
            <p className="text-xs text-muted-foreground">Sin revisar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Contacto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{clientsNoContact}</div>
            <p className="text-xs text-muted-foreground">Más de 7 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, apellido o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por contacto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                <SelectItem value="7">Sin contacto +7 días</SelectItem>
                <SelectItem value="14">Sin contacto +14 días</SelectItem>
                <SelectItem value="30">Sin contacto +30 días</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMessages} onValueChange={setFilterMessages}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar mensajes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Con mensajes pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clientes ({filteredClients.length})
            </span>
            <Button asChild>
              <Link to="/clients/new">Nuevo Cliente</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron clientes con los filtros aplicados
              </div>
            ) : (
              filteredClients.map((client) => {
                const daysSinceContact = differenceInDays(new Date(), client.lastContact);
                const clientPendingMessages = messages.filter(
                  (m) =>
                    m.clientId === client.id && m.status === 'pendiente' && !m.isFromAdvisor
                ).length;

                return (
                  <div
                    key={client.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Avatar + Nombre */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">
                          {client.firstName[0]}
                          {client.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-sm sm:text-base">
                          {client.firstName} {client.lastName}
                        </h3>
                      </div>
                    </div>

                    {/* Datos */}
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <Badge variant="outline" className={getProfileColor(client.investorProfile)}>
                        {client.investorProfile}
                      </Badge>
                      <span
                        className={`text-xs flex items-center gap-1 ${getContactStatusColor(
                          client.lastContact
                        )}`}
                      >
                        <Clock className="h-3 w-3" />
                        Hace {daysSinceContact} días
                      </span>
                      {clientPendingMessages > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {clientPendingMessages} mensaje{clientPendingMessages > 1 ? 's' : ''} pendiente{clientPendingMessages > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Botón Ver Perfil */}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="self-start sm:self-center"
                    >
                      <Link to={`/clients/${client.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Perfil
                      </Link>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};