import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Package,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { faktiaConfigurado, formatoMoneda, referenciaBroker, type FaktiaComprobante } from '@/lib/faktia';
import { etiquetaPeriodo, montoActual, montoEn, periodoAFacturar, suscripcionActiva } from '@/lib/suscripciones';
import { clienteHabilitado } from '@/lib/clientes';
import { SuscripcionIcon } from '@/components/icons/SuscripcionIcon';
import { netoDe, useFacturacionPeriodo } from '@/hooks/useFacturacionPeriodo';

/** Factura emitida o enviada a ARCA (lo que ya no hay que volver a emitir). */
const resuelta = (c?: FaktiaComprobante) =>
  c?.estado === 'EMITIDO' || c?.estado === 'EMITIENDO' || c?.estado === 'PENDIENTE_VERIFICACION';

const Tile = ({
  to,
  label,
  icon: Icon,
  value,
  caption,
  highlight,
  children,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  value: ReactNode;
  caption: ReactNode;
  highlight?: boolean;
  children?: ReactNode;
}) => (
  <Link to={to} className="group relative flex flex-col bg-card p-6 transition-colors hover:bg-secondary">
    <span className="brand-bar absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity group-hover:opacity-100" />
    <div className="flex items-center justify-between">
      <span className="eyebrow">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className={`mt-6 font-display text-4xl font-semibold tabular-nums ${highlight ? 'text-gold' : 'text-primary'}`}>{value}</p>
    {children}
    <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{caption}</span>
      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
    </div>
  </Link>
);

const Progreso = ({ valor, total }: { valor: number; total: number }) => (
  <div className="mt-3 h-1 w-full bg-secondary" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={total}>
    <div className={`h-full ${valor >= total ? 'bg-success' : 'bg-primary'}`} style={{ width: `${total ? Math.min(100, (valor / total) * 100) : 0}%` }} />
  </div>
);

const MAX_PENDIENTES = 8;

const Index = () => {
  const { clients } = useDataStore();
  const periodo = periodoAFacturar();
  const mes = etiquetaPeriodo(periodo);
  const { suscriptos, brokers, facturas, serviciosFacturados, cargando, error } = useFacturacionPeriodo(periodo);
  const datosFaktia = faktiaConfigurado && !cargando && !error;

  // ── Facturación del mes vencido ──────────────────────────────────────────
  const clientesFacturados = suscriptos.filter((c) => resuelta(facturas.get(c.id)));
  const clientesPendientes = suscriptos.filter((c) => !resuelta(facturas.get(c.id)));
  const totalFacturadoClientes = clientesFacturados.reduce((a, c) => a + netoDe(facturas.get(c.id)!), 0);
  const totalPendienteClientes = clientesPendientes.reduce((a, c) => a + (montoEn(c.suscripcion!, periodo) ?? 0), 0);

  const brokersFacturados = brokers.filter((b) => resuelta(facturas.get(referenciaBroker(b.id))));
  const brokersPendientes = brokers.filter((b) => !resuelta(facturas.get(referenciaBroker(b.id))));
  const totalComisiones = brokersFacturados.reduce((a, b) => a + netoDe(facturas.get(referenciaBroker(b.id))!), 0);

  // ── Cartera ──────────────────────────────────────────────────────────────
  const activas = clients.filter((c) => clienteHabilitado(c) && c.suscripcion && suscripcionActiva(c.suscripcion));
  const ingresoMensual = activas.reduce((a, c) => a + (montoActual(c.suscripcion!) ?? 0), 0);

  const pendientes = [
    ...clientesPendientes.map((c) => ({
      key: c.id,
      nombre: `${c.firstName} ${c.lastName}`.trim(),
      tipo: 'Suscripción',
      monto: montoEn(c.suscripcion!, periodo),
      sinFiscal: !c.fiscal,
      editar: `/clients/${c.id}/edit`,
    })),
    ...brokersPendientes.map((b) => ({
      key: b.id,
      nombre: b.name,
      tipo: 'Comisiones',
      monto: undefined,
      sinFiscal: !b.fiscal,
      editar: `/brokers/${b.id}/edit`,
    })),
  ];

  return (
    <div className="flex-1 p-3 pt-16 sm:p-6 lg:pt-6">
      <div className="space-y-6">
        <PageHeader breadcrumbs={[{ label: 'Dashboard' }]} title="Dashboard" />

        {/* Recordatorio de facturación */}
        {!faktiaConfigurado ? (
          <p className="border-l-2 border-gold bg-gold/10 p-3 text-sm">
            La integración con Faktia no está configurada: no se puede consultar el estado de la facturación.
          </p>
        ) : cargando ? (
          <p className="flex items-center gap-2 border-l-2 border-border bg-secondary p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consultando la facturación de {mes} en Faktia…
          </p>
        ) : error ? (
          <p className="flex items-center gap-2 border-l-2 border-destructive bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            No se pudo consultar Faktia. El estado de la facturación de {mes} no está disponible.
          </p>
        ) : pendientes.length > 0 ? (
          <div className="flex flex-col gap-3 border-l-2 border-gold bg-gold/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium">Facturación de {mes} pendiente</p>
              <p className="text-muted-foreground">
                {[
                  clientesPendientes.length > 0 &&
                    `${clientesPendientes.length} ${clientesPendientes.length === 1 ? 'suscripción' : 'suscripciones'} (${formatoMoneda(totalPendienteClientes)})`,
                  brokersPendientes.length > 0 &&
                    `${brokersPendientes.length} ${brokersPendientes.length === 1 ? 'broker' : 'brokers'} sin factura de comisiones`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/invoices/monthly">
                <CalendarCheck className="h-4 w-4" />
                Ir a Facturación mensual
              </Link>
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-2 border-l-2 border-success bg-success/10 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            La facturación de {mes} está completa.
          </p>
        )}

        {/* Estado del mes */}
        <section className="space-y-3">
          <h2 className="eyebrow">Facturación de {mes}</h2>
          <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-4">
            <Tile
              to="/invoices/monthly"
              label="Suscripciones"
              icon={CalendarCheck}
              value={datosFaktia ? `${clientesFacturados.length}/${suscriptos.length}` : '—'}
              caption={datosFaktia ? `Facturado ${formatoMoneda(totalFacturadoClientes)}` : 'Sin datos de Faktia'}
            >
              {datosFaktia && <Progreso valor={clientesFacturados.length} total={suscriptos.length} />}
            </Tile>
            <Tile
              to="/invoices/monthly"
              label="Comisiones de brokers"
              icon={Building2}
              value={datosFaktia ? `${brokersFacturados.length}/${brokers.length}` : '—'}
              caption={datosFaktia ? `Facturado ${formatoMoneda(totalComisiones)}` : 'Sin datos de Faktia'}
            >
              {datosFaktia && <Progreso valor={brokersFacturados.length} total={brokers.length} />}
            </Tile>
            <Tile
              to="/invoices"
              label="Servicios"
              icon={Package}
              value={datosFaktia ? serviciosFacturados.facturas : '—'}
              caption={datosFaktia ? `Pagos únicos · ${formatoMoneda(serviciosFacturados.neto)}` : 'Sin datos de Faktia'}
            />
            <Tile
              to="/invoices"
              label="Total facturado"
              icon={Wallet}
              value={
                datosFaktia
                  ? formatoMoneda(totalFacturadoClientes + totalComisiones + serviciosFacturados.neto).replace(/,\d{2}$/, '')
                  : '—'
              }
              caption="Sin IVA, suscripciones + comisiones + servicios"
            />
          </div>
        </section>

        {/* Cartera */}
        <section className="space-y-3">
          <h2 className="eyebrow">Cartera</h2>
          <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-2">
            <Tile
              to="/clients"
              label="Clientes"
              icon={Users}
              value={clients.filter(clienteHabilitado).length}
              caption={`${activas.length} con suscripción activa`}
            />
            <Tile
              to="/plans"
              label="Ingreso mensual"
              icon={SuscripcionIcon}
              value={formatoMoneda(ingresoMensual).replace(/,\d{2}$/, '')}
              caption="Suma de suscripciones activas"
            />
          </div>
        </section>

        {/* Pendientes */}
        {datosFaktia && pendientes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Pendientes de {mes} ({pendientes.length})</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/invoices/monthly">Facturar</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border border border-border">
                {pendientes.slice(0, MAX_PENDIENTES).map((p) => (
                  <li key={`${p.tipo}-${p.key}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
                    <span className="hidden w-28 text-muted-foreground sm:block">{p.tipo}</span>
                    {p.sinFiscal ? (
                      <Link to={p.editar} className="w-36 text-right text-xs font-medium text-gold underline-offset-4 hover:underline">
                        Faltan datos fiscales
                      </Link>
                    ) : (
                      <span className="w-36 text-right tabular-nums text-muted-foreground">
                        {p.monto !== undefined ? formatoMoneda(p.monto) : 'A cargar'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {pendientes.length > MAX_PENDIENTES && (
                <p className="mt-2 text-xs text-muted-foreground">
                  y {pendientes.length - MAX_PENDIENTES} más en Facturación mensual.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
