import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Edit } from 'lucide-react';
import type { Client } from '@/types';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailLink, WhatsAppLink } from '@/components/ContactLinks';
import { CONDICIONES_IVA, formatoMoneda } from '@/lib/faktia';
import { estaAtrasado, etiquetaPeriodo, montoActual } from '@/lib/suscripciones';
import { useDataStore } from '@/stores/dataStore';

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="space-y-3 border-t border-border pt-5">
    <h3 className="eyebrow">{titulo}</h3>
    {children}
  </section>
);

const Dato = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
);

const fecha = (valor: unknown, patron = 'dd/MM/yyyy') => {
  const d = valor instanceof Date ? valor : new Date(valor as string);
  return Number.isNaN(d.getTime()) ? '—' : format(d, patron, { locale: es });
};

const colorPerfil = (perfil: string) => {
  switch (perfil?.toLowerCase()) {
    case 'conservador':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'moderado':
      return 'bg-gold/10 text-gold border-gold/30';
    case 'agresivo':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const MAX_NOTAS = 3;

/** Panel lateral con el resumen de un cliente (mismo formato que el detalle de facturas). */
export const ClientDetailSheet = ({
  client: c,
  onOpenChange,
}: {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
}) => {
  const planes = useDataStore((s) => s.planes);
  const notas = c?.notes
    ? [...c.notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <Sheet open={Boolean(c)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {c && (
          <div className="space-y-5">
            <SheetHeader className="space-y-2 text-left">
              <div>
                <Badge variant="outline" className={colorPerfil(c.investorProfile)}>
                  {c.investorProfile}
                </Badge>
              </div>
              <SheetTitle className="font-display text-xl">
                {c.firstName} {c.lastName}
              </SheetTitle>
              <SheetDescription>Cliente desde el {fecha(c.createdAt)}</SheetDescription>
            </SheetHeader>

            <Seccion titulo="Contacto">
              <dl className="space-y-2">
                <Dato label="Email">{c.email ? <EmailLink email={c.email} /> : '—'}</Dato>
                <Dato label="Teléfono">{c.phone ? <WhatsAppLink telefono={c.phone} /> : '—'}</Dato>
              </dl>
            </Seccion>

            <Seccion titulo="Inversión">
              <dl className="space-y-2">
                <Dato label={c.brokers.length > 1 ? 'Brokers' : 'Broker'}>
                  {c.brokers.length ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {c.brokers.map((b) => (
                        <span key={b} className="border border-border bg-secondary px-1.5 py-0.5 text-xs font-medium">
                          {b}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )}
                </Dato>
                <Dato label="Horizonte">{c.investmentHorizon || '—'}</Dato>
              </dl>
            </Seccion>

            <Seccion titulo="Datos fiscales">
              {c.fiscal ? (
                <dl className="space-y-2">
                  <Dato label={c.fiscal.tipoDocumento}>
                    <span className="tabular-nums">{c.fiscal.numeroDocumento}</span>
                  </Dato>
                  <Dato label="Condición IVA">
                    {CONDICIONES_IVA.find((x) => x.value === c.fiscal!.condicionIva)?.label ?? c.fiscal.condicionIva}
                  </Dato>
                  {c.fiscal.razonSocial && <Dato label="Razón social">{c.fiscal.razonSocial}</Dato>}
                  {c.fiscal.domicilio && <Dato label="Domicilio">{c.fiscal.domicilio}</Dato>}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin datos fiscales: hacen falta para facturarle.{' '}
                  <Link to={`/clients/${c.id}/edit`} className="font-medium text-primary underline-offset-4 hover:underline">
                    Completarlos
                  </Link>
                </p>
              )}
            </Seccion>

            <Seccion titulo="Suscripción">
              {c.suscripcion ? (
                <dl className="space-y-2">
                  <Dato label="Plan">{planes.find((p) => p.id === c.suscripcion!.planId)?.nombre ?? 'Sin plan'}</Dato>
                  <Dato label="Monto mensual">
                    <span className="tabular-nums">{formatoMoneda(montoActual(c.suscripcion) ?? 0)}</span>
                    {estaAtrasado(c.suscripcion, planes) && (
                      <span className="ml-2 border border-gold/30 bg-gold/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-gold">
                        Atrasado
                      </span>
                    )}
                  </Dato>
                  <Dato label="Desde">{etiquetaPeriodo(c.suscripcion.desde)}</Dato>
                  {c.suscripcion.hasta && <Dato label="Baja">Último mes: {etiquetaPeriodo(c.suscripcion.hasta)}</Dato>}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No tiene suscripción mensual.</p>
              )}
            </Seccion>

            <Seccion titulo="Objetivos de inversión">
              <div
                className="prose prose-sm max-w-none leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: c.objectives || '<p>Sin objetivos registrados.</p>' }}
              />
            </Seccion>

            <Seccion titulo={`Notas${notas.length ? ` (${notas.length})` : ''}`}>
              {notas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay notas registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {notas.slice(0, MAX_NOTAS).map((n, i) => (
                    <li key={`${n.date}-${i}`} className="border border-border p-3">
                      <p className="text-xs font-medium text-primary">{fecha(n.date, 'dd/MM/yyyy HH:mm')}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{n.text}</p>
                    </li>
                  ))}
                  {notas.length > MAX_NOTAS && (
                    <li className="text-xs text-muted-foreground">
                      y {notas.length - MAX_NOTAS} más en la ficha completa.
                    </li>
                  )}
                </ul>
              )}
            </Seccion>

            <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
              <Button asChild>
                <Link to={`/clients/${c.id}/edit`}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/clients/${c.id}`}>
                  Ver ficha completa
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
