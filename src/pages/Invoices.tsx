import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  CalendarCheck,
  ExternalLink,
  Eye,
  FileMinus,
  FileText,
  Loader2,
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
import { InvoiceDetailSheet } from '@/components/InvoiceDetailSheet';
import { ClientCombobox } from '@/components/ClientCombobox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ESTADOS,
  FAKTIA_APP_URL,
  reintentarFaktia,
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
const Aviso = ({
  icon: Icon,
  title,
  children,
  spin = false,
}: {
  icon: typeof Receipt;
  title: string;
  children?: React.ReactNode;
  spin?: boolean;
}) => (
  <div className="flex flex-col items-center gap-3 py-12 text-center">
    <Icon className={`h-8 w-8 ${spin ? 'animate-spin text-primary' : 'text-muted-foreground opacity-50'}`} />
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
    retry: reintentarFaktia,
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
    retry: reintentarFaktia,
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

  // Las notas asociadas a una factura del listado no se muestran aparte: se abren desde la fila de su factura
  const filtrados = useMemo(() => {
    const ids = new Set(comprobantes.map((c) => c.id));
    return comprobantes.filter((c) => {
      if (c.tipo.startsWith('NOTA_') && c.asociado && ids.has(c.asociado.id)) return false;
      if (appliedFilters.clientId && referencias.get(c.cliente.id) !== appliedFilters.clientId) return false;
      if (appliedFilters.letra !== ALL && letraDe(c.tipo) !== appliedFilters.letra) return false;
      if (appliedFilters.estado !== ALL && c.estado !== appliedFilters.estado) return false;
      return true;
    });
  }, [comprobantes, appliedFilters, referencias]);

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

  // Anular = emitir una nota de crédito por el total (pide motivo)
  // Comprobante abierto en el panel de detalle
  const [detalle, setDetalle] = useState<FaktiaComprobante | null>(null);

  /** Notas de crédito emitidas sobre un comprobante (con CAE, para poder abrirlas). */
  const notasCreditoDe = (c: FaktiaComprobante) =>
    (c.notas ?? [])
      .filter((n) => n.tipo.startsWith('NOTA_CREDITO') && n.estado === 'EMITIDO')
      .map((n) => comprobantes.find((x) => x.id === n.id))
      .filter((n): n is FaktiaComprobante => Boolean(n?.cae));

  const [aAnular, setAAnular] = useState<FaktiaComprobante | null>(null);
  // Borrador a emitir: emitir siempre pide confirmación
  const [aEmitir, setAEmitir] = useState<FaktiaComprobante | null>(null);
  const [motivo, setMotivo] = useState('');

  const confirmarAnulacion = async () => {
    const factura = aAnular;
    if (!factura || !motivo.trim()) return;
    setAAnular(null);
    setAccion(factura.id);
    try {
      const nc = await faktia.anular(factura, motivo.trim());
      if (nc.estado === 'EMITIDO') {
        toast.success(`Factura ${numeroComprobante(factura)} anulada`, {
          description: `Nota de crédito ${numeroComprobante(nc)} · CAE ${nc.cae}`,
        });
      } else {
        toast.message('Nota de crédito enviada a ARCA', {
          description: 'No se confirmó todavía; Faktia la verifica sola en unos minutos.',
        });
      }
    } catch (err) {
      const e = err instanceof FaktiaError ? err : null;
      toast.error(e?.message ?? 'No se pudo anular la factura', { description: e?.detalle ?? undefined });
    } finally {
      setMotivo('');
      setAccion(null);
      await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    }
  };

  /** `filaId`: fila que muestra el spinner (ej. al bajar la NC desde la fila de la factura anulada). */
  const ejecutar = async (c: FaktiaComprobante, tipo: 'pdf' | 'emitir' | 'eliminar', filaId = c.id) => {
    setAccion(filaId);
    try {
      if (tipo === 'pdf') {
        await faktia.abrirPdf(c);
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
        title="Gestión de Facturas"
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
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link to="/invoices/monthly">
                <CalendarCheck className="h-4 w-4" />
                Facturación mensual
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" disabled={!faktiaConfigurado}>
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" />
                Nueva factura
              </Link>
            </Button>
          </>
        }
      />

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
            <Aviso icon={Loader2} spin title="Cargando comprobantes desde Faktia…">
              La primera carga puede tardar unos segundos.
            </Aviso>
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
                    <TableHead>CUIT</TableHead>
                    <TableHead>Detalle</TableHead>
                    <SortableHead label="Total" sortKey="total" activeKey={sortKey} direction={sortDirection} onSort={handleSort} className="text-right" />
                    <SortableHead label="Estado" sortKey="estado" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenados.map((c) => {
                    const efe = clienteEfe(c);
                    const ocupado = accion === c.id;
                    const editable = c.estado === 'BORRADOR' || c.estado === 'RECHAZADO';
                    // Notas de crédito emitidas que anulan este comprobante (para descargarlas desde la fila)
                    const notasCredito = notasCreditoDe(c);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatoFecha(c.fechaEmision)}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-sm tabular-nums">{numeroComprobante(c)}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {efe ? (
                            <Link to={`/clients/${efe.id}`} className="hover:text-primary hover:underline">
                              {c.cliente.razonSocial}
                            </Link>
                          ) : (
                            c.cliente.razonSocial
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {c.cliente.tipoDocumento === 'CUIT' ? '' : `${c.cliente.tipoDocumento} `}
                          {c.cliente.numeroDocumento}
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
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            {/* Ancho fijo para que todos los estados queden alineados ("Verificando" es el más largo) */}
                            <Badge variant="outline" className={`w-[6.5rem] justify-center ${ESTADOS[c.estado].className}`}>
                              {ESTADOS[c.estado].label}
                            </Badge>
                            {c.ambiente && c.ambiente !== 'PRODUCCION' && (
                              <span
                                className="bg-gold-light/30 px-1 py-px text-[9px] font-semibold uppercase leading-tight tracking-wider text-gold"
                                title="Emitido en el ambiente de prueba de ARCA (homologación): sin validez fiscal"
                              >
                                Prueba
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Acciones como botones de ícono, mismo estilo que la tabla de clientes */}
                          <div className="flex items-center justify-end gap-2">
                            {ocupado ? (
                              <Button variant="outline" size="sm" disabled aria-label="Procesando">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDetalle(c)}
                                  title="Ver detalle"
                                  aria-label={`Ver detalle de ${numeroComprobante(c)}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {c.cae && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => ejecutar(c, 'pdf')}
                                    title={`Ver ${claseDe(c.tipo).toLowerCase()}`}
                                    aria-label={`Ver ${claseDe(c.tipo).toLowerCase()} ${numeroComprobante(c)}`}
                                  >
                                    {c.tipo.startsWith('NOTA_CREDITO') ? (
                                      <FileMinus className="h-4 w-4" />
                                    ) : (
                                      <FileText className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {notasCredito.map((nc) => (
                                  <Button
                                    key={nc.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => ejecutar(nc, 'pdf', c.id)}
                                    title={`Ver nota de crédito ${numeroComprobante(nc)}`}
                                    aria-label={`Ver nota de crédito ${numeroComprobante(nc)}`}
                                  >
                                    <FileMinus className="h-4 w-4" />
                                  </Button>
                                ))}
                                {editable && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAEmitir(c)}
                                    title="Emitir en ARCA"
                                    aria-label={`Emitir ${numeroComprobante(c)} en ARCA`}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                                {c.estado === 'BORRADOR' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => ejecutar(c, 'eliminar')}
                                    title="Eliminar borrador"
                                    aria-label="Eliminar borrador"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {c.estado === 'EMITIDO' && c.tipo.startsWith('FACTURA') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setMotivo('');
                                      setAAnular(c);
                                    }}
                                    title="Anular (emite una nota de crédito)"
                                    aria-label={`Anular ${numeroComprobante(c)}`}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
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

      <InvoiceDetailSheet
        comprobante={detalle}
        notasCredito={detalle ? notasCreditoDe(detalle) : []}
        onOpenChange={(open) => !open && setDetalle(null)}
        onVerPdf={(c) => ejecutar(c, 'pdf', detalle?.id ?? c.id)}
      />

      {/* Confirmación de emisión */}
      <AlertDialog open={Boolean(aEmitir)} onOpenChange={(open) => !open && setAEmitir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Emitir la factura?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {aEmitir && (
                  <p className="text-foreground">
                    {claseDe(aEmitir.tipo)} {letraDe(aEmitir.tipo)} a {aEmitir.cliente.razonSocial} por{' '}
                    {formatoMoneda(aEmitir.importes.total, aEmitir.moneda)}
                  </p>
                )}
                <p>Se envía a ARCA y obtiene CAE. No se puede deshacer: una factura emitida solo se anula con una nota de crédito.</p>
                {aEmitir && aEmitir.ambiente !== 'PRODUCCION' && (
                  <p className="border-l-2 border-gold bg-gold/10 p-2 text-foreground">
                    Ambiente de prueba: la factura no tiene validez fiscal.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const c = aEmitir;
                setAEmitir(null);
                if (c) ejecutar(c, 'emitir');
              }}
            >
              Emitir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de anulación */}
      <AlertDialog open={Boolean(aAnular)} onOpenChange={(open) => !open && setAAnular(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular la factura {aAnular ? numeroComprobante(aAnular) : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              {aAnular && (
                <>
                  Se emite en ARCA una nota de crédito por el total ({formatoMoneda(aAnular.importes.total, aAnular.moneda)}) a{' '}
                  {aAnular.cliente.razonSocial}. No se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-anulacion">Motivo *</Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej. Error en el importe facturado"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!motivo.trim()}
              onClick={(e) => {
                e.preventDefault();
                confirmarAnulacion();
              }}
            >
              Emitir nota de crédito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
