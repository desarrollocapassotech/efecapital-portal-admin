import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Edit, Eye, Loader2, Plus, Search, Trash2, TrendingUp, UserPlus, X } from 'lucide-react';
import { SuscripcionIcon } from '@/components/icons/SuscripcionIcon';
import { toast } from 'sonner';
import type { Client, Plan } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHeader } from '@/components/PageHeader';
import { SortableHead, type SortDirection } from '@/components/SortableHead';
import { ClientCombobox } from '@/components/ClientCombobox';
import { ClientDetailSheet } from '@/components/ClientDetailSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { clienteHabilitado } from '@/lib/clientes';
import {
  estaAtrasado,
  etiquetaPeriodo,
  montoActual,
  montoAInput,
  parsearMonto,
  periodoActual,
  suscripcionActiva,
  conPlan,
  puedeAsignarPlan,
} from '@/lib/suscripciones';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const fullName = (c: Client) => `${c.firstName} ${c.lastName}`.trim();

// ── Estado de una suscripción ──────────────────────────────────────────────

type Estado = 'activa' | 'atrasada' | 'baja';
const ESTADOS: Record<Estado, { label: string; className: string }> = {
  activa: { label: 'Al día', className: 'border-success/30 bg-success/10 text-success' },
  atrasada: { label: 'Atrasada', className: 'border-gold/30 bg-gold/10 text-gold' },
  baja: { label: 'Baja', className: 'border-border bg-secondary text-foreground' },
};
const estadoDe = (c: Client, planes: Plan[]): Estado =>
  !suscripcionActiva(c.suscripcion) ? 'baja' : estaAtrasado(c.suscripcion, planes) ? 'atrasada' : 'activa';

const EstadoBadge = ({ estado }: { estado: Estado }) => (
  <Badge variant="outline" className={`w-24 justify-center ${ESTADOS[estado].className}`}>
    {ESTADOS[estado].label}
  </Badge>
);

// ── Diálogo: crear / renombrar plan ────────────────────────────────────────

const PlanDialog = ({ plan, open, onOpenChange }: { plan: Plan | null; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { addPlan, renamePlan, planes } = useDataStore();
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se reinicia al abrir
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  const clave = open ? plan?.id ?? 'nuevo' : null;
  if (clave !== abiertoPara) {
    setAbiertoPara(clave);
    setNombre(plan?.nombre ?? '');
    setPrecio(montoAInput(plan?.precio));
    setError('');
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    const p = parsearMonto(precio);
    if (!n) return setError('Indicá el nombre del plan');
    if (planes.some((x) => x.id !== plan?.id && collator.compare(x.nombre, n) === 0)) return setError('Ya existe un plan con ese nombre');
    if (!plan && !(p > 0)) return setError('Indicá un precio válido');
    setGuardando(true);
    try {
      if (plan) await renamePlan(plan.id, n);
      else await addPlan({ nombre: n, precio: p });
      toast.success(plan ? 'Plan actualizado' : 'Plan creado');
      onOpenChange(false);
    } catch {
      toast.error('No se pudo guardar el plan');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={guardar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{plan ? 'Renombrar plan' : 'Nuevo plan'}</DialogTitle>
            {plan && <DialogDescription>Para cambiar el precio usá “Actualizar precio”.</DialogDescription>}
          </DialogHeader>
          <div>
            <Label htmlFor="plan-nombre">Nombre</Label>
            <Input id="plan-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Estándar" autoFocus />
          </div>
          {!plan && (
            <div>
              <Label htmlFor="plan-precio">Precio mensual (ARS)</Label>
              <Input id="plan-precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="60000" />
            </div>
          )}
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

// ── Diálogo: actualizar precio y aplicarlo a clientes ──────────────────────

const PrecioDialog = ({ plan, onOpenChange }: { plan: Plan | null; onOpenChange: (o: boolean) => void }) => {
  const { clients, actualizarPrecioPlan } = useDataStore();
  const [precio, setPrecio] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const delPlan = useMemo(
    () =>
      plan
        ? clients
            .filter((c) => clienteHabilitado(c) && c.suscripcion?.planId === plan.id && suscripcionActiva(c.suscripcion))
            .sort((a, b) => collator.compare(fullName(a), fullName(b)))
        : [],
    [clients, plan]
  );

  // Al abrir: vienen tildados los que pagan el precio vigente; los atrasados, destildados
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  if ((plan?.id ?? null) !== abiertoPara) {
    setAbiertoPara(plan?.id ?? null);
    setPrecio('');
    setError('');
    setSeleccion(new Set(delPlan.filter((c) => plan && montoActual(c.suscripcion!) === plan.precio).map((c) => c.id)));
  }

  const alternar = (id: string, on: boolean) =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (on) s.add(id);
      else s.delete(id);
      return s;
    });

  const guardar = async () => {
    if (!plan) return;
    const p = parsearMonto(precio);
    if (!(p > 0)) return setError('Indicá el nuevo precio');
    setGuardando(true);
    try {
      await actualizarPrecioPlan(plan.id, p, [...seleccion]);
      toast.success(`Precio de ${plan.nombre} actualizado`, {
        description:
          seleccion.size > 0
            ? `${seleccion.size === 1 ? '1 cliente pasa' : `${seleccion.size} clientes pasan`} a ${formatoMoneda(p)} desde ${etiquetaPeriodo(periodoActual())}.`
            : 'No se cambió el monto de ningún cliente.',
      });
      onOpenChange(false);
    } catch {
      toast.error('No se pudo actualizar el precio');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={Boolean(plan)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {plan && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Actualizar precio · {plan.nombre}</DialogTitle>
              <DialogDescription>
                Precio vigente: {formatoMoneda(plan.precio)}. El nuevo monto rige desde {etiquetaPeriodo(periodoActual())}: la
                factura del mes anterior sale con el monto viejo.
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="nuevo-precio">Nuevo precio mensual (ARS)</Label>
              <Input
                id="nuevo-precio"
                inputMode="decimal"
                value={precio}
                onChange={(e) => {
                  setPrecio(e.target.value);
                  setError('');
                }}
                placeholder={montoAInput(plan.precio)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Aplicar a ({seleccion.size} de {delPlan.length})</span>
                {delPlan.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                    onClick={() =>
                      setSeleccion(seleccion.size === delPlan.length ? new Set() : new Set(delPlan.map((c) => c.id)))
                    }
                  >
                    {seleccion.size === delPlan.length ? 'Ninguno' : 'Todos'}
                  </button>
                )}
              </div>
              {delPlan.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay clientes activos en este plan.</p>
              ) : (
                <ul className="max-h-72 divide-y divide-border overflow-y-auto border border-border">
                  {delPlan.map((c) => {
                    const monto = montoActual(c.suscripcion!) ?? 0;
                    return (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-secondary">
                          <Checkbox checked={seleccion.has(c.id)} onCheckedChange={(v) => alternar(c.id, v === true)} />
                          <span className="flex-1">{fullName(c)}</span>
                          <span className="tabular-nums text-muted-foreground">{formatoMoneda(monto)}</span>
                          {monto < plan.precio && (
                            <span className="border border-gold/30 bg-gold/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-gold">
                              Atrasado
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Vienen tildados los que pagan el precio vigente. Los atrasados quedan con su monto salvo que los tildes.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={guardar} disabled={guardando}>
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Actualizar precio
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Diálogo: asignar el plan a varios clientes ─────────────────────────────

const AsignarDialog = ({ plan, onOpenChange }: { plan: Plan | null; onOpenChange: (o: boolean) => void }) => {
  const { clients, planes, guardarSuscripciones } = useDataStore();
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [aplicarPrecio, setAplicarPrecio] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Candidatos: sin suscripción o con una activa en otro plan / sin plan. Las bajas no (tienen meses cerrados).
  const candidatos = useMemo(
    () =>
      plan
        ? clients
            .filter((c) => clienteHabilitado(c) && puedeAsignarPlan(c.suscripcion) && c.suscripcion?.planId !== plan.id)
            .sort((a, b) => collator.compare(fullName(a), fullName(b)))
        : [],
    [clients, plan]
  );
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? candidatos.filter((c) => fullName(c).toLowerCase().includes(q)) : candidatos;
  }, [candidatos, busqueda]);

  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  if ((plan?.id ?? null) !== abiertoPara) {
    setAbiertoPara(plan?.id ?? null);
    setBusqueda('');
    setSeleccion(new Set());
    setAplicarPrecio(true);
  }

  const alternar = (id: string, on: boolean) =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (on) s.add(id);
      else s.delete(id);
      return s;
    });

  const conSuscripcion = candidatos.filter((c) => seleccion.has(c.id) && c.suscripcion).length;
  const nombrePlan = (id?: string | null) => planes.find((p) => p.id === id)?.nombre ?? 'Monto propio';

  const guardar = async () => {
    if (!plan || seleccion.size === 0) return;
    setGuardando(true);
    try {
      await guardarSuscripciones(
        candidatos
          .filter((c) => seleccion.has(c.id))
          .map((c) => ({ clientId: c.id, suscripcion: conPlan(c.suscripcion, plan, aplicarPrecio) }))
      );
      toast.success(`${seleccion.size === 1 ? '1 cliente asignado' : `${seleccion.size} clientes asignados`} a ${plan.nombre}`);
      onOpenChange(false);
    } catch {
      toast.error('No se pudo asignar el plan');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={Boolean(plan)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {plan && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Asignar clientes · {plan.nombre}</DialogTitle>
              <DialogDescription>
                Precio del plan: {formatoMoneda(plan.precio)}. Los que no tienen suscripción se dan de alta en{' '}
                {etiquetaPeriodo(periodoActual())} (se cobra completo) a ese precio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="eyebrow">Clientes ({seleccion.size} de {candidatos.length})</span>
                {visibles.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                    onClick={() => {
                      const todos = visibles.every((c) => seleccion.has(c.id));
                      setSeleccion((prev) => {
                        const s = new Set(prev);
                        visibles.forEach((c) => (todos ? s.delete(c.id) : s.add(c.id)));
                        return s;
                      });
                    }}
                  >
                    {visibles.every((c) => seleccion.has(c.id)) ? 'Ninguno' : 'Todos'}
                  </button>
                )}
              </div>
              {candidatos.length > 6 && (
                <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" />
              )}
              {candidatos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos los clientes activos ya tienen este plan.</p>
              ) : visibles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún cliente coincide con la búsqueda.</p>
              ) : (
                <ul className="max-h-72 divide-y divide-border overflow-y-auto border border-border">
                  {visibles.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-secondary">
                        <Checkbox checked={seleccion.has(c.id)} onCheckedChange={(v) => alternar(c.id, v === true)} />
                        <span className="flex-1">{fullName(c)}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.suscripcion ? (
                            <>
                              {nombrePlan(c.suscripcion.planId)} ·{' '}
                              <span className="tabular-nums">{formatoMoneda(montoActual(c.suscripcion) ?? 0)}</span>
                            </>
                          ) : (
                            'Sin suscripción'
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {conSuscripcion > 0 && (
              <label className="flex cursor-pointer items-start gap-2 border-l-2 border-gold bg-gold/10 p-3 text-sm">
                <Checkbox className="mt-0.5" checked={aplicarPrecio} onCheckedChange={(v) => setAplicarPrecio(v === true)} />
                <span>
                  Cobrarles {formatoMoneda(plan.precio)} desde {etiquetaPeriodo(periodoActual())} a los que ya tienen suscripción (
                  {conSuscripcion}). La factura del mes anterior sale con su monto actual. Si lo destildás, cambia solo el plan y
                  siguen con su monto.
                </span>
              </label>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={guardar} disabled={guardando || seleccion.size === 0}>
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Asignar{seleccion.size > 0 ? ` (${seleccion.size})` : ''}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Página ─────────────────────────────────────────────────────────────────

const ALL = '__all__';
const SIN_PLAN = '__sin_plan__';
type Filters = { clientId: string; planId: string; estado: string };
const EMPTY_FILTERS: Filters = { clientId: '', planId: ALL, estado: ALL };

type SortKey = 'name' | 'plan' | 'monto' | 'desde';
const SORT_LABELS: Record<SortKey, string> = { name: 'Cliente', plan: 'Plan', monto: 'Monto', desde: 'Desde' };

export const Plans = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { clients, planes, deletePlan } = useDataStore();

  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [precioPlan, setPrecioPlan] = useState<Plan | null>(null);
  const [asignarPlan, setAsignarPlan] = useState<Plan | null>(null);
  const [detalle, setDetalle] = useState<Client | null>(null);

  const suscriptos = useMemo(() => clients.filter((c) => c.suscripcion), [clients]);
  const nombrePlan = (id?: string | null) => planes.find((p) => p.id === id)?.nombre ?? 'Sin plan';

  const resumenPlan = (p: Plan) => {
    const activos = suscriptos.filter((c) => clienteHabilitado(c) && c.suscripcion!.planId === p.id && suscripcionActiva(c.suscripcion));
    const atrasados = activos.filter((c) => estaAtrasado(c.suscripcion, planes)).length;
    return { total: activos.length, atrasados };
  };

  const eliminarPlan = async (p: Plan) => {
    try {
      await deletePlan(p.id);
      toast.success(`Plan ${p.nombre} eliminado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el plan');
    }
  };

  // Filtros del listado de suscripciones
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const activeFilters = (
    [
      applied.clientId && {
        key: 'clientId',
        label: 'Cliente',
        value: (() => {
          const c = clients.find((x) => x.id === applied.clientId);
          return c ? fullName(c) : 'Cliente eliminado';
        })(),
      },
      applied.planId !== ALL && { key: 'planId', label: 'Plan', value: applied.planId === SIN_PLAN ? 'Sin plan' : nombrePlan(applied.planId) },
      applied.estado !== ALL && { key: 'estado', label: 'Estado', value: ESTADOS[applied.estado as Estado]?.label ?? applied.estado },
    ] as const
  ).filter(Boolean) as { key: keyof Filters; label: string; value: string }[];
  const removeFilter = (key: keyof Filters) => {
    setApplied((p) => ({ ...p, [key]: EMPTY_FILTERS[key] }));
    setDraft((p) => ({ ...p, [key]: EMPTY_FILTERS[key] }));
  };

  const filtradas = useMemo(
    () =>
      suscriptos.filter((c) => {
        if (applied.clientId && c.id !== applied.clientId) return false;
        if (applied.planId === SIN_PLAN && c.suscripcion!.planId) return false;
        if (applied.planId !== ALL && applied.planId !== SIN_PLAN && c.suscripcion!.planId !== applied.planId) return false;
        if (applied.estado !== ALL && estadoDe(c, planes) !== applied.estado) return false;
        return true;
      }),
    [suscriptos, applied, planes]
  );

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection(key === 'monto' || key === 'desde' ? 'desc' : 'asc');
    }
  };
  const ordenadas = useMemo(() => {
    const f = sortDirection === 'asc' ? 1 : -1;
    const cmp = (a: Client, b: Client) => {
      switch (sortKey) {
        case 'plan':
          return collator.compare(nombrePlan(a.suscripcion!.planId), nombrePlan(b.suscripcion!.planId));
        case 'monto':
          return (montoActual(a.suscripcion!) ?? 0) - (montoActual(b.suscripcion!) ?? 0);
        case 'desde':
          return a.suscripcion!.desde.localeCompare(b.suscripcion!.desde);
        default:
          return collator.compare(fullName(a), fullName(b));
      }
    };
    return [...filtradas].sort((a, b) => cmp(a, b) * f || collator.compare(fullName(a), fullName(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtradas, sortKey, sortDirection, planes]);

  const accionesSuscripcion = (c: Client) => (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setDetalle(c)} title="Ver detalle" aria-label={`Ver detalle de ${fullName(c)}`}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${c.id}/edit`)} title="Editar" aria-label={`Editar ${fullName(c)}`}>
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );

  const accionesPlan = (p: Plan) => {
    const { total } = resumenPlan(p);
    const enUso = suscriptos.filter((c) => c.suscripcion!.planId === p.id).length;
    return (
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setAsignarPlan(p)} title="Asignar clientes" aria-label={`Asignar clientes a ${p.nombre}`}>
          <UserPlus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPrecioPlan(p)} title="Actualizar precio" aria-label={`Actualizar precio de ${p.nombre}`}>
          <TrendingUp className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPlanDialog({ open: true, plan: p })} title="Renombrar" aria-label={`Renombrar ${p.nombre}`}>
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" title="Eliminar" aria-label={`Eliminar ${p.nombre}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar el plan {p.nombre}?</AlertDialogTitle>
              <AlertDialogDescription>
                {enUso > 0
                  ? `No se puede eliminar: ${enUso === 1 ? 'lo tiene 1 cliente' : `lo tienen ${enUso} clientes`}${total < enUso ? ' (incluye bajas)' : ''}. Cambiales el plan primero.`
                  : 'Ningún cliente lo usa. Se borra de la lista de planes.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              {enUso === 0 && (
                <AlertDialogAction onClick={() => eliminarPlan(p)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Planes' }]}
        title="Planes y suscripciones"
        actions={
          <Button className="w-full sm:w-auto" onClick={() => setPlanDialog({ open: true, plan: null })}>
            <Plus className="h-4 w-4" />
            Nuevo plan
          </Button>
        }
      />

      {/* Planes */}
      <Card>
        <CardHeader>
          <CardTitle>Planes ({planes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {planes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <SuscripcionIcon className="h-8 w-8 opacity-50" />
              <p>Todavía no hay planes. Sirven para actualizar el precio de varios clientes a la vez.</p>
              <Button variant="outline" size="sm" onClick={() => setPlanDialog({ open: true, plan: null })}>
                Crear el primero
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {planes.map((p) => {
                const r = resumenPlan(p);
                return (
                  <Card key={p.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.nombre}</span>
                        <span className="font-display font-semibold tabular-nums text-primary">{formatoMoneda(p.precio)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <strong>Clientes:</strong> {r.total}
                        {r.atrasados > 0 && <span className="text-gold"> · {r.atrasados} atrasados</span>}
                      </div>
                      <div className="pt-2">
                        {accionesPlan(p)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Precio vigente</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Atrasados</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planes.map((p) => {
                  const r = resumenPlan(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatoMoneda(p.precio)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                      <TableCell className={`text-right tabular-nums ${r.atrasados > 0 ? 'text-gold' : 'text-muted-foreground'}`}>
                        {r.atrasados}
                      </TableCell>
                      <TableCell>
                        {accionesPlan(p)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Filtros de suscripciones */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(draft);
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="filter-client" className="eyebrow">Cliente</Label>
              <ClientCombobox
                id="filter-client"
                clients={suscriptos}
                value={draft.clientId}
                onChange={(clientId) => setDraft((p) => ({ ...p, clientId }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-plan" className="eyebrow">Plan</Label>
              <Select value={draft.planId} onValueChange={(v) => setDraft((p) => ({ ...p, planId: v }))}>
                <SelectTrigger id="filter-plan" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                  <SelectItem value={SIN_PLAN}>Sin plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-estado" className="eyebrow">Estado</Label>
              <Select value={draft.estado} onValueChange={(v) => setDraft((p) => ({ ...p, estado: v }))}>
                <SelectTrigger id="filter-estado" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(ESTADOS) as Estado[]).map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADOS[e].label}
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

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {activeFilters.map((f) => (
                <span key={f.key} className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 py-1 pl-2.5 pr-1 text-xs text-foreground">
                  <span className="text-muted-foreground">{f.label}:</span>
                  <span className="font-medium">{f.value}</span>
                  <button
                    type="button"
                    onClick={() => removeFilter(f.key)}
                    className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`Quitar filtro ${f.label}`}
                    title="Quitar filtro"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {activeFilters.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setApplied(EMPTY_FILTERS);
                    setDraft(EMPTY_FILTERS);
                  }}
                  className="px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suscripciones */}
      <Card>
        <CardHeader>
          <CardTitle>Suscripciones ({filtradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtradas.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {activeFilters.length > 0
                ? 'No hay suscripciones con estos filtros'
                : 'Ningún cliente tiene suscripción. Se configura en la ficha de cada cliente.'}
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
              {ordenadas.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{fullName(c)}</span>
                      <EstadoBadge estado={estadoDe(c, planes)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Plan:</strong> {nombrePlan(c.suscripcion!.planId)}</div>
                    <div><strong>Monto:</strong> <span className="tabular-nums">{formatoMoneda(montoActual(c.suscripcion!) ?? 0)}</span></div>
                    <div><strong>Desde:</strong> {etiquetaPeriodo(c.suscripcion!.desde)}</div>
                    <div className="pt-2">
                      {accionesSuscripcion(c)}
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
                    <SortableHead label="Cliente" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Plan" sortKey="plan" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Monto" sortKey="monto" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Desde" sortKey="desde" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead>Baja</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenadas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{fullName(c)}</TableCell>
                      <TableCell className="text-sm">{nombrePlan(c.suscripcion!.planId)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatoMoneda(montoActual(c.suscripcion!) ?? 0)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{etiquetaPeriodo(c.suscripcion!.desde)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {c.suscripcion!.hasta ? etiquetaPeriodo(c.suscripcion!.hasta) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <EstadoBadge estado={estadoDe(c, planes)} />
                      </TableCell>
                      <TableCell>
                        {accionesSuscripcion(c)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PlanDialog plan={planDialog.plan} open={planDialog.open} onOpenChange={(open) => setPlanDialog((p) => ({ ...p, open }))} />
      <PrecioDialog plan={precioPlan} onOpenChange={(open) => !open && setPrecioPlan(null)} />
      <AsignarDialog plan={asignarPlan} onOpenChange={(open) => !open && setAsignarPlan(null)} />
      <ClientDetailSheet client={detalle} onOpenChange={(open) => !open && setDetalle(null)} />
    </div>
  );
};
