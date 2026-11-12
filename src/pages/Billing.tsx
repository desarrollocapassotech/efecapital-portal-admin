import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarCheck, Edit, FileText, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/dataStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/alert-dialog';
import {
  FaktiaError,
  faktia,
  faktiaConfigurado,
  formatoMoneda,
  hoyISO,
  receptorDeBroker,
  receptorDeCliente,
  referenciaBroker,
  reintentarFaktia,
  type FaktiaComprobante,
  type Receptor,
  type UnidadItem,
} from '@/lib/faktia';
import {
  etiquetaPeriodo,
  montoADecimal,
  montoAInput,
  montoEn,
  parsearMonto,
  periodoAFacturar,
  rangoPeriodo,
  sumarMeses,
} from '@/lib/suscripciones';
import { INVOICES_QUERY_KEY } from '@/pages/Invoices';
import { facturasPorReferencia, netoDe, useFacturacionPeriodo } from '@/hooks/useFacturacionPeriodo';

/** Días entre la emisión y el vencimiento de pago de cada factura. */
const DIAS_VENCIMIENTO = 10;

const DESCRIPCION_SUSCRIPCION = 'Servicio de asesoramiento financiero';
const DESCRIPCION_COMISIONES = 'Comisiones';

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

const enDias = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Estado de cada fila ────────────────────────────────────────────────────

type Estado = 'pendiente' | 'facturada' | 'en_proceso' | 'borrador' | 'rechazada' | 'sin_fiscal' | 'emitiendo' | 'error';

const ESTADOS: Record<Estado, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-muted text-muted-foreground border-border' },
  facturada: { label: 'Facturada', className: 'bg-success/10 text-success border-success/30' },
  en_proceso: { label: 'Verificando', className: 'bg-gold/10 text-gold border-gold/30' },
  borrador: { label: 'Borrador', className: 'bg-muted text-muted-foreground border-border' },
  rechazada: { label: 'Rechazada', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  sin_fiscal: { label: 'Sin datos fiscales', className: 'bg-gold/10 text-gold border-gold/30' },
  emitiendo: { label: 'Emitiendo', className: 'bg-primary/10 text-primary border-primary/20' },
  error: { label: 'Error', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const EstadoBadge = ({ estado }: { estado: Estado }) => (
  <Badge variant="outline" className={`w-36 justify-center gap-1.5 ${ESTADOS[estado].className}`}>
    {estado === 'emitiendo' && <Loader2 className="h-3 w-3 animate-spin" />}
    {ESTADOS[estado].label}
  </Badge>
);

/** Estados en los que la fila todavía se puede emitir. */
const EMITIBLES: Estado[] = ['pendiente', 'borrador', 'rechazada', 'error'];

interface Fila {
  ref: string;
  tipo: 'cliente' | 'broker';
  nombre: string;
  detalle: string;
  receptor: Receptor;
  /** Para clientes: el monto que regía en el período. Para brokers: lo que se cargó. */
  monto: number | undefined;
  /** Factura del período que ya existe en Faktia (emitida, en curso o borrador). */
  comprobante?: FaktiaComprobante;
  editarUrl: string;
}

const estadoBase = (f: Fila): Estado => {
  const c = f.comprobante;
  if (c?.estado === 'EMITIDO') return 'facturada';
  if (c?.estado === 'EMITIENDO' || c?.estado === 'PENDIENTE_VERIFICACION') return 'en_proceso';
  if (c?.estado === 'RECHAZADO') return 'rechazada';
  if (c?.estado === 'BORRADOR') return 'borrador';
  if (!f.receptor.fiscal) return 'sin_fiscal';
  return 'pendiente';
};

export const Billing = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { brokers, planes } = useDataStore();

  const ultimoFacturable = periodoAFacturar();
  const [periodo, setPeriodo] = useState(ultimoFacturable);
  const periodos = useMemo(() => Array.from({ length: 12 }, (_, i) => sumarMeses(ultimoFacturable, -i)), [ultimoFacturable]);

  // ── Datos de Faktia ──────────────────────────────────────────────────────

  const { data: config, error: errorConfig } = useQuery({
    queryKey: ['faktia', 'configuracion'],
    queryFn: faktia.configuracion,
    enabled: faktiaConfigurado,
    staleTime: 10 * 60_000,
    retry: reintentarFaktia,
  });
  const emisorMonotributo = config?.emisor.condicionIva?.startsWith('MONOTRIBUTO') ?? false;
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const puntoVenta = puntoVentaId || config?.puntosVenta[0]?.id || '';

  const { suscriptos, periodoQuery, refsQuery, facturas: facturasDelPeriodo, cargando, error: errorCarga } =
    useFacturacionPeriodo(periodo);
  // Mes anterior: referencia de lo facturado a cada broker
  const anteriorQuery = useQuery({
    queryKey: ['faktia', 'periodo', sumarMeses(periodo, -1)],
    queryFn: () => faktia.comprobantesDelPeriodo(sumarMeses(periodo, -1)),
    enabled: faktiaConfigurado,
    staleTime: 5 * 60_000,
    retry: reintentarFaktia,
  });
  const facturasAnteriores = useMemo(
    () => facturasPorReferencia(anteriorQuery.data, refsQuery.data),
    [anteriorQuery.data, refsQuery.data]
  );

  // ── Filas ────────────────────────────────────────────────────────────────

  const [montosBroker, setMontosBroker] = useState<Record<string, string>>({});
  const [ejecucion, setEjecucion] = useState<Record<string, { estado: 'emitiendo' | 'error'; mensaje?: string }>>({});
  const [emitiendo, setEmitiendo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  // Clientes: vienen todos tildados (los que se pueden emitir), salvo los que el usuario destilde
  const [destildados, setDestildados] = useState<Set<string>>(new Set());

  // Al cambiar de período se limpia lo cargado
  useEffect(() => {
    setMontosBroker({});
    setEjecucion({});
    setDestildados(new Set());
  }, [periodo]);

  const filasClientes: Fila[] = useMemo(
    () =>
      suscriptos
        .map((c) => ({
          ref: c.id,
          tipo: 'cliente' as const,
          nombre: `${c.firstName} ${c.lastName}`.trim(),
          detalle: planes.find((p) => p.id === c.suscripcion!.planId)?.nombre ?? 'Sin plan',
          receptor: receptorDeCliente(c),
          monto: montoEn(c.suscripcion!, periodo),
          comprobante: facturasDelPeriodo.get(c.id),
          editarUrl: `/clients/${c.id}/edit`,
        }))
        .sort((a, b) => collator.compare(a.nombre, b.nombre)),
    [suscriptos, planes, periodo, facturasDelPeriodo]
  );

  const filasBrokers: Fila[] = useMemo(
    () =>
      brokers
        .map((b) => {
          const ref = referenciaBroker(b.id);
          const comprobante = facturasDelPeriodo.get(ref);
          const cargado = parsearMonto(montosBroker[ref] ?? '');
          return {
            ref,
            tipo: 'broker' as const,
            nombre: b.name,
            detalle: '',
            receptor: receptorDeBroker(b),
            // Si ya hay factura o borrador del período, el monto es el de esa factura
            monto: comprobante ? netoDe(comprobante) : Number.isFinite(cargado) && cargado > 0 ? cargado : undefined,
            comprobante,
            editarUrl: `/brokers/${b.id}/edit`,
          };
        })
        .sort((a, b) => collator.compare(a.nombre, b.nombre)),
    [brokers, facturasDelPeriodo, montosBroker]
  );

  const estadoDe = (f: Fila): Estado => ejecucion[f.ref]?.estado ?? estadoBase(f);

  const clienteSeleccionado = (f: Fila) => EMITIBLES.includes(estadoDe(f)) && !destildados.has(f.ref);
  // Brokers: se emiten los que tienen monto (o un borrador/rechazada del período para reintentar)
  const brokerSeleccionado = (f: Fila) => EMITIBLES.includes(estadoDe(f)) && (f.monto ?? 0) > 0;

  const aEmitir = [...filasClientes.filter(clienteSeleccionado), ...filasBrokers.filter(brokerSeleccionado)];
  const totalClientes = filasClientes.filter(clienteSeleccionado).reduce((a, f) => a + (f.monto ?? 0), 0);
  const totalBrokers = filasBrokers.filter(brokerSeleccionado).reduce((a, f) => a + (f.monto ?? 0), 0);
  const cantClientes = filasClientes.filter(clienteSeleccionado).length;
  const cantBrokers = filasBrokers.filter(brokerSeleccionado).length;

  // Avisar si se intenta cerrar la pestaña en medio de la emisión
  useEffect(() => {
    if (!emitiendo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [emitiendo]);

  // ── Emisión ──────────────────────────────────────────────────────────────

  const emitirTodo = async () => {
    setConfirmar(false);
    if (!puntoVenta) {
      toast.error('No hay puntos de venta disponibles en Faktia');
      return;
    }
    setEmitiendo(true);
    const { desde, hasta } = rangoPeriodo(periodo);
    const fechaEmision = hoyISO();
    const fechaVtoPago = enDias(DIAS_VENCIMIENTO);
    const etiqueta = etiquetaPeriodo(periodo);
    let ok = 0;
    let pendientes = 0;
    let errores = 0;

    for (const fila of aEmitir) {
      setEjecucion((p) => ({ ...p, [fila.ref]: { estado: 'emitiendo' } }));
      try {
        let comprobante = fila.comprobante;
        if (!comprobante) {
          const monto = fila.monto!;
          const receptor = await faktia.asegurarReceptor(fila.receptor);
          const unidad: UnidadItem = fila.tipo === 'cliente' ? 'MES' : 'SERVICIO';
          comprobante = await faktia.crearBorrador(
            {
              clienteId: receptor.id,
              puntoVentaId: puntoVenta,
              fechaEmision,
              concepto: 'SERVICIOS',
              fechaServicioDesde: desde,
              fechaServicioHasta: hasta,
              fechaVtoPago,
              moneda: 'ARS',
              lineas: [
                {
                  descripcion: `${fila.tipo === 'cliente' ? DESCRIPCION_SUSCRIPCION : DESCRIPCION_COMISIONES} — ${etiqueta}`,
                  cantidad: '1',
                  unidad,
                  precioUnitario: montoADecimal(monto),
                  alicuotaIva: emisorMonotributo ? '0' : '21',
                },
              ],
            },
            // Clave fija: si se repite (doble clic, otra pestaña) Faktia devuelve el mismo borrador
            `efe-${fila.tipo}-${fila.ref}-${periodo}-${montoADecimal(monto)}`
          );
        }
        const emitido = await faktia.emitir(comprobante.id, comprobante.version);
        if (emitido.estado === 'EMITIDO') ok++;
        else pendientes++;
        setEjecucion((p) => {
          const { [fila.ref]: _, ...resto } = p;
          return resto;
        });
      } catch (err) {
        errores++;
        const e = err instanceof FaktiaError ? err : null;
        setEjecucion((p) => ({
          ...p,
          [fila.ref]: { estado: 'error', mensaje: [e?.message ?? 'No se pudo emitir', e?.detalle].filter(Boolean).join(' · ') },
        }));
      }
      // Refresca el estado del período a medida que avanza
      await queryClient.invalidateQueries({ queryKey: ['faktia', 'periodo', periodo] });
    }

    await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    setEmitiendo(false);
    setMontosBroker((prev) => {
      // Se limpia el monto de los brokers que quedaron facturados
      const next = { ...prev };
      aEmitir.forEach((f) => f.tipo === 'broker' && delete next[f.ref]);
      return next;
    });

    const partes = [
      ok && `${ok} emitida${ok === 1 ? '' : 's'}`,
      pendientes && `${pendientes} en verificación`,
      errores && `${errores} con error`,
    ].filter(Boolean);
    if (errores) toast.error(`Facturación de ${etiqueta}: ${partes.join(', ')}`, { description: 'Revisá las filas marcadas con error y volvé a emitir.' });
    else toast.success(`Facturación de ${etiqueta}: ${partes.join(', ')}`);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const header = (
    <PageHeader
      breadcrumbs={[{ label: 'Facturas', to: '/invoices' }, { label: 'Facturación mensual' }]}
      title="Facturación mensual"
      description={
        config
          ? `Emisor: ${config.emisor.razonSocial} · CUIT ${config.emisor.cuit}${config.emisor.ambiente !== 'PRODUCCION' ? ' · AMBIENTE DE PRUEBA' : ''}`
          : undefined
      }
    />
  );

  if (!faktiaConfigurado || errorConfig) {
    return (
      <div className="flex-1 space-y-6 p-3 pt-16 sm:p-6 lg:pt-6">
        {header}
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="font-medium">
              {!faktiaConfigurado ? 'La integración con Faktia no está configurada' : 'No se pudo conectar con Faktia'}
            </p>
            <p className="text-sm text-muted-foreground">
              {errorConfig instanceof FaktiaError ? errorConfig.message : 'Falta definir VITE_FAKTIA_API_URL.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }


  const acciones = (f: Fila) => (
    <div className="flex items-center justify-end gap-2">
      {f.comprobante && (
        <Button
          variant="outline"
          size="sm"
          title="Ver comprobante"
          aria-label={`Ver comprobante de ${f.nombre}`}
          onClick={() =>
            faktia.abrirPdf(f.comprobante!).catch((err) =>
              toast.error(err instanceof FaktiaError ? err.message : 'No se pudo abrir el PDF')
            )
          }
        >
          <FileText className="h-4 w-4" />
        </Button>
      )}
      <Button variant="outline" size="sm" asChild title="Editar ficha" aria-label={`Editar ${f.nombre}`}>
        <Link to={f.editarUrl}>
          <Edit className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );

  const mensajeError = (f: Fila) =>
    ejecucion[f.ref]?.mensaje ? <p className="mt-1 text-xs text-destructive">{ejecucion[f.ref].mensaje}</p> : null;

  const checkCliente = (f: Fila) => (
    <Checkbox
      checked={clienteSeleccionado(f)}
      disabled={emitiendo || !EMITIBLES.includes(estadoDe(f))}
      onCheckedChange={(v) =>
        setDestildados((prev) => {
          const s = new Set(prev);
          if (v === true) s.delete(f.ref);
          else s.add(f.ref);
          return s;
        })
      }
      aria-label={`Facturar a ${f.nombre}`}
    />
  );

  const inputBroker = (f: Fila) => {
    const editable = !f.comprobante && estadoDe(f) !== 'sin_fiscal';
    if (!editable) {
      return <span className="tabular-nums">{f.monto !== undefined ? formatoMoneda(f.monto) : '—'}</span>;
    }
    return (
      <Input
        inputMode="decimal"
        value={montosBroker[f.ref] ?? ''}
        onChange={(e) => setMontosBroker((p) => ({ ...p, [f.ref]: e.target.value }))}
        placeholder="Monto sin facturar"
        disabled={emitiendo}
        className={`h-9 w-40 tabular-nums ${montosBroker[f.ref] && !(parsearMonto(montosBroker[f.ref]) > 0) ? 'border-destructive' : ''}`}
        aria-label={`Comisiones de ${f.nombre}`}
      />
    );
  };

  const mesAnterior = (f: Fila) => {
    const anterior = facturasAnteriores.get(f.ref);
    if (!anterior) return <span className="text-muted-foreground">—</span>;
    const neto = netoDe(anterior);
    const editable = !f.comprobante && estadoDe(f) !== 'sin_fiscal' && !emitiendo;
    return editable ? (
      <button
        type="button"
        className="tabular-nums text-primary underline-offset-4 hover:underline"
        title="Usar este monto"
        onClick={() => setMontosBroker((p) => ({ ...p, [f.ref]: montoAInput(neto) }))}
      >
        {formatoMoneda(neto)}
      </button>
    ) : (
      <span className="tabular-nums text-muted-foreground">{formatoMoneda(neto)}</span>
    );
  };

  const montosInvalidos = filasBrokers.some((f) => montosBroker[f.ref] && !(parsearMonto(montosBroker[f.ref]) > 0) && !f.comprobante);

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      {header}

      {/* Período */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="periodo" className="eyebrow">Período a facturar</Label>
              <Select value={periodo} onValueChange={setPeriodo} disabled={emitiendo}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p} value={p}>
                      {etiquetaPeriodo(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(config?.puntosVenta.length ?? 0) > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="puntoVenta" className="eyebrow">Punto de venta</Label>
                <Select value={puntoVenta} onValueChange={setPuntoVentaId} disabled={emitiendo}>
                  <SelectTrigger id="puntoVenta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config!.puntosVenta.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {String(p.numero).padStart(4, '0')}
                        {p.descripcion ? ` · ${p.descripcion}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-sm text-muted-foreground sm:col-start-3">
              Mes vencido. Se emiten con fecha de hoy y vencimiento a {DIAS_VENCIMIENTO} días.
              {!emisorMonotributo && config && ' Los montos son sin IVA: se suma 21%.'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                periodoQuery.refetch();
                anteriorQuery.refetch();
                refsQuery.refetch();
              }}
              disabled={emitiendo || periodoQuery.isFetching}
              title="Volver a consultar Faktia"
            >
              <RefreshCw className={`h-4 w-4 ${periodoQuery.isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {cargando ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Consultando las facturas de {etiquetaPeriodo(periodo)} en Faktia…</p>
          </CardContent>
        </Card>
      ) : errorCarga ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="font-medium">No se pudieron consultar las facturas del período</p>
            <p className="text-sm text-muted-foreground">{errorCarga instanceof FaktiaError ? errorCarga.message : 'Error de conexión'}</p>
            <Button variant="outline" size="sm" onClick={() => (periodoQuery.error ? periodoQuery.refetch() : refsQuery.refetch())}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Suscripciones de clientes ({filasClientes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filasClientes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
                  <CalendarCheck className="h-8 w-8 opacity-50" />
                  <p>Ningún cliente tiene suscripción para {etiquetaPeriodo(periodo)}.</p>
                  <p className="text-xs">La suscripción se configura en la ficha de cada cliente.</p>
                </div>
              ) : isMobile ? (
                <div className="space-y-3">
                  {filasClientes.map((f) => (
                    <div key={f.ref} className="space-y-2 border border-border p-3">
                      <div className="flex items-start gap-3">
                        {checkCliente(f)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{f.nombre}</p>
                          <p className="text-xs text-muted-foreground">{f.detalle}</p>
                        </div>
                        <span className="tabular-nums">{formatoMoneda(f.monto ?? 0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <EstadoBadge estado={estadoDe(f)} />
                        {acciones(f)}
                      </div>
                      {mensajeError(f)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasClientes.map((f) => (
                        <TableRow key={f.ref}>
                          <TableCell>
                            {checkCliente(f)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{f.nombre}</span>
                            {mensajeError(f)}
                          </TableCell>
                          <TableCell className="text-sm">{f.detalle}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatoMoneda(f.monto ?? 0)}</TableCell>
                          <TableCell className="text-center">
                            <EstadoBadge estado={estadoDe(f)} />
                          </TableCell>
                          <TableCell>
                            {acciones(f)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brokers */}
          <Card>
            <CardHeader>
              <CardTitle>Comisiones de brokers ({filasBrokers.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cargá el total del mes de cada broker. Los que quedan vacíos no se facturan.
              </p>
            </CardHeader>
            <CardContent>
              {filasBrokers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No hay brokers.{' '}
                  <Link to="/brokers/new" className="font-medium text-primary underline-offset-4 hover:underline">
                    Agregar uno
                  </Link>
                </div>
              ) : isMobile ? (
                <div className="space-y-3">
                  {filasBrokers.map((f) => (
                    <div key={f.ref} className="space-y-2 border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{f.nombre}</span>
                        <EstadoBadge estado={estadoDe(f)} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Mes anterior: {mesAnterior(f)}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        {inputBroker(f)}
                        {acciones(f)}
                      </div>
                      {mensajeError(f)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Broker</TableHead>
                        <TableHead className="text-right">Mes anterior</TableHead>
                        <TableHead>A facturar ({etiquetaPeriodo(periodo)})</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filasBrokers.map((f) => (
                        <TableRow key={f.ref}>
                          <TableCell>
                            <span className="font-medium">{f.nombre}</span>
                            {mensajeError(f)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {mesAnterior(f)}
                          </TableCell>
                          <TableCell>
                            {inputBroker(f)}
                          </TableCell>
                          <TableCell className="text-center">
                            <EstadoBadge estado={estadoDe(f)} />
                          </TableCell>
                          <TableCell>
                            {acciones(f)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen y emisión */}
          <Card className="sticky bottom-0 z-10">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
              <div className="text-sm">
                <p>
                  <span className="text-muted-foreground">Clientes:</span> {cantClientes} · {formatoMoneda(totalClientes)}
                  <span className="mx-2 text-border">|</span>
                  <span className="text-muted-foreground">Brokers:</span> {cantBrokers} · {formatoMoneda(totalBrokers)}
                </p>
                {montosInvalidos && <p className="text-xs text-destructive">Hay montos de brokers inválidos (ej. 150000 o 150.000,50).</p>}
              </div>
              <Button
                onClick={() => setConfirmar(true)}
                disabled={emitiendo || aEmitir.length === 0 || montosInvalidos || !puntoVenta}
                className="w-full sm:w-auto"
              >
                {emitiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {emitiendo
                  ? 'Emitiendo…'
                  : `Emitir ${aEmitir.length} factura${aEmitir.length === 1 ? '' : 's'} · ${formatoMoneda(totalClientes + totalBrokers)}`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Emitir las facturas de {etiquetaPeriodo(periodo)}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <ul className="space-y-1 text-foreground">
                  {cantClientes > 0 && (
                    <li>
                      {cantClientes} a clientes por {formatoMoneda(totalClientes)}
                    </li>
                  )}
                  {cantBrokers > 0 && (
                    <li>
                      {cantBrokers} a brokers por {formatoMoneda(totalBrokers)}
                    </li>
                  )}
                </ul>
                <p>
                  Se envían a ARCA y obtienen CAE. No se puede deshacer: una factura emitida solo se anula con una nota de crédito.
                  {!emisorMonotributo && ' A los montos se les suma el IVA.'}
                </p>
                {config && config.emisor.ambiente !== 'PRODUCCION' && (
                  <p className="border-l-2 border-gold bg-gold/10 p-2 text-foreground">Faktia está en ambiente de prueba: las facturas no tienen validez fiscal.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={emitirTodo}>Emitir {aEmitir.length}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
