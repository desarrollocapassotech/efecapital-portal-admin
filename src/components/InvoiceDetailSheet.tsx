import type { ReactNode } from 'react';
import { FileMinus, FileText } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CONDICIONES_IVA,
  ESTADOS,
  claseDe,
  formatoFecha,
  formatoMoneda,
  letraDe,
  numeroComprobante,
  type FaktiaComprobante,
} from '@/lib/faktia';

const UNIDADES: Record<string, string> = { HORA: 'Hora', UNIDAD: 'Unidad', SERVICIO: 'Servicio', MES: 'Mes' };
const CONCEPTOS: Record<string, string> = {
  PRODUCTOS: 'Productos',
  SERVICIOS: 'Servicios',
  PRODUCTOS_Y_SERVICIOS: 'Productos y servicios',
};

const numero = (v: string, decimales = 2) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: decimales }).format(Number(v) || 0);

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="space-y-3 border-t border-border pt-5">
    <h3 className="eyebrow">{titulo}</h3>
    {children}
  </section>
);

const Dato = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
);

/** Panel lateral con el detalle completo de un comprobante de Faktia. */
export const InvoiceDetailSheet = ({
  comprobante: c,
  notasCredito = [],
  onOpenChange,
  onVerPdf,
}: {
  comprobante: FaktiaComprobante | null;
  notasCredito?: FaktiaComprobante[];
  onOpenChange: (open: boolean) => void;
  onVerPdf: (c: FaktiaComprobante) => void;
}) => (
  <Sheet open={Boolean(c)} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
      {c && (
        <div className="space-y-5">
          <SheetHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={ESTADOS[c.estado].className}>
                {ESTADOS[c.estado].label}
              </Badge>
              {c.ambiente && c.ambiente !== 'PRODUCCION' && (
                <span className="bg-gold-light/30 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-gold">
                  Prueba
                </span>
              )}
            </div>
            <SheetTitle className="font-display text-xl">
              {claseDe(c.tipo)} {letraDe(c.tipo)} <span className="font-mono tabular-nums">{numeroComprobante(c)}</span>
            </SheetTitle>
            <SheetDescription>
              Emitida el {formatoFecha(c.fechaEmision)}
              {c.emitidoEn ? ` · enviada a ARCA el ${new Date(c.emitidoEn).toLocaleString('es-AR')}` : ''}
            </SheetDescription>
          </SheetHeader>

          {c.error && (
            <div className="border-l-2 border-destructive bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">{c.error.mensaje}</p>
              {c.error.detalle && <p className="mt-1 text-muted-foreground">{c.error.detalle}</p>}
            </div>
          )}

          <Seccion titulo="Cliente">
            <dl className="space-y-2">
              <Dato label="Razón social">{c.cliente.razonSocial}</Dato>
              <Dato label={c.cliente.tipoDocumento === 'CONSUMIDOR_FINAL' ? 'Documento' : c.cliente.tipoDocumento}>
                <span className="tabular-nums">{c.cliente.numeroDocumento || '—'}</span>
              </Dato>
              <Dato label="Condición IVA">
                {CONDICIONES_IVA.find((x) => x.value === c.cliente.condicionIva)?.label ?? c.cliente.condicionIva}
              </Dato>
              {c.cliente.domicilio && <Dato label="Domicilio">{c.cliente.domicilio}</Dato>}
              {c.cliente.email && <Dato label="Email">{c.cliente.email}</Dato>}
            </dl>
          </Seccion>

          <Seccion titulo="Comprobante">
            <dl className="space-y-2">
              <Dato label="Concepto">{CONCEPTOS[c.concepto] ?? c.concepto}</Dato>
              {c.periodo && (
                <Dato label="Período">
                  {formatoFecha(c.periodo.desde)} al {formatoFecha(c.periodo.hasta)}
                </Dato>
              )}
              {c.vencimientoPago && <Dato label="Vto. de pago">{formatoFecha(c.vencimientoPago)}</Dato>}
              <Dato label="Moneda">
                {c.moneda}
                {c.moneda !== 'ARS' && ` · cotización ${numero(c.cotizacion, 4)}`}
              </Dato>
              {c.asociado && (
                <Dato label="Asociado a">
                  {claseDe(c.asociado.tipo)} {letraDe(c.asociado.tipo)} {numeroComprobante({ puntoVenta: c.puntoVenta, numero: c.asociado.numero })}
                </Dato>
              )}
            </dl>
          </Seccion>

          <Seccion titulo="Detalle">
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Descripción</th>
                    <th className="px-3 py-2 text-right font-medium">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium">Precio unit.</th>
                    <th className="px-3 py-2 text-right font-medium">IVA</th>
                    <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {c.lineas.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        {l.descripcion}
                        {Number(l.bonificacionPct) > 0 && (
                          <span className="block text-xs text-muted-foreground">Bonificación {numero(l.bonificacionPct)}%</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {numero(l.cantidad, 4)} <span className="text-xs text-muted-foreground">{UNIDADES[l.unidad] ?? l.unidad}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatoMoneda(l.precioUnitario, c.moneda)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{numero(l.alicuotaIva)}%</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatoMoneda(l.importeNeto, c.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Neto gravado</dt>
                <dd className="tabular-nums">{formatoMoneda(c.importes.netoGravado, c.moneda)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="tabular-nums">{formatoMoneda(c.importes.iva, c.moneda)}</dd>
              </div>
              {Number(c.importes.tributos) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Otros tributos</dt>
                  <dd className="tabular-nums">{formatoMoneda(c.importes.tributos, c.moneda)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-display tabular-nums text-primary">{formatoMoneda(c.importes.total, c.moneda)}</dd>
              </div>
            </dl>
          </Seccion>

          {(c.cae || c.observaciones) && (
            <Seccion titulo="Datos fiscales">
              <dl className="space-y-2">
                {c.cae && (
                  <>
                    <Dato label="CAE">
                      <span className="font-mono tabular-nums">{c.cae}</span>
                    </Dato>
                    <Dato label="Vto. CAE">{formatoFecha(c.caeVencimiento)}</Dato>
                  </>
                )}
                {c.observaciones && <Dato label="Observaciones">{c.observaciones}</Dato>}
              </dl>
            </Seccion>
          )}

          {notasCredito.length > 0 && (
            <Seccion titulo="Notas de crédito">
              <ul className="space-y-2">
                {notasCredito.map((nc) => (
                  <li key={nc.id} className="flex items-center justify-between gap-3 border border-border p-3 text-sm">
                    <div>
                      <p className="font-mono tabular-nums">{numeroComprobante(nc)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFecha(nc.fechaEmision)} · {formatoMoneda(nc.importes.total, nc.moneda)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onVerPdf(nc)} title="Ver nota de crédito" aria-label={`Ver nota de crédito ${numeroComprobante(nc)}`}>
                      <FileMinus className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}

          {c.cae && (
            <div className="border-t border-border pt-5">
              <Button onClick={() => onVerPdf(c)} className="w-full sm:w-auto">
                <FileText className="h-4 w-4" />
                Ver PDF
              </Button>
            </div>
          )}
        </div>
      )}
    </SheetContent>
  </Sheet>
);
