import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Edit } from 'lucide-react';
import type { Broker, Client } from '@/types';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailLink, WhatsAppLink } from '@/components/ContactLinks';
import { CONDICIONES_IVA } from '@/lib/faktia';

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

/** Panel lateral con el resumen de un broker. */
export const BrokerDetailSheet = ({
  broker: b,
  clientes,
  onOpenChange,
}: {
  broker: Broker | null;
  clientes: Client[];
  onOpenChange: (open: boolean) => void;
}) => (
  <Sheet open={Boolean(b)} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
      {b && (
        <div className="space-y-5">
          <SheetHeader className="space-y-2 text-left">
            <div>
              <Badge
                variant="outline"
                className={b.fiscal ? 'border-success/30 bg-success/10 text-success' : 'border-gold/30 bg-gold/10 text-gold'}
              >
                {b.fiscal ? 'Listo para facturar' : 'Faltan datos fiscales'}
              </Badge>
            </div>
            <SheetTitle className="font-display text-xl">{b.name}</SheetTitle>
            <SheetDescription>
              {clientes.length === 1 ? '1 cliente' : `${clientes.length} clientes`}
            </SheetDescription>
          </SheetHeader>

          <Seccion titulo="Contacto">
            <dl className="space-y-2">
              <Dato label="Email">{b.email ? <EmailLink email={b.email} /> : '—'}</Dato>
              <Dato label="Teléfono">{b.phone ? <WhatsAppLink telefono={b.phone} /> : '—'}</Dato>
            </dl>
          </Seccion>

          <Seccion titulo="Datos fiscales">
            {b.fiscal ? (
              <dl className="space-y-2">
                <Dato label={b.fiscal.tipoDocumento}>
                  <span className="tabular-nums">{b.fiscal.numeroDocumento}</span>
                </Dato>
                <Dato label="Condición IVA">
                  {CONDICIONES_IVA.find((x) => x.value === b.fiscal!.condicionIva)?.label ?? b.fiscal.condicionIva}
                </Dato>
                <Dato label="Razón social">{b.fiscal.razonSocial || b.name}</Dato>
                {b.fiscal.domicilio && <Dato label="Domicilio">{b.fiscal.domicilio}</Dato>}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin datos fiscales: hacen falta para facturarle las comisiones.{' '}
                <Link to={`/brokers/${b.id}/edit`} className="font-medium text-primary underline-offset-4 hover:underline">
                  Completarlos
                </Link>
              </p>
            )}
          </Seccion>

          <Seccion titulo={`Clientes (${clientes.length})`}>
            {clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún cliente opera con este broker.</p>
            ) : (
              <ul className="divide-y divide-border border border-border">
                {clientes.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clients/${c.id}`} className="block px-3 py-2 text-sm transition-colors hover:bg-secondary">
                      {c.firstName} {c.lastName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          {b.notes && (
            <Seccion titulo="Notas">
              <p className="whitespace-pre-wrap text-sm">{b.notes}</p>
            </Seccion>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
            <Button asChild>
              <Link to={`/brokers/${b.id}/edit`}>
                <Edit className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </div>
        </div>
      )}
    </SheetContent>
  </Sheet>
);
