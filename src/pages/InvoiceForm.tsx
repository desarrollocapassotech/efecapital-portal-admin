import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/dataStore';
import { PageHeader } from '@/components/PageHeader';
import { ClientCombobox } from '@/components/ClientCombobox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  CONDICIONES_IVA,
  formatoFecha,
  FaktiaError,
  faktia,
  faktiaConfigurado,
  reintentarFaktia,
  formatoMoneda,
  hoyISO,
  numeroComprobante,
  type ConceptoArca,
  type CrearBorradorInput,
  type UnidadItem,
} from '@/lib/faktia';
import { INVOICES_QUERY_KEY } from '@/pages/Invoices';
import { montoAInput } from '@/lib/suscripciones';

type Linea = { descripcion: string; cantidad: string; unidad: UnidadItem; precioUnitario: string; alicuotaIva: string };


const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inicioMes = () => {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
};
const finMes = () => {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
const enDias = (n: number) => isoLocal(new Date(Date.now() + n * 86_400_000));

/** "1.234,5" o "1234.5" → "1234.5" (formato que pide Faktia). */
const aDecimal = (v: string) => {
  const limpio = v.trim().replace(/\s/g, '');
  const normalizado = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  return normalizado;
};
const DECIMAL = /^\d{1,11}(\.\d{1,4})?$/;

const lineaVacia = (alicuotaIva: string): Linea => ({
  descripcion: '',
  cantidad: '1',
  unidad: 'SERVICIO',
  precioUnitario: '',
  alicuotaIva,
});

const ResumenSeccion = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="space-y-1.5 border-t border-border pt-3 text-sm">
    <h3 className="eyebrow">{titulo}</h3>
    <dl className="space-y-1">{children}</dl>
  </section>
);

const ResumenDato = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words text-right">{children}</dd>
  </div>
);

/** "20384421998" → "20-38442199-8" */
const formatoCuit = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : v;
};

export const InvoiceForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clients, servicios } = useDataStore();

  const { data: config, isLoading: cargandoConfig, error: errorConfig } = useQuery({
    queryKey: ['faktia', 'configuracion'],
    queryFn: faktia.configuracion,
    enabled: faktiaConfigurado,
    staleTime: 10 * 60_000,
    retry: reintentarFaktia,
  });

  const alicuotaPorDefecto = '0'; // factura C: sin IVA discriminado

  const [clientId, setClientId] = useState('');
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [concepto, setConcepto] = useState<ConceptoArca>('SERVICIOS');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(finMes());
  const [vtoPago, setVtoPago] = useState(enDias(10));
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia('0')]);
  const [enviando, setEnviando] = useState<'borrador' | 'emitir' | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const puntoVenta = puntoVentaId || config?.puntosVenta[0]?.id || '';
  const cliente = clients.find((c) => c.id === clientId);
  const puntoVentaElegido = config?.puntosVenta.find((p) => p.id === puntoVenta);
  const sinDatosFiscales = Boolean(cliente && !cliente.fiscal);
  const esServicio = concepto !== 'PRODUCTOS';

  // Factura C: sin IVA discriminado
  const lineasEfectivas = useMemo(
    () => lineas.map((l) => ({ ...l, alicuotaIva: '0' })),
    [lineas]
  );

  const totales = useMemo(() => {
    let neto = 0;
    let iva = 0;
    for (const l of lineasEfectivas) {
      const sub = (Number(aDecimal(l.cantidad)) || 0) * (Number(aDecimal(l.precioUnitario)) || 0);
      neto += sub;
      iva += (sub * (Number(l.alicuotaIva) || 0)) / 100;
    }
    return { neto, iva, total: neto + iva };
  }, [lineasEfectivas]);

  /** Completa una línea con un servicio de pago único (reemplaza la línea vacía inicial). */
  const agregarServicio = (servicioId: string) => {
    const s = servicios.find((x) => x.id === servicioId);
    if (!s) return;
    const linea: Linea = { ...lineaVacia(alicuotaPorDefecto), descripcion: s.nombre, precioUnitario: montoAInput(s.precio) };
    setLineas((prev) =>
      prev.length === 1 && !prev[0].descripcion.trim() && !prev[0].precioUnitario.trim() ? [linea] : [...prev, linea]
    );
  };

  const setLinea = (i: number, cambios: Partial<Linea>) =>
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));

  const validar = () => {
    const e: Record<string, string> = {};
    if (!clientId) e.cliente = 'Elegí un cliente';
    else if (sinDatosFiscales) e.cliente = 'El cliente no tiene datos fiscales cargados';
    if (!puntoVenta) e.puntoVenta = 'No hay puntos de venta disponibles en Faktia';
    if (!fechaEmision) e.fechaEmision = 'Indicá la fecha';
    if (esServicio) {
      if (!desde || !hasta) e.periodo = 'Indicá el período facturado';
      else if (desde > hasta) e.periodo = 'La fecha "desde" no puede ser posterior a "hasta"';
      if (!vtoPago) e.vtoPago = 'Indicá el vencimiento de pago';
      else if (vtoPago < fechaEmision) e.vtoPago = 'El vencimiento no puede ser anterior a la emisión';
    }
    lineasEfectivas.forEach((l, i) => {
      if (!l.descripcion.trim()) e[`linea-${i}`] = 'Falta la descripción';
      else if (!DECIMAL.test(aDecimal(l.cantidad)) || Number(aDecimal(l.cantidad)) <= 0) e[`linea-${i}`] = 'Cantidad inválida';
      else if (!DECIMAL.test(aDecimal(l.precioUnitario)) || Number(aDecimal(l.precioUnitario)) <= 0)
        e[`linea-${i}`] = 'Falta el importe (ej. 79900 o 79.900,50)';
    });
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const [confirmarEmision, setConfirmarEmision] = useState(false);

  const enviar = async (modo: 'borrador' | 'emitir') => {
    if (!validar() || !cliente) {
      toast.error('Revisá los datos de la factura');
      return;
    }
    setEnviando(modo);
    let borradorId: string | null = null;
    try {
      const clienteFaktia = await faktia.asegurarCliente(cliente);
      const datos: CrearBorradorInput = {
        clienteId: clienteFaktia.id,
        puntoVentaId: puntoVenta,
        tipo: 'FACTURA_C', // EFE Capital emite siempre factura C (monotributo)
        fechaEmision,
        concepto,
        ...(esServicio ? { fechaServicioDesde: desde, fechaServicioHasta: hasta, fechaVtoPago: vtoPago } : {}),
        moneda: 'ARS', // siempre en pesos
        observaciones: observaciones.trim() || null,
        lineas: lineasEfectivas.map((l) => ({
          descripcion: l.descripcion.trim(),
          cantidad: aDecimal(l.cantidad),
          unidad: l.unidad,
          precioUnitario: aDecimal(l.precioUnitario),
          alicuotaIva: l.alicuotaIva,
        })),
      };
      const borrador = await faktia.crearBorrador(datos);
      borradorId = borrador.id;

      if (modo === 'borrador') {
        toast.success('Borrador guardado en Faktia', {
          description: borrador.advertenciaLetra ?? 'Podés emitirlo desde el listado de facturas.',
        });
      } else {
        const emitido = await faktia.emitir(borrador.id, borrador.version);
        if (emitido.estado === 'EMITIDO') {
          toast.success(`Factura ${numeroComprobante(emitido)} emitida`, { description: `CAE ${emitido.cae}` });
        } else {
          toast.message('Factura enviada a ARCA', { description: 'No se confirmó todavía; Faktia la verifica sola en unos minutos.' });
        }
      }
      await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      navigate('/invoices');
    } catch (err) {
      const e = err instanceof FaktiaError ? err : null;
      toast.error(e?.message ?? 'No se pudo crear la factura', { description: e?.detalle ?? undefined });
      // Si el borrador se creó pero ARCA rechazó, queda en el listado como "Rechazada" para corregirlo.
      if (borradorId) {
        await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
        navigate('/invoices');
      }
    } finally {
      setEnviando(null);
    }
  };

  if (!faktiaConfigurado || errorConfig) {
    return (
      <div className="flex-1 space-y-6 p-3 pt-16 sm:p-6 lg:pt-6">
        <PageHeader breadcrumbs={[{ label: 'Facturas', to: '/invoices' }, { label: 'Nueva factura' }]} title="Nueva factura" />
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

  return (
    <div className="flex-1 space-y-6 p-3 pt-16 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Facturas', to: '/invoices' }, { label: 'Nueva factura' }]}
        title="Nueva factura"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Emitir siempre pide confirmación (una factura emitida solo se anula con nota de crédito)
          if (!validar() || !cliente) {
            toast.error('Revisá los datos de la factura');
            return;
          }
          setConfirmarEmision(true);
        }}
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          {/* Cliente y comprobante */}
          <Card>
            <CardHeader>
              <CardTitle>Comprobante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <ClientCombobox
                  id="cliente"
                  clients={clients}
                  value={clientId}
                  onChange={setClientId}
                  allowAll={false}
                  placeholder="Seleccionar cliente"
                  invalid={Boolean(errores.cliente)}
                />
                {cliente?.fiscal && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cliente.fiscal.tipoDocumento} {cliente.fiscal.numeroDocumento} ·{' '}
                    {CONDICIONES_IVA.find((c) => c.value === cliente.fiscal!.condicionIva)?.label}
                  </p>
                )}
                {sinDatosFiscales && (
                  <p className="mt-2 border-l-2 border-gold bg-gold/10 p-2 text-sm">
                    Este cliente no tiene datos fiscales.{' '}
                    <Link to={`/clients/${clientId}/edit`} className="font-medium text-primary underline-offset-4 hover:underline">
                      Completarlos
                    </Link>
                  </p>
                )}
                {errores.cliente && !sinDatosFiscales && <p className="mt-1 text-sm text-destructive">{errores.cliente}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="puntoVenta">Punto de venta</Label>
                  <Select value={puntoVenta} onValueChange={setPuntoVentaId} disabled={cargandoConfig}>
                    <SelectTrigger id="puntoVenta" className={errores.puntoVenta ? 'border-destructive' : ''}>
                      <SelectValue placeholder={cargandoConfig ? 'Cargando…' : 'Sin puntos de venta'} />
                    </SelectTrigger>
                    <SelectContent>
                      {config?.puntosVenta.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {String(p.numero).padStart(4, '0')}
                          {p.descripcion ? ` · ${p.descripcion}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fechaEmision">Fecha de emisión</Label>
                  <Input id="fechaEmision" type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="concepto">Concepto</Label>
                  <Select value={concepto} onValueChange={(v) => setConcepto(v as ConceptoArca)}>
                    <SelectTrigger id="concepto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICIOS">Servicios</SelectItem>
                      <SelectItem value="PRODUCTOS">Productos</SelectItem>
                      <SelectItem value="PRODUCTOS_Y_SERVICIOS">Productos y servicios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {esServicio && (
                <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="desde">Período desde</Label>
                    <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={errores.periodo ? 'border-destructive' : ''} />
                  </div>
                  <div>
                    <Label htmlFor="hasta">Período hasta</Label>
                    <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={errores.periodo ? 'border-destructive' : ''} />
                  </div>
                  <div>
                    <Label htmlFor="vtoPago">Vencimiento de pago</Label>
                    <Input id="vtoPago" type="date" value={vtoPago} onChange={(e) => setVtoPago(e.target.value)} className={errores.vtoPago ? 'border-destructive' : ''} />
                  </div>
                  {(errores.periodo || errores.vtoPago) && (
                    <p className="text-sm text-destructive sm:col-span-3">{errores.periodo ?? errores.vtoPago}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Líneas */}
          <Card>
            <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Detalle</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                {servicios.length > 0 && (
                  <Select value="" onValueChange={agregarServicio}>
                    <SelectTrigger className="h-9 sm:w-64" aria-label="Agregar servicio">
                      <SelectValue placeholder="Agregar servicio…" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicios.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre} · {formatoMoneda(s.precio)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setLineas((p) => [...p, lineaVacia(alicuotaPorDefecto)])}>
                  <Plus className="h-4 w-4" />
                  Agregar línea
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineasEfectivas.map((l, i) => (
                // Cantidad 1, unidad Servicio e IVA según el emisor van fijos: solo se cargan descripción y precio
                <div key={i} className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
                    <Input
                      value={l.descripcion}
                      onChange={(e) => setLinea(i, { descripcion: e.target.value })}
                      placeholder="Descripción (ej. Honorarios asesoría financiera)"
                      aria-label="Descripción"
                      className={`col-span-2 sm:col-span-1 ${errores[`linea-${i}`] && !l.descripcion.trim() ? 'border-destructive' : ''}`}
                    />
                    <Input
                      inputMode="decimal"
                      value={l.precioUnitario}
                      onChange={(e) => setLinea(i, { precioUnitario: e.target.value })}
                      placeholder="Importe"
                      aria-label="Importe"
                      className={`text-right tabular-nums ${errores[`linea-${i}`] && l.descripcion.trim() ? 'border-destructive' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 text-muted-foreground hover:text-destructive"
                      onClick={() => setLineas((p) => p.filter((_, idx) => idx !== i))}
                      disabled={lineas.length === 1}
                      aria-label="Quitar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {errores[`linea-${i}`] && <p className="text-sm text-destructive">{errores[`linea-${i}`]}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Opcional. Se imprime en la factura."
              />
            </CardContent>
          </Card>
        </div>

        {/* Resumen + acciones */}
        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config && config.emisor.ambiente !== 'PRODUCCION' && (
              <p className="border-l-2 border-gold bg-gold/10 p-2 text-xs">
                Ambiente de prueba (homologación): las facturas no tienen validez fiscal.
              </p>
            )}

            <ResumenSeccion titulo="Emisor">
              {config ? (
                <>
                  <ResumenDato label="Razón social">{config.emisor.razonSocial}</ResumenDato>
                  <ResumenDato label="CUIT">{formatoCuit(config.emisor.cuit)}</ResumenDato>
                  <ResumenDato label="Condición IVA">
                    {CONDICIONES_IVA.find((c) => c.value === config.emisor.condicionIva)?.label ?? config.emisor.condicionIva}
                  </ResumenDato>
                  {config.emisor.domicilioFiscal && <ResumenDato label="Domicilio">{config.emisor.domicilioFiscal}</ResumenDato>}
                  {config.emisor.ingresosBrutos && <ResumenDato label="IIBB">{config.emisor.ingresosBrutos}</ResumenDato>}
                  {config.emisor.inicioActividades && (
                    <ResumenDato label="Inicio de act.">{formatoFecha(config.emisor.inicioActividades)}</ResumenDato>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">{cargandoConfig ? 'Cargando…' : '—'}</p>
              )}
            </ResumenSeccion>

            <ResumenSeccion titulo="Comprobante">
              <ResumenDato label="Tipo">Factura C</ResumenDato>
              <ResumenDato label="Punto de venta">
                {puntoVentaElegido ? String(puntoVentaElegido.numero).padStart(4, '0') : '—'}
              </ResumenDato>
              <ResumenDato label="Fecha">{formatoFecha(fechaEmision)}</ResumenDato>
              {esServicio && (
                <>
                  <ResumenDato label="Período">
                    {formatoFecha(desde)} al {formatoFecha(hasta)}
                  </ResumenDato>
                  <ResumenDato label="Vencimiento">{formatoFecha(vtoPago)}</ResumenDato>
                </>
              )}
              <ResumenDato label="Moneda">Pesos (ARS)</ResumenDato>
            </ResumenSeccion>

            <ResumenSeccion titulo="Receptor">
              {cliente ? (
                <>
                  <ResumenDato label="Cliente">{cliente.fiscal?.razonSocial || `${cliente.firstName} ${cliente.lastName}`.trim()}</ResumenDato>
                  {cliente.fiscal ? (
                    <>
                      <ResumenDato label={cliente.fiscal.tipoDocumento}>
                        {cliente.fiscal.tipoDocumento === 'CUIT' || cliente.fiscal.tipoDocumento === 'CUIL'
                          ? formatoCuit(cliente.fiscal.numeroDocumento)
                          : cliente.fiscal.numeroDocumento}
                      </ResumenDato>
                      <ResumenDato label="Condición IVA">
                        {CONDICIONES_IVA.find((c) => c.value === cliente.fiscal!.condicionIva)?.label ?? cliente.fiscal.condicionIva}
                      </ResumenDato>
                      {cliente.fiscal.domicilio && <ResumenDato label="Domicilio">{cliente.fiscal.domicilio}</ResumenDato>}
                    </>
                  ) : (
                    <p className="text-gold">Sin datos fiscales</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Elegí un cliente</p>
              )}
            </ResumenSeccion>

            <dl className="text-sm">
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-display tabular-nums text-primary">{formatoMoneda(totales.total)}</dd>
              </div>
            </dl>

            <div className="space-y-2 border-t border-border pt-4">
              <Button type="submit" className="w-full" disabled={Boolean(enviando) || cargandoConfig}>
                {enviando === 'emitir' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Emitir factura
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => enviar('borrador')}
                disabled={Boolean(enviando) || cargandoConfig}
              >
                {enviando === 'borrador' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar borrador
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <AlertDialog open={confirmarEmision} onOpenChange={setConfirmarEmision}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Emitir la factura?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="text-foreground">
                  Factura C a {cliente ? `${cliente.firstName} ${cliente.lastName}`.trim() : '—'} por {formatoMoneda(totales.total)}
                </p>
                <p>Se envía a ARCA y obtiene CAE. No se puede deshacer: una factura emitida solo se anula con una nota de crédito.</p>
                {config && config.emisor.ambiente !== 'PRODUCCION' && (
                  <p className="border-l-2 border-gold bg-gold/10 p-2 text-foreground">
                    Faktia está en ambiente de prueba: la factura no tiene validez fiscal.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => enviar('emitir')}>Emitir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
