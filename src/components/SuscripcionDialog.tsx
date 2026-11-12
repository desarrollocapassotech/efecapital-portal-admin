import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  SuscripcionFields,
  suscripcionDraftFrom,
  suscripcionFromDraft,
  validarSuscripcion,
  type SuscripcionDraft,
} from '@/components/SuscripcionFields';

/**
 * Edición rápida de la suscripción de un cliente (plan, monto, alta y baja) sin abrir el formulario completo.
 * Usa los mismos campos y reglas que ClientForm.
 */
export const SuscripcionDialog = ({ client, onOpenChange }: { client: Client | null; onOpenChange: (open: boolean) => void }) => {
  const { planes, updateClient } = useDataStore();
  const [draft, setDraft] = useState<SuscripcionDraft>(suscripcionDraftFrom(undefined));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se reinicia al abrir con otro cliente
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  if ((client?.id ?? null) !== abiertoPara) {
    setAbiertoPara(client?.id ?? null);
    setDraft(suscripcionDraftFrom(client?.suscripcion));
    setError('');
  }

  const guardar = async () => {
    if (!client) return;
    const mensaje = validarSuscripcion(draft);
    setError(mensaje);
    if (mensaje) return;
    setGuardando(true);
    try {
      await updateClient(client.id, { suscripcion: suscripcionFromDraft(draft, client.suscripcion) });
      toast.success('Suscripción actualizada');
      onOpenChange(false);
    } catch {
      toast.error('No se pudo guardar la suscripción');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={Boolean(client)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {client && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                Suscripción · {client.firstName} {client.lastName}
              </DialogTitle>
              <DialogDescription>Plan y monto mensual que se le factura (mes vencido).</DialogDescription>
            </DialogHeader>
            <SuscripcionFields
              value={draft}
              onChange={(next) => {
                setDraft(next);
                if (error) setError(validarSuscripcion(next));
              }}
              planes={planes}
              existente={client.suscripcion}
              error={error}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={guardar} disabled={guardando}>
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
