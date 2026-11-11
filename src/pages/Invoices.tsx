import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  FileDown,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/dataStore';
import { PageHeader } from '@/components/PageHeader';
import { ClientCombobox } from '@/components/ClientCombobox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ESTADOS,
  FAKTIA_APP_URL,
  FaktiaError,
  claseDe,
  faktia,
  faktiaConfigurado,
  formatoFecha,
  formatoMoneda,
  letraDe,
  numeroComprobante,
  type EstadoComprobante,
  type FaktiaComprobante,
} from '@/lib/faktia';

const ALL = '__all__';

type Filters = { clientId: string; estado: string; letra: string };
const EMPTY_FILTERS: Filters = { clientId: '', estado: ALL, letra: ALL };

type SortKey = 'fecha' | 'numero' | 'cliente' | 'total' | 'estado';
type SortDirection = 'asc' | 'desc';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export const INVOICES_QUERY_KEY = ['faktia', 'comprobantes'] as const;

const SortableHead = ({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) => {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
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

/** Estado vacío / error a pantalla completa dentro de la tarjeta. */
const Aviso = ({ icon: Icon, title, children }: { icon: typeof Receipt; title: string; children?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-center">
    <Icon className="h-8 w-8 text-muted-foreground opacity-50" />
    <p className="font-medium text-foreground">{title}</p>
    {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
  </div>
);

export const Invoices = () => {
  const { clients } = useDataStore();
  const queryClient = useQueryClient();

  const { data: comprobantes = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: INVOICES_QUERY_KEY,
    queryFn: () => faktia.todosLosComprobantes(),
    enabled: faktiaConfigurado,
    staleTime: 30_000,
  });

  // Vincula cada comprobante con el cliente de EFE Capital (por la referencia guardada en Faktia)
  const { data: referencias = new Map<string, string>() } = useQuery({
    queryKey: ['faktia', 'referencias', clients.map((c) => c.id).join(',')],
    queryFn: async () => {
      const mapa = new Map<string, string>(); // faktiaClienteId → efeClientId
      for (let i = 0; i < clients.length; i += 200) {
        const r = await faktia.clientesPorReferencia(clients.slice(i, i + 200).map((c) => c.id));
        r.forEach((v) => mapa.set(v.cliente.id, v.referenciaExterna));
      }
      return mapa;
    },
    enabled: faktiaConfigurado && clients.length > 0,
    staleTime: 5 * 60_000,
  });

  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [accion, setAccion] = useState<string | null>(null);

  const clienteEfe = (c: FaktiaComprobante) => {
    const efeId = referencias.get(c.cliente.id);
    return efeId ? clients.find((cl) => cl.id === efeId) : undefined;
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection(key === 'cliente' || key === 'estado' ? 'asc' : 'desc');
    }
  };

  const filtrados = useMemo(
    () =>
      comprobantes.filter((c) => {
        if (appliedFilters.clientId && referencias.get(c.cliente.id) !== appliedFilters.clientId) return false;
        if (appliedFilters.estado !== ALL && c.estado !== appliedFilters.estado) return false;
        if (appliedFilters.letra !== ALL && letraDe(c.tipo) !== appliedFilters.letra) return false;
        return true;
      }),
    [comprobantes, appliedFilters, referencias]
  );

  const ordenados = useMemo(() => {
    const factor = sortDirection === 'asc' ? 1 : -1;
    const comparar = (a: FaktiaComprobante, b: FaktiaComprobante) => {
      switch (sortKey) {
        case 'numero':
          return a.puntoVenta - b.puntoVenta || (a.numero ?? 0) - (b.numero ?? 0);
        case 'cliente':
          return collator.compare(a.cliente.razonSocial, b.cliente.razonSocial);
        case 'total':
          return Number(a.importes.total) - Number(b.importes.total);
        case 'estado':
          return collator.compare(ESTADOS[a.estado].label, ESTADOS[b.estado].label);
        default:
          return a.fechaEmision.localeCompare(b.fechaEmision);
      }
    };
    return [...filtrados].sort((a, b) => comparar(a, b) * factor || (b.numero ?? 0) - (a.numero ?? 0));
  }, [filtrados, sortKey, sortDirection]);

  // Totales de lo emitido (facturas y notas de débito suman, notas de crédito restan)
  const totales = useMemo(() => {
    const porMoneda = new Map<string, number>();
    for (const c of filtrados) {
      if (c.estado !== 'EMITIDO') continue;
      const signo = c.tipo.startsWith('NOTA_CREDITO') ? -1 : 1;
      porMoneda.set(c.moneda, (porMoneda.get(c.moneda) ?? 0) + signo * Number(c.importes.total));
    }
    return [...porMoneda.entries()];
  }, [filtrados]);

  const activeFilters = [
    appliedFilters.clientId && {
      key: 'clientId' as const,
      label: 'Cliente',
      value: (() => {
        const c = clients.find((cl) => cl.id === appliedFilters.clientId);
        return c ? `${c.firstName} ${c.lastName}` : 'Cliente eliminado';
      })(),
    },
    appliedFilters.estado !== ALL && {
      key: 'estado' as const,
      label: 'Estado',
      value: ESTADOS[appliedFilters.estado as EstadoComprobante].label,
    },
    appliedFilters.letra !== ALL && { key: 'letra' as const, label: 'Tipo', value: `Letra ${appliedFilters.letra}` },
  ].filter(Boolean) as { key: keyof Filters; label: string; value: string }[];

  const removeFilter = (key: keyof Filters) => {
    setAppliedFilters((p) => ({ ...p, [key]: EMPTY_FILTERS[key] }));
    setDraftFilters((p) => ({ ...p, [key]: EMPTY_FILTERS[key] }));
  };

  const ejecutar = async (c: FaktiaComprobante, tipo: 'pdf' | 'emitir' | 'eliminar') => {
    setAccion(c.id);
    try {
      if (tipo === 'pdf') {
        await faktia.descargarPdf(c);
      } else if (tipo === 'emitir') {
        const r = await faktia.emitir(c.id, c.version);
        if (r.estado === 'EMITIDO') toast.success(`Factura ${numeroComprobante(r)} emitida. CAE ${r.cae}`);
        else toast.message('ARCA no confirmó todavía: Faktia la verifica sola en unos minutos.');
      } else {
        await faktia.eliminarBorrador(c.id);
        toast.success('Borrador eliminado');
      }
      if (tipo !== 'pdf') await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    } catch (err) {
      const e = err instanceof FaktiaError ? err : null;
      toast.error(e?.message ?? 'No se pudo completar la acción', { description: e?.detalle ?? undefined });
      if (tipo === 'emitir') await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    } finally {
      setAccion(null);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Facturas' }]}
        title="Facturas"
        actions={
          <>
            {FAKTIA_APP_URL && (
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href={`${FAKTIA_APP_URL}/comprobantes`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir Faktia
                </a>
              </Button>
            )}
            {faktiaConfigurado && (
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="w-full sm:w-auto">
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            )}
            <Button asChild className="w-full sm:w-auto" disabled={!faktiaConfigurado}>
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" />
                Nueva factura
              </Link>
            </Button>
          </>
        }
      />

      {totales.length > 0 && (
        <div className={`grid grid-cols-1 gap-px border border-border bg-border ${totales.length > 1 ? 'sm:grid-cols-2' : 'sm:max-w-sm'}`}>
          {totales.map(([moneda, total]) => (
            <div key={moneda} className="bg-card p-5">
              <p className="eyebrow">Total facturado{totales.length > 1 ? ` · ${moneda}` : ''}</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-primary">
                {formatoMoneda(total, moneda as FaktiaComprobante['moneda'])}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Comprobantes emitidos, netos de notas de crédito</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedFilters(draftFilters);
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="filter-client" className="eyebrow">Cliente</Label>
              <ClientCombobox
                id="filter-client"
                clients={clients}
                value={draftFilters.clientId}
                onChange={(clientId) => setDraftFilters((p) => ({ ...p, clientId }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-estado" className="eyebrow">Estado</Label>
              <Select value={draftFilters.estado} onValueChange={(estado) => setDraftFilters((p) => ({ ...p, estado }))}>
                <SelectTrigger id="filter-estado" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(ESTADOS) as EstadoComprobante[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {ESTADOS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-letra" className="eyebrow">Tipo</Label>
              <Select value={draftFilters.letra} onValueChange={(letra) => setDraftFilters((p) => ({ ...p, letra }))}>
                <SelectTrigger id="filter-letra" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {['A', 'B', 'C'].map((l) => (
                    <SelectItem key={l} value={l}>
                      Letra {l}
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
                <span key={f.key} className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 py-1 pl-2.5 pr-1 text-xs">
                  <span className="text-muted-foreground">{f.label}:</span>
                  <span className="font-medium">{f.value}</span>
                  <button
                    type="button"
                    onClick={() => removeFilter(f.key)}
                    className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    aria-label={`Quitar filtro ${f.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {activeFilters.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedFilters(EMPTY_FILTERS);
                    setDraftFilters(EMPTY_FILTERS);
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

      {/* Listado */}
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes ({ordenados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!faktiaConfigurado ? (
            <Aviso icon={AlertTriangle} title="La integración con Faktia no está configurada">
              Falta definir <code className="bg-muted px-1">VITE_FAKTIA_API_URL</code> en el entorno del panel.
            </Aviso>
          ) : isLoading ? (
            <Aviso icon={Loader2} title="Cargando comprobantes desde Faktia…" />
          ) : error ? (
            <Aviso icon={AlertTriangle} title="No se pudieron cargar las facturas">
              <p>{error instanceof FaktiaError ? error.message : 'Error inesperado.'}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
                {FAKTIA_APP_URL && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${FAKTIA_APP_URL}/comprobantes`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Ir al panel de Faktia
                    </a>
                  </Button>
                )}
              </div>
            </Aviso>
          ) : ordenados.length === 0 ? (
            <Aviso icon={Receipt} title={activeFilters.length ? 'No hay comprobantes con estos filtros' : 'Todavía no hay facturas'}>
              {!activeFilters.length && (
                <Button asChild variant="outline" size="sm" className="mt-1">
                  <Link to="/invoices/new">
                    <Plus className="h-4 w-4" />
                    Nueva factura
                  </Link>
                </Button>
              )}
            </Aviso>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Fecha" sortKey="fecha" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Comprobante" sortKey="numero" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <SortableHead label="Cliente" sortKey="cliente" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead>Detalle</TableHead>
                    <SortableHead label="Total" sortKey="total" activeKey={sortKey} direction={sortDirection} onSort={handleSort} className="text-right" />
                    <SortableHead label="Estado" sortKey="estado" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenados.map((c) => {
                    const efe = clienteEfe(c);
                    const ocupado = accion === c.id;
                    const editable = c.estado === 'BORRADOR' || c.estado === 'RECHAZADO';
                    return (
                      <TableRow key={c.id} className={c.estado === 'ANULADO' ? 'opacity-60' : ''}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatoFecha(c.fechaEmision)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center border border-primary/30 text-[11px] font-semibold text-primary">
                              {letraDe(c.tipo)}
                            </span>
                            <div className="leading-tight">
                              <p className="font-mono text-sm tabular-nums">{numeroComprobante(c)}</p>
                              <p className="text-xs text-muted-foreground">{claseDe(c.tipo)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {efe ? (
                            <Link to={`/clients/${efe.id}`} className="hover:text-primary hover:underline">
                              {c.cliente.razonSocial}
                            </Link>
                          ) : (
                            c.cliente.razonSocial
                          )}
                          <p className="text-xs font-normal text-muted-foreground">
                            {c.cliente.tipoDocumento} {c.cliente.numeroDocumento}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[16rem] text-sm text-muted-foreground">
                          <p className="truncate" title={c.lineas.map((l) => l.descripcion).join(' · ')}>
                            {c.lineas[0]?.descripcion ?? '—'}
                            {c.lineas.length > 1 && ` (+${c.lineas.length - 1})`}
                          </p>
                          {c.estado === 'RECHAZADO' && c.error && (
                            <p className="truncate text-xs text-destructive" title={c.error.detalle ?? c.error.mensaje}>
                              {c.error.mensaje}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums">
                          {formatoMoneda(c.importes.total, c.moneda)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ESTADOS[c.estado].className}>
                            {ESTADOS[c.estado].label}
                          </Badge>
                          {c.ambiente && c.ambiente !== 'PRODUCCION' && (
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Prueba</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Acciones" disabled={ocupado}>
                                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {c.cae && (
                                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => ejecutar(c, 'pdf')}>
                                  <FileDown className="h-4 w-4" />
                                  Descargar PDF
                                </DropdownMenuItem>
                              )}
                              {editable && (
                                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => ejecutar(c, 'emitir')}>
                                  <Send className="h-4 w-4" />
                                  Emitir en ARCA
                                </DropdownMenuItem>
                              )}
                              {c.estado === 'BORRADOR' && (
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                  onClick={() => ejecutar(c, 'eliminar')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar borrador
                                </DropdownMenuItem>
                              )}
                              {!c.cae && !editable && (
                                <DropdownMenuItem disabled className="text-xs">Sin acciones disponibles</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
