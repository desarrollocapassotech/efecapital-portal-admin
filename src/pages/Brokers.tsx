import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Building2, Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Broker } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHeader } from '@/components/PageHeader';
import { SortableHead, type SortDirection } from '@/components/SortableHead';
import { BrokerDetailSheet } from '@/components/BrokerDetailSheet';
import { EmailLink, WhatsAppLink } from '@/components/ContactLinks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { CONDICIONES_IVA } from '@/lib/faktia';
import { sameBroker } from '@/lib/brokers';

type SortKey = 'name' | 'clientes';
const SORT_LABELS: Record<SortKey, string> = { name: 'Broker', clientes: 'Clientes' };

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

const condicionIva = (b: Broker) =>
  b.fiscal ? CONDICIONES_IVA.find((c) => c.value === b.fiscal!.condicionIva)?.label ?? b.fiscal.condicionIva : null;

export const Brokers = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { brokers, clients, deleteBroker } = useDataStore();
  const [detalle, setDetalle] = useState<Broker | null>(null);

  const clientesPorBroker = useMemo(() => {
    const mapa = new Map<string, number>();
    brokers.forEach((b) => mapa.set(b.id, clients.filter((c) => c.brokers.some((n) => sameBroker(n, b.name))).length));
    return mapa;
  }, [brokers, clients]);

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection(key === 'clientes' ? 'desc' : 'asc');
    }
  };

  const ordenados = useMemo(() => {
    const f = sortDirection === 'asc' ? 1 : -1;
    return [...brokers].sort(
      (a, b) =>
        (sortKey === 'clientes'
          ? ((clientesPorBroker.get(a.id) ?? 0) - (clientesPorBroker.get(b.id) ?? 0)) * f
          : collator.compare(a.name, b.name) * f) || collator.compare(a.name, b.name)
    );
  }, [brokers, sortKey, sortDirection, clientesPorBroker]);

  const eliminar = async (b: Broker) => {
    try {
      await deleteBroker(b.id);
      toast.success(`Broker ${b.name} eliminado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el broker');
    }
  };

  const botonEliminar = (b: Broker) => {
    const enUso = clientesPorBroker.get(b.id) ?? 0;
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            title="Eliminar"
            aria-label={`Eliminar ${b.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {b.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {enUso > 0
                ? `No se puede eliminar: ${enUso === 1 ? 'lo tiene asignado 1 cliente' : `lo tienen asignado ${enUso} clientes`}. Quitalo de sus fichas primero.`
                : 'Se borra de la lista de brokers. Las facturas que ya se le emitieron siguen en Faktia.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {enUso === 0 && (
              <AlertDialogAction
                onClick={() => eliminar(b)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const acciones = (b: Broker) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setDetalle(b)} title="Ver detalle" aria-label={`Ver detalle de ${b.name}`}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/brokers/${b.id}/edit`)} title="Editar" aria-label={`Editar ${b.name}`}>
        <Edit className="h-4 w-4" />
      </Button>
      {botonEliminar(b)}
    </div>
  );

  const fiscalBadge = (b: Broker) => (
    <Badge
      variant="outline"
      className={`w-24 justify-center ${b.fiscal ? 'border-success/30 bg-success/10 text-success' : 'border-gold/30 bg-gold/10 text-gold'}`}
    >
      {b.fiscal ? 'Completos' : 'Faltan'}
    </Badge>
  );

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Brokers' }]}
        title="Gestión de Brokers"
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/brokers/new">
              <Plus className="h-4 w-4" />
              Nuevo broker
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Brokers ({brokers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {brokers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 opacity-50" />
              <p>Todavía no hay brokers cargados</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/brokers/new">Agregar el primero</Link>
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Select value={sortKey} onValueChange={(v) => handleSort(v as SortKey)}>
                  <SelectTrigger className="h-9 flex-1 text-sm" aria-label="Ordenar por">
                    <span className="mr-1 text-muted-foreground">Ordenar por:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {SORT_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  aria-label={sortDirection === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
                  title={sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                >
                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </div>
              {ordenados.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b.name}</span>
                      {fiscalBadge(b)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <strong>CUIT:</strong> <span className="tabular-nums">{b.fiscal?.numeroDocumento ?? '—'}</span>
                    </div>
                    <div>
                      <strong>Condición IVA:</strong> {condicionIva(b) ?? '—'}
                    </div>
                    <div>
                      <strong>Clientes:</strong> {clientesPorBroker.get(b.id) ?? 0}
                    </div>
                    <div className="pt-3">
                      {acciones(b)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Broker" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead>CUIT</TableHead>
                    <TableHead>Condición IVA</TableHead>
                    <TableHead>Contacto</TableHead>
                    <SortableHead label="Clientes" sortKey="clientes" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead className="text-center">Datos fiscales</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenados.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">{b.fiscal?.numeroDocumento ?? '—'}</TableCell>
                      <TableCell className="text-sm">{condicionIva(b) ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {b.email ? <EmailLink email={b.email} /> : null}
                          {b.phone ? <WhatsAppLink telefono={b.phone} className="text-muted-foreground" /> : null}
                          {!b.email && !b.phone && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{clientesPorBroker.get(b.id) ?? 0}</TableCell>
                      <TableCell className="text-center">
                        {fiscalBadge(b)}
                      </TableCell>
                      <TableCell>
                        {acciones(b)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BrokerDetailSheet
        broker={detalle}
        clientes={detalle ? clients.filter((c) => c.brokers.some((n) => sameBroker(n, detalle.name))) : []}
        onOpenChange={(open) => !open && setDetalle(null)}
      />
    </div>
  );
};
