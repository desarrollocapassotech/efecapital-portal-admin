import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit, Loader2, Package, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Servicio } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHeader } from '@/components/PageHeader';
import { SortableHead, type SortDirection } from '@/components/SortableHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { formatoMoneda } from '@/lib/faktia';
import { montoAInput, parsearMonto } from '@/lib/suscripciones';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

type SortKey = 'nombre' | 'precio';
const SORT_LABELS: Record<SortKey, string> = { nombre: 'Servicio', precio: 'Precio' };

/** Alta y edición de un servicio. */
const ServicioDialog = ({
  servicio,
  open,
  onOpenChange,
}: {
  servicio: Servicio | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const { servicios, addServicio, updateServicio } = useDataStore();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se reinicia cada vez que se abre
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  const clave = open ? servicio?.id ?? 'nuevo' : null;
  if (clave !== abiertoPara) {
    setAbiertoPara(clave);
    setNombre(servicio?.nombre ?? '');
    setPrecio(montoAInput(servicio?.precio));
    setError('');
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    const p = parsearMonto(precio);
    if (!n) return setError('Indicá el nombre del servicio');
    if (servicios.some((s) => s.id !== servicio?.id && collator.compare(s.nombre, n) === 0)) {
      return setError('Ya existe un servicio con ese nombre');
    }
    if (!(p > 0)) return setError('Indicá un precio válido (ej. 79900 o 79.900,50)');
    setGuardando(true);
    try {
      if (servicio) await updateServicio(servicio.id, { nombre: n, precio: p });
      else await addServicio({ nombre: n, precio: p });
      toast.success(servicio ? 'Servicio actualizado' : 'Servicio creado');
      onOpenChange(false);
    } catch {
      toast.error('No se pudo guardar el servicio');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={guardar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{servicio ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
            <DialogDescription>
              El nombre es el texto que va en la factura. Cambiar el precio no afecta facturas ya emitidas.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="servicio-nombre">Nombre</Label>
            <Input
              id="servicio-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Asesoramiento por única vez"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="servicio-precio">Precio (ARS)</Label>
            <Input
              id="servicio-precio"
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="79900"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** ABM de servicios de pago único (/services). Se eligen al crear una factura. */
export const Services = () => {
  const isMobile = useIsMobile();
  const { servicios, deleteServicio } = useDataStore();
  const [dialog, setDialog] = useState<{ open: boolean; servicio: Servicio | null }>({ open: false, servicio: null });

  const [sortKey, setSortKey] = useState<SortKey>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const ordenados = useMemo(() => {
    const f = sortDirection === 'asc' ? 1 : -1;
    return [...servicios].sort(
      (a, b) =>
        (sortKey === 'precio' ? (a.precio - b.precio) * f : collator.compare(a.nombre, b.nombre) * f) ||
        collator.compare(a.nombre, b.nombre)
    );
  }, [servicios, sortKey, sortDirection]);

  const eliminar = async (s: Servicio) => {
    try {
      await deleteServicio(s.id);
      toast.success(`Servicio ${s.nombre} eliminado`);
    } catch {
      toast.error('No se pudo eliminar el servicio');
    }
  };

  const acciones = (s: Servicio) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialog({ open: true, servicio: s })}
        title="Editar"
        aria-label={`Editar ${s.nombre}`}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            title="Eliminar"
            aria-label={`Eliminar ${s.nombre}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {s.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deja de aparecer al crear facturas. Las facturas que ya se emitieron con este servicio no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => eliminar(s)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Servicios' }]}
        title="Gestión de Servicios"
        description="Servicios de pago único. Se eligen al crear una factura y no entran en la facturación mensual."
        actions={
          <Button className="w-full sm:w-auto" onClick={() => setDialog({ open: true, servicio: null })}>
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Servicios ({servicios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {servicios.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <Package className="h-8 w-8 opacity-50" />
              <p>Todavía no hay servicios cargados.</p>
              <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, servicio: null })}>
                Crear el primero
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
                >
                  {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </div>
              {ordenados.map((s) => (
                <Card key={s.id}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{s.nombre}</span>
                      <span className="tabular-nums">{formatoMoneda(s.precio)}</span>
                    </div>
                    {acciones(s)}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Servicio" sortKey="nombre" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHead label="Precio" sortKey="precio" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="tabular-nums">{formatoMoneda(s.precio)}</TableCell>
                    <TableCell>{acciones(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ServicioDialog
        servicio={dialog.servicio}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
};
