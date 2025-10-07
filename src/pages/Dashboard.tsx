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
  Phone,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export const Dashboard = () => {
  const { clients, messages, notifications, updateClient, addActivity } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDays, setFilterDays] = useState<string>('all');
  const [filterMessages, setFilterMessages] = useState<string>('all');
  const { toast } = useToast();

  // Statistics
  const totalClients = clients.length;
  const pendingMessages = messages.filter(
    (m) => !m.isFromAdvisor && (!m.visto || m.status === 'pendiente')
  ).length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const clientsNoContact = clients.filter(
    (c) => differenceInDays(new Date(), c.lastContact) > 7
  ).length;

  const totalMessages = messages.length;
  const totalNotifications = notifications.length;

  const clientsContactedLast30Days = clients.filter(
    (c) => differenceInDays(new Date(), c.lastContact) <= 30
  ).length;
  const activePortfolioPercentage = totalClients
    ? Math.round((clientsContactedLast30Days / totalClients) * 100)
    : 0;

  const clientsCreatedLast30Days = clients.filter(
    (c) => differenceInDays(new Date(), c.createdAt) <= 30
  ).length;
  const clientsCreatedPrevious30Days = clients.filter((c) => {
    const days = differenceInDays(new Date(), c.createdAt);
    return days > 30 && days <= 60;
  }).length;
  const clientsGrowthDifference = clientsCreatedLast30Days - clientsCreatedPrevious30Days;
  const clientsGrowthLabel =
    clientsGrowthDifference === 0
      ? 'Sin variación frente a los 30 días previos'
      : `${clientsGrowthDifference > 0 ? '+' : ''}${clientsGrowthDifference} frente al período previo`;

  const pendingMessagesPercentage = totalMessages
    ? Math.round((pendingMessages / totalMessages) * 100)
    : 0;
  const advisorRepliesLast7Days = messages.filter(
    (m) => m.isFromAdvisor && differenceInDays(new Date(), m.timestamp) <= 7
  ).length;

  const unreadNotificationsPercentage = totalNotifications
    ? Math.round((unreadNotifications / totalNotifications) * 100)
    : 0;
  const notificationsCleared = totalNotifications - unreadNotifications;

  const clientsNoContactPercentage = totalClients
    ? Math.round((clientsNoContact / totalClients) * 100)
    : 0;
  const clientsCriticalNoContact = clients.filter(
    (c) => differenceInDays(new Date(), c.lastContact) > 14
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

  const getPhoneHref = (phone: string) => {
    const sanitized = phone.replace(/\s+/g, '');
    return `tel:${sanitized}`;
  };

  const handleScheduleReminder = (clientId: string, fullName: string) => {
    const reminderDate = addDays(new Date(), 3);

    addActivity({
      clientId,
      type: 'actualizacion',
      title: 'Recordatorio agendado',
      description: `Seguimiento planificado para ${format(reminderDate, "d 'de' MMMM", {
        locale: es,
      })}.`,
      timestamp: new Date(),
    });

    toast({
      title: 'Recordatorio creado',
      description: `Programaste un recordatorio rápido para ${fullName}.`,
    });
  };

  const handleMarkAsContacted = async (clientId: string, fullName: string) => {
    try {
      const now = new Date();
      await updateClient(clientId, { lastContact: now });

      addActivity({
        clientId,
        type: 'actualizacion',
        title: 'Contacto registrado',
        description: `Se marcó contacto con ${fullName}.`,
        timestamp: now,
      });

      toast({
        title: 'Contacto actualizado',
        description: `${fullName} se marcó como contactado hoy.`,
      });
    } catch (error) {
      console.error('Error al actualizar el último contacto', error);
      toast({
        title: 'No se pudo actualizar',
        description: 'Intenta nuevamente más tarde.',
        variant: 'destructive',
      });
    }
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
            <div className="mt-4 space-y-2">
              <Progress value={activePortfolioPercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{clientsContactedLast30Days} con contacto &lt; 30 días</span>
                <span>{activePortfolioPercentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{clientsGrowthLabel}</p>
            </div>
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
            <div className="mt-4 space-y-2">
              <Progress value={pendingMessagesPercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalMessages} mensajes totales</span>
                <span>{pendingMessagesPercentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {advisorRepliesLast7Days} respuestas del asesor en 7 días
              </p>
            </div>
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
            <div className="mt-4 space-y-2">
              <Progress value={unreadNotificationsPercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalNotifications} generadas</span>
                <span>{unreadNotificationsPercentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {notificationsCleared} gestionadas a tiempo
              </p>
            </div>
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
            <div className="mt-4 space-y-2">
              <Progress value={clientsNoContactPercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>de {totalClients} clientes</span>
                <span>{clientsNoContactPercentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {clientsCriticalNoContact} sin contacto &gt; 14 días
              </p>
            </div>
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
                  <div className="flex flex-wrap gap-2 self-start sm:self-center">
                    <Button asChild variant="secondary" size="sm">
                      <a href={getPhoneHref(client.phone)}>
                        <Phone className="h-4 w-4 mr-1" />
                        Llamar
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleScheduleReminder(
                          client.id,
                          `${client.firstName} ${client.lastName}`
                        )
                      }
                    >
                      <CalendarClock className="h-4 w-4 mr-1" />
                      Recordatorio
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleMarkAsContacted(
                          client.id,
                          `${client.firstName} ${client.lastName}`
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Contactado
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <Link to={`/clients/${client.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Perfil
                      </Link>
                    </Button>
                  </div>
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