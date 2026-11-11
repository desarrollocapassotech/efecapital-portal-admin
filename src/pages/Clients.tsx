import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MessageCircle, Eye, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { Client } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useShowPreviewModules } from '@/stores/previewStore';
import { CopyableText } from '@/components/CopyButton';
import { ClientCombobox } from '@/components/ClientCombobox';
import { PageHeader } from '@/components/PageHeader';
import { buildBrokerOptions, formatBrokers, sameBroker } from '@/lib/brokers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BrokerTags = ({ brokers }: { brokers: string[] }) =>
  brokers.length === 0 ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className="inline-flex flex-wrap gap-1">
      {brokers.map((broker) => (
        <span key={broker} className="border border-border bg-secondary px-1.5 py-0.5 text-xs font-medium">
          {broker}
        </span>
      ))}
    </span>
  );

const ALL = '__all__';

type Filters = { clientId: string; profile: string; broker: string };

const EMPTY_FILTERS: Filters = { clientId: '', profile: ALL, broker: ALL };

const PROFILE_OPTIONS = [
  { value: 'conservador', label: 'Conservador' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'agresivo', label: 'Agresivo' },
];


type SortKey = 'name' | 'profile' | 'broker' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const SORT_LABELS: Record<SortKey, string> = {
  createdAt: 'Fecha de alta',
  name: 'Cliente',
  profile: 'Perfil',
  broker: 'Broker',
};

// Perfil se ordena por nivel de riesgo, no alfabéticamente
const PROFILE_RANK: Record<string, number> = { conservador: 0, moderado: 1, agresivo: 2 };

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

const fullName = (client: Client) => `${client.firstName} ${client.lastName}`.trim();

const toTime = (value: unknown) => {
  const time = value instanceof Date ? value.getTime() : new Date(value as string).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const compareClients = (a: Client, b: Client, key: SortKey) => {
  switch (key) {
    case 'profile':
      return (
        (PROFILE_RANK[a.investorProfile?.toLowerCase()] ?? 99) -
        (PROFILE_RANK[b.investorProfile?.toLowerCase()] ?? 99)
      );
    case 'broker':
      return collator.compare(formatBrokers(a.brokers), formatBrokers(b.brokers));
    case 'createdAt':
      return toTime(a.createdAt) - toTime(b.createdAt);
    default:
      return collator.compare(fullName(a), fullName(b));
  }
};

const formatCreatedAt = (value: unknown) => {
  const time = toTime(value);
  return time ? format(new Date(time), 'dd/MM/yyyy', { locale: es }) : '—';
};

const SortableHead = ({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) => {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`-ml-2 inline-flex items-center gap-1.5 px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'opacity-50'}`} />
      </button>
    </TableHead>
  );
};

export const Clients = () => {
  const navigate = useNavigate();
  const { clients, brokers, deleteClient, messages, documents } = useDataStore();
  const showPreviewModules = useShowPreviewModules();

  // Filtros: `draft` es lo que se edita en el formulario; `applied` se usa al filtrar (se actualiza con "Buscar")
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const brokerOptions = useMemo(
    () => buildBrokerOptions(brokers.map((b) => b.name), clients.flatMap((c) => c.brokers)),
    [brokers, clients]
  );

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    setAppliedFilters(draftFilters);
  };

  const removeFilter = (key: keyof Filters) => {
    setAppliedFilters((prev) => ({ ...prev, [key]: EMPTY_FILTERS[key] }));
    setDraftFilters((prev) => ({ ...prev, [key]: EMPTY_FILTERS[key] }));
  };

  const clearFilters = () => {
    setAppliedFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
  };

  const activeFilters = (
    [
      appliedFilters.clientId && {
        key: 'clientId',
        label: 'Cliente',
        value: (() => {
          const client = clients.find((c) => c.id === appliedFilters.clientId);
          return client ? fullName(client) : 'Cliente eliminado';
        })(),
      },
      appliedFilters.profile !== ALL && {
        key: 'profile',
        label: 'Perfil',
        value: PROFILE_OPTIONS.find((p) => p.value === appliedFilters.profile)?.label ?? appliedFilters.profile,
      },
      appliedFilters.broker !== ALL && { key: 'broker', label: 'Broker', value: appliedFilters.broker },
    ] as const
  ).filter(Boolean) as { key: keyof Filters; label: string; value: string }[];

  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (appliedFilters.clientId && client.id !== appliedFilters.clientId) return false;
      if (appliedFilters.profile !== ALL && client.investorProfile?.toLowerCase() !== appliedFilters.profile) {
        return false;
      }
      // Un cliente con varios brokers aparece al filtrar por cualquiera de ellos
      if (appliedFilters.broker !== ALL && !client.brokers.some((b) => sameBroker(b, appliedFilters.broker))) {
        return false;
      }
      return true;
    });
  }, [clients, appliedFilters]);

  // Orden: por defecto fecha de alta, más recientes primero
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Fecha de alta arranca por la más reciente; el resto, A→Z
      setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedClients = useMemo(() => {
    const factor = sortDirection === 'asc' ? 1 : -1;
    return [...filteredClients].sort(
      (a, b) =>
        compareClients(a, b, sortKey) * factor ||
        // desempate siempre alfabético por nombre
        collator.compare(fullName(a), fullName(b))
    );
  }, [filteredClients, sortKey, sortDirection]);

  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient(clientId);
    } catch (error) {
      console.error('Error al eliminar cliente', error);
    }
  };

  const getProfileColor = (profile: string) => {
    // El formulario guarda el perfil en minúsculas; comparar sin distinguir mayúsculas
    switch (profile?.toLowerCase()) {
      case 'conservador': return 'bg-primary/10 text-primary border-primary/20';
      case 'moderado': return 'bg-gold/10 text-gold border-gold/30';
      case 'agresivo': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getClientStats = (clientId: string) => {
    const clientMessages = messages.filter(m => m.clientId === clientId);
    const clientDocuments = documents.filter(
      (document) => document.visibility === 'all' || document.clientIds.includes(clientId)
    );
    const pendingMessages = clientMessages.filter(m => m.status === 'pendiente' && !m.isFromAdvisor);

    return {
      totalMessages: clientMessages.length,
      pendingMessages: pendingMessages.length,
      totalDocuments: clientDocuments.length
    };
  };

  return (
    <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Clientes' }]}
        title="Gestión de Clientes"
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Link>
          </Button>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="filter-client" className="eyebrow">Cliente</Label>
              <ClientCombobox
                id="filter-client"
                clients={clients}
                value={draftFilters.clientId}
                onChange={(clientId) => setDraftFilters((prev) => ({ ...prev, clientId }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-profile" className="eyebrow">Perfil</Label>
              <Select
                value={draftFilters.profile}
                onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, profile: value }))}
              >
                <SelectTrigger id="filter-profile" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {PROFILE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-broker" className="eyebrow">Broker</Label>
              <Select
                value={draftFilters.broker}
                onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, broker: value }))}
              >
                <SelectTrigger id="filter-broker" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {brokerOptions.map((broker) => (
                    <SelectItem key={broker} value={broker}>
                      {broker}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </form>

          {/* Filtros aplicados */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {activeFilters.map((filter) => (
                <span
                  key={filter.key}
                  className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 py-1 pl-2.5 pr-1 text-xs text-foreground"
                >
                  <span className="text-muted-foreground">{filter.label}:</span>
                  <span className="font-medium">{filter.value}</span>
                  <button
                    type="button"
                    onClick={() => removeFilter(filter.key)}
                    className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`Quitar filtro ${filter.label}`}
                    title="Quitar filtro"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {activeFilters.length > 1 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients List (Responsive: Cards on mobile, Table on desktop) */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {activeFilters.length > 0 ? 'No se encontraron clientes con estos filtros' : 'No hay clientes registrados'}
            </div>
          ) : isMobile ? (
            // Vista en tarjetas para móviles
            <div className="space-y-4">
              {/* Orden en móvil */}
              <div className="flex items-center gap-2">
                <Select value={sortKey} onValueChange={(value) => handleSort(value as SortKey)}>
                  <SelectTrigger className="h-9 flex-1 text-sm" aria-label="Ordenar por">
                    <span className="mr-1 text-muted-foreground">Ordenar por:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {SORT_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
                  aria-label={sortDirection === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
                  title={sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                >
                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </div>

              {sortedClients.map((client) => {
                const stats = getClientStats(client.id);
                return (
                  <Card key={client.id} className="overflow-hidden shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {client.firstName} {client.lastName}
                        </div>
                        <Badge variant="outline" className={getProfileColor(client.investorProfile)}>
                          {client.investorProfile}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex min-w-0 items-center gap-1">
                        <strong>Email:</strong> <CopyableText value={client.email} label="Email" />
                      </div>
                      <div className="flex min-w-0 items-center gap-1">
                        <strong>Teléfono:</strong> <CopyableText value={client.phone} label="Teléfono" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <strong>{client.brokers.length > 1 ? 'Brokers:' : 'Broker:'}</strong>
                        <BrokerTags brokers={client.brokers} />
                      </div>
                      <div><strong>Alta:</strong> {formatCreatedAt(client.createdAt)}</div>

                      {/* Acciones */}
                      <div className="flex flex-wrap justify-end gap-2 pt-3">
                        {showPreviewModules && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/messages/${client.id}`)}
                            className="gap-1 text-xs sm:text-sm"
                          >
                            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden xs:inline">Chat</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="text-xs sm:text-sm"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}/edit`)}
                          className="text-xs sm:text-sm"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán todos los datos
                                del cliente incluyendo mensajes, documentos y actividades.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteClient(client.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Vista en tabla para desktop
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Fecha de alta" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Cliente" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead>Contacto</TableHead>
                    <SortableHead label="Perfil" sortKey="profile" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Broker" sortKey="broker" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedClients.map((client) => {
                    const stats = getClientStats(client.id);

                    return (
                      <TableRow key={client.id}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {formatCreatedAt(client.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {client.firstName} {client.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <CopyableText value={client.email} label="Email" className="text-sm" />
                            <CopyableText value={client.phone} label="Teléfono" className="text-sm text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getProfileColor(client.investorProfile)}
                          >
                            {client.investorProfile}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <BrokerTags brokers={client.brokers} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {showPreviewModules && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/messages/${client.id}`)}
                                className="gap-1"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Chat
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminarán todos los datos
                                    del cliente incluyendo mensajes, documentos y actividades.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};