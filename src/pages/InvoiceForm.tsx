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
  CONDICIONES_IVA,
  FaktiaError,
  faktia,
  faktiaConfigurado,
  formatoMoneda,
  hoyISO,
  numeroComprobante,
  type ConceptoArca,
  type CrearBorradorInput,
  type Moneda,
  type UnidadItem,
} from '@/lib/faktia';
import { INVOICES_QUERY_KEY } from '@/pages/Invoices';

type Linea = { descripcion: string; cantidad: string; unidad: UnidadItem; precioUnitario: string; alicuotaIva: string };

const ALICUOTAS = ['21', '10.5', '27', '5', '2.5', '0'];
const UNIDADES: Array<{ value: UnidadItem; label: string }> = [
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'MES', label: 'Mes' },
  { value: 'HORA', label: 'Hora' },
  { value: 'UNIDAD', label: 'Unidad' },
];

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

export const InvoiceForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clients } = useDataStore();

  const { data: config, isLoading: cargandoConfig, error: errorConfig } = useQuery({
    queryKey: ['faktia', 'configuracion'],
    queryFn: faktia.configuracion,
    enabled: faktiaConfigurado,
    staleTime: 10 * 60_000,
  });

  // El emisor monotributista factura C sin IVA discriminado
  const emisorMonotributo = config?.emisor.condicionIva?.startsWith('MONOTRIBUTO') ?? false;
  const alicuotaPorDefecto = emisorMonotributo ? '0' : '21';

  const [clientId, setClientId] = useState('');
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const [tipo, setTipo] = useState<'AUTO' | 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C'>('AUTO');
  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [concepto, setConcepto] = useState<ConceptoArca>('SERVICIOS');
  const [desde, setDesde] = useState(inicioMes());
  const [hasta, setHasta] = useState(finMes());
  const [vtoPago, setVtoPago] = useState(enDias(10));
  const [moneda, setMoneda] = useState<Moneda>('ARS');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia('21')]);
  const [enviando, setEnviando] = useState<'borrador' | 'emitir' | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const puntoVenta = puntoVentaId || config?.puntosVenta[0]?.id || '';
  const cliente = clients.find((c) => c.id === clientId);
  const sinDatosFiscales = Boolean(cliente && !cliente.fiscal);
  const esServicio = concepto !== 'PRODUCTOS';

  // Si el emisor es monotributista, las líneas nuevas arrancan en 0% (al cargar la config)
  const lineasEfectivas = useMemo(
    () => (emisorMonotributo ? lineas.map((l) => ({ ...l, alicuotaIva: '0' })) : lineas),
    [lineas, emisorMonotributo]
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
        e[`linea-${i}`] = 'Precio inválido';
    });
    setErrores(e);
    return Object.keys(e).length === 0;
  };

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
        ...(tipo !== 'AUTO' ? { tipo } : {}),
        fechaEmision,
        concepto,
        ...(esServicio ? { fechaServicioDesde: desde, fechaServicioHasta: hasta, fechaVtoPago: vtoPago } : {}),
        moneda,
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
        description={
          config
            ? `Emisor: ${config.emisor.razonSocial} · CUIT ${config.emisor.cuit}${config.emisor.ambiente !== 'PRODUCCION' ? ' · AMBIENTE DE PRUEBA' : ''}`
            : undefined
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar('emitir');
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
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                    <SelectTrigger id="tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Automático</SelectItem>
                      <SelectItem value="FACTURA_A">Factura A</SelectItem>
                      <SelectItem value="FACTURA_B">Factura B</SelectItem>
                      <SelectItem value="FACTURA_C">Factura C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fechaEmision">Fecha de emisión</Label>
                  <Input id="fechaEmision" type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
                </div>
              </div>
              {tipo === 'AUTO' && (
                <p className="text-xs text-muted-foreground">
                  Faktia elige la letra según la condición de IVA del emisor y del cliente.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <div>
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
                    <SelectTrigger id="moneda">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Detalle</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setLineas((p) => [...p, lineaVacia(alicuotaPorDefecto)])}>
                <Plus className="h-4 w-4" />
                Agregar línea
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineasEfectivas.map((l, i) => (
                <div key={i} className="space-y-2 border border-border p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={l.descripcion}
                      onChange={(e) => setLinea(i, { descripcion: e.target.value })}
                      placeholder="Descripción (ej. Honorarios asesoría financiera)"
                      aria-label="Descripción"
                      className={errores[`linea-${i}`] && !l.descripcion.trim() ? 'border-destructive' : ''}
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Cantidad</Label>
                      <Input inputMode="decimal" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Unidad</Label>
                      <Select value={l.unidad} onValueChange={(v) => setLinea(i, { unidad: v as UnidadItem })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Precio unitario (sin IVA)</Label>
                      <Input
                        inputMode="decimal"
                        value={l.precioUnitario}
                        onChange={(e) => setLinea(i, { precioUnitario: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">IVA</Label>
                      <Select value={l.alicuotaIva} onValueChange={(v) => setLinea(i, { alicuotaIva: v })} disabled={emisorMonotributo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALICUOTAS.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a.replace('.', ',')}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {errores[`linea-${i}`] && <p className="text-sm text-destructive">{errores[`linea-${i}`]}</p>}
                </div>
              ))}
              {emisorMonotributo && (
                <p className="text-xs text-muted-foreground">El emisor es monotributista: la factura no discrimina IVA.</p>
              )}
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
            <dl className="space-y-2 text-sm">
              {!emisorMonotributo && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Neto gravado</dt>
                    <dd className="tabular-nums">{formatoMoneda(totales.neto, moneda)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IVA</dt>
                    <dd className="tabular-nums">{formatoMoneda(totales.iva, moneda)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-display tabular-nums text-primary">{formatoMoneda(totales.total, moneda)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">Importe estimado: el definitivo lo calcula Faktia al emitir.</p>

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
              <p className="text-xs text-muted-foreground">
                Emitir la envía a ARCA y obtiene el CAE. Una factura emitida solo se anula con una nota de crédito.
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
