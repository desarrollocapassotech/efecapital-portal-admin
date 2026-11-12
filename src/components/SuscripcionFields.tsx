import type { Periodo, Plan, Suscripcion } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatoMoneda } from '@/lib/faktia';
import {
  conNuevoMonto,
  esPeriodo,
  etiquetaPeriodo,
  montoActual,
  montoAInput,
  parsearMonto,
  periodoActual,
} from '@/lib/suscripciones';

const SIN_PLAN = '__sin_plan__';

export type SuscripcionDraft = {
  activa: boolean;
  planId: string;
  monto: string;
  desde: Periodo;
  hasta: Periodo | '';
  /** El cambio de monto corrige un error: se aplica desde el inicio en vez de desde el mes en curso */
  correccion: boolean;
};

/** Sin suscripción previa se propone el mes en curso como alta. */
export const suscripcionDraftFrom = (s: Suscripcion | undefined): SuscripcionDraft => ({
  activa: Boolean(s),
  planId: s?.planId ?? SIN_PLAN,
  monto: montoAInput(s ? montoActual(s) : undefined),
  desde: s?.desde ?? periodoActual(),
  hasta: s?.hasta ?? '',
  correccion: false,
});

export const validarSuscripcion = (d: SuscripcionDraft): string => {
  if (!d.activa) return '';
  const monto = parsearMonto(d.monto);
  if (!Number.isFinite(monto) || monto <= 0) return 'Indicá un monto mensual válido (ej. 60000 o 60.000,50)';
  if (!esPeriodo(d.desde)) return 'Indicá desde qué mes se factura';
  if (d.hasta && (!esPeriodo(d.hasta) || d.hasta < d.desde)) return 'El mes de baja no puede ser anterior al de alta';
  return '';
};

/** Arma la suscripción a guardar; respeta el historial de montos de la existente. */
export const suscripcionFromDraft = (d: SuscripcionDraft, existente?: Suscripcion): Suscripcion | undefined => {
  if (!d.activa) return undefined;
  const monto = parsearMonto(d.monto);
  let historial = existente?.historial ?? [];

  if (!existente || historial.length === 0 || d.correccion) {
    historial = [{ monto, desde: d.desde }];
  } else if (monto !== montoActual(existente)) {
    // Un cambio de monto rige desde el mes en curso (o desde el alta, si todavía no empezó)
    const actual = periodoActual();
    historial = conNuevoMonto(historial, monto, d.desde > actual ? d.desde : actual);
  }
  // Si se adelantó el mes de alta, el primer monto también rige desde ahí
  if (historial[0] && historial[0].desde > d.desde) historial = [{ ...historial[0], desde: d.desde }, ...historial.slice(1)];

  return {
    planId: d.planId === SIN_PLAN ? null : d.planId,
    desde: d.desde,
    hasta: d.hasta || null,
    historial,
  };
};

export const SuscripcionFields = ({
  value,
  onChange,
  planes,
  existente,
  error,
}: {
  value: SuscripcionDraft;
  onChange: (next: SuscripcionDraft) => void;
  planes: Plan[];
  existente?: Suscripcion;
  error?: string;
}) => {
  const set = <K extends keyof SuscripcionDraft>(k: K, v: SuscripcionDraft[K]) => onChange({ ...value, [k]: v });
  const plan = planes.find((p) => p.id === value.planId);
  const monto = parsearMonto(value.monto);
  const montoPrevio = existente ? montoActual(existente) : undefined;
  const cambioMonto = Boolean(existente && Number.isFinite(monto) && montoPrevio !== undefined && monto !== montoPrevio);
  const actual = periodoActual();
  const rigeDesde = value.desde > actual ? value.desde : actual;

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center justify-between gap-4 border border-border p-3">
        <span>
          <span className="block text-sm font-medium">Facturar suscripción mensual</span>
          <span className="block text-xs text-muted-foreground">
            Se factura mes vencido desde la pantalla de Facturación mensual.
          </span>
        </span>
        <Switch checked={value.activa} onCheckedChange={(v) => set('activa', v)} aria-label="Facturar suscripción mensual" />
      </label>

      {value.activa && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={value.planId}
                onValueChange={(planId) => {
                  const elegido = planes.find((p) => p.id === planId);
                  // Al elegir un plan se propone su precio vigente
                  onChange({ ...value, planId, monto: elegido ? montoAInput(elegido.precio) : value.monto });
                }}
              >
                <SelectTrigger id="plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_PLAN}>Sin plan (monto propio)</SelectItem>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} · {formatoMoneda(p.precio)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {planes.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Podés crear planes en la sección Planes.</p>
              )}
            </div>
            <div>
              <Label htmlFor="monto">Monto mensual (ARS) *</Label>
              <Input
                id="monto"
                inputMode="decimal"
                value={value.monto}
                onChange={(e) => set('monto', e.target.value)}
                placeholder="60000"
                className={error && !(monto > 0) ? 'border-destructive' : ''}
              />
              {plan && Number.isFinite(monto) && monto < plan.precio && (
                <p className="mt-1 text-xs text-gold">Por debajo del precio vigente del plan ({formatoMoneda(plan.precio)}).</p>
              )}
            </div>
          </div>

          {cambioMonto && (
            <div className="space-y-2 border-l-2 border-gold bg-gold/10 p-3 text-sm">
              <p>
                {value.correccion
                  ? `Se reemplaza el monto anterior (${formatoMoneda(montoPrevio!)}) en todos los meses.`
                  : `El nuevo monto rige desde ${etiquetaPeriodo(rigeDesde)}. Los meses anteriores se siguen facturando a ${formatoMoneda(montoPrevio!)}.`}
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox checked={value.correccion} onCheckedChange={(v) => set('correccion', v === true)} />
                Es una corrección: el monto anterior estaba mal cargado
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="desde">Facturar desde *</Label>
              <Input id="desde" type="month" value={value.desde} onChange={(e) => set('desde', e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Mes de alta: se cobra completo.</p>
            </div>
            <div>
              <Label htmlFor="hasta">Facturar hasta</Label>
              <Input id="hasta" type="month" value={value.hasta} onChange={(e) => set('hasta', e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Solo si se da de baja: último mes que se factura.</p>
            </div>
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
