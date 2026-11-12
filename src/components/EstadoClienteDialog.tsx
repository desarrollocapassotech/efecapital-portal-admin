import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { clienteHabilitado } from '@/lib/clientes';
import { etiquetaPeriodo, periodoBajaHoy } from '@/lib/suscripciones';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Confirmación para deshabilitar (baja lógica) o volver a habilitar un cliente.
 * Si está habilitado: pide motivo opcional y ofrece dar de baja la suscripción. Si está deshabilitado: lo rehabilita.
 */
export const EstadoClienteDialog = ({ client, onOpenChange }: { client: Client | null; onOpenChange: (open: boolean) => void }) => {
  const { deshabilitarCliente, habilitarCliente } = useDataStore();
  const [motivo, setMotivo] = useState('');
  const [bajaSuscripcion, setBajaSuscripcion] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  if ((client?.id ?? null) !== abiertoPara) {
    setAbiertoPara(client?.id ?? null);
    setMotivo('');
    setBajaSuscripcion(true);
  }

  const habilitado = client ? clienteHabilitado(client) : true;
  const hasta = client ? periodoBajaHoy(client.suscripcion) : null;
  const nombre = client ? `${client.firstName} ${client.lastName}`.trim() : '';

  const confirmar = async () => {
    if (!client) return;
    setGuardando(true);
    try {
      if (habilitado) {
        await deshabilitarCliente(client.id, { motivo, suscripcionHasta: bajaSuscripcion ? hasta : null });
        toast.success(`${nombre} quedó deshabilitado`, { description: 'Sus datos se conservan. Podés volver a habilitarlo.' });
      } else {
        await habilitarCliente(client.id);
        toast.success(`${nombre} quedó habilitado`);
      }
      onOpenChange(false);
    } catch {
      toast.error(habilitado ? 'No se pudo deshabilitar el cliente' : 'No se pudo habilitar el cliente');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AlertDialog open={Boolean(client)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {client && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{habilitado ? `¿Deshabilitar a ${nombre}?` : `¿Volver a habilitar a ${nombre}?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {habilitado
                  ? 'No se elimina nada: sus facturas, mensajes, documentos y actividades se conservan. Deja de aparecer en el listado (salvo que filtres por deshabilitados) y no se le pueden emitir facturas nuevas. Lo podés volver a habilitar cuando quieras.'
                  : 'Vuelve a aparecer en el listado y se le pueden emitir facturas. La suscripción no se reactiva sola: si corresponde, editala desde la columna Plan.'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {habilitado && (
              <div className="space-y-4">
                {hasta && (
                  <label className="flex cursor-pointer items-start gap-2 border-l-2 border-gold bg-gold/10 p-3 text-sm">
                    <Checkbox className="mt-0.5" checked={bajaSuscripcion} onCheckedChange={(v) => setBajaSuscripcion(v === true)} />
                    <span>
                      Dar de baja la suscripción: el último mes que se factura es <strong>{etiquetaPeriodo(hasta)}</strong>.
                      {!bajaSuscripcion && ' Si lo destildás, se le sigue facturando todos los meses.'}
                    </span>
                  </label>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="motivo-deshabilitar">Motivo (opcional)</Label>
                  <Textarea
                    id="motivo-deshabilitar"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Dejó el servicio, se mudó, cliente duplicado…"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={guardando}>Cancelar</AlertDialogCancel>
              <Button
                type="button"
                onClick={confirmar}
                disabled={guardando}
                className={habilitado ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                {habilitado ? 'Deshabilitar' : 'Habilitar'}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
