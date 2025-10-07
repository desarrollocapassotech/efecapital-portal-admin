import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, MessageCircle, AlertTriangle, Clock, Phone, Bell } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Moderado':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Agresivo':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getContactStatusColor = (lastContact: Date) => {
    const days = differenceInDays(new Date(), lastContact);
    if (days <= 7) return 'text-emerald-600';
    if (days <= 14) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getPhoneHref = (phone: string) => {
    const sanitized = phone.replace(/\s+/g, '');
    return `tel:${sanitized}`;
  };

  const formatDaysSinceContact = (days: number) => {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    return `Hace ${days} días`;
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

  const keyMetrics = [
    {
      title: 'Clientes activos',
      value: totalClients,
      helper: 'Gestionados en tu cartera',
      icon: Users,
    },
    {
      title: 'Mensajes pendientes',
      value: pendingMessages,
      helper: 'A la espera de respuesta',
      icon: MessageCircle,
    },
    {
      title: 'Sin contacto 7+ días',
      value: clientsNoContact,
      helper: 'Clientes para priorizar',
      icon: AlertTriangle,
    },
    {
      title: 'Notificaciones sin leer',
      value: unreadNotifications,
      helper: 'Acciones por revisar',
      icon: Bell,
    },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Un vistazo claro a tus prioridades de hoy
          </p>
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {keyMetrics.map(({ title, value, helper, icon: Icon }) => (
          <Card key={title} className="border border-border/60 bg-background/60 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border border-border/60 bg-background/60 shadow-none">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, apellido o email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-lg border-border/60 pl-9 text-sm"
              />
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className="h-10 w-full rounded-lg border-border/60 text-sm sm:w-48">
                <SelectValue placeholder="Contacto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                <SelectItem value="7">Sin contacto +7 días</SelectItem>
                <SelectItem value="14">Sin contacto +14 días</SelectItem>
                <SelectItem value="30">Sin contacto +30 días</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMessages} onValueChange={setFilterMessages}>
              <SelectTrigger className="h-10 w-full rounded-lg border-border/60 text-sm sm:w-48">
                <SelectValue placeholder="Mensajes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Con mensajes pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-background/60 shadow-none">
        <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Users className="h-4 w-4" /> Clientes ({filteredClients.length})
          </CardTitle>
          <Button asChild size="sm" className="rounded-lg">
            <Link to="/clients/new">Nuevo cliente</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {filteredClients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              No se encontraron clientes con los filtros actuales.
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
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground sm:text-base">
                      {client.firstName} {client.lastName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={`rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium ${getProfileColor(
                          client.investorProfile
                        )}`}
                      >
                        {client.investorProfile}
                      </Badge>
                      <span className={`flex items-center gap-1 ${getContactStatusColor(client.lastContact)}`}>
                        <Clock className="h-3 w-3" />
                        {formatDaysSinceContact(daysSinceContact)}
                      </span>
                      {clientPendingMessages > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          {clientPendingMessages} mensaje{clientPendingMessages > 1 ? 's' : ''} pendiente{clientPendingMessages > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="gap-1 rounded-lg">
                      <a href={getPhoneHref(client.phone)}>
                        <Phone className="h-4 w-4" />
                        Llamar
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        handleMarkAsContacted(
                          client.id,
                          `${client.firstName} ${client.lastName}`
                        )
                      }
                    >
                      Marcar contacto
                    </Button>
                    <Button asChild size="sm" className="rounded-lg">
                      <Link to={`/clients/${client.id}`}>Ver perfil</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};