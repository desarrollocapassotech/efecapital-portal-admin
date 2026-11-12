/**
 * Suscripciones mensuales de clientes y períodos de facturación.
 *
 * - Se factura **mes vencido**: en noviembre se factura octubre.
 * - El mes de alta se cobra completo (`suscripcion.desde`); la baja (`hasta`) es el último mes facturado.
 * - Cada cliente tiene su propio monto con historial de vigencias: los clientes viejos pueden quedar con
 *   montos atrasados respecto del plan. Un cambio de monto rige desde el mes en curso, así la factura
 *   del mes anterior (que se emite ahora) sale con el monto que correspondía.
 */
import type { MontoVigente, Periodo, Plan, Suscripcion } from '@/types';

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

export const esPeriodo = (v: unknown): v is Periodo => typeof v === 'string' && PERIODO.test(v);

export const periodoDe = (d: Date): Periodo => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const sumarMeses = (p: Periodo, n: number): Periodo => {
  const [a, m] = p.split('-').map(Number);
  return periodoDe(new Date(a, m - 1 + n, 1));
};

export const periodoActual = (): Periodo => periodoDe(new Date());

/** Período que se factura hoy (mes vencido). */
export const periodoAFacturar = (): Periodo => sumarMeses(periodoActual(), -1);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10" → "Octubre 2026" */
export const etiquetaPeriodo = (p: Periodo) => {
  const [a, m] = p.split('-').map(Number);
  const mes = MESES[m - 1] ?? '';
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${a}`;
};

/** Primer y último día del mes, "YYYY-MM-DD". */
export const rangoPeriodo = (p: Periodo) => {
  const [a, m] = p.split('-').map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return { desde: `${p}-01`, hasta: `${p}-${String(ultimo).padStart(2, '0')}` };
};

// ── Montos ─────────────────────────────────────────────────────────────────

const ordenar = (h: MontoVigente[]) => [...h].sort((a, b) => a.desde.localeCompare(b.desde));

/** Monto que regía en un período (undefined si todavía no había ninguno). */
export const montoEn = (s: Pick<Suscripcion, 'historial'>, p: Periodo): number | undefined => {
  let monto: number | undefined;
  for (const v of ordenar(s.historial)) {
    if (v.desde <= p) monto = v.monto;
    else break;
  }
  return monto;
};

/** Monto vigente hoy (o el primero, si todos son futuros). */
export const montoActual = (s: Pick<Suscripcion, 'historial'>): number | undefined =>
  montoEn(s, periodoActual()) ?? ordenar(s.historial)[0]?.monto;

/**
 * Agrega un monto que rige desde `desde`: reemplaza el que empezaba ese mismo mes
 * y descarta los posteriores (quedaron pisados por el cambio).
 */
export const conNuevoMonto = (historial: MontoVigente[], monto: number, desde: Periodo = periodoActual()): MontoVigente[] => [
  ...ordenar(historial).filter((v) => v.desde < desde),
  { monto, desde },
];

/** ¿Hay que facturarle ese período? */
export const facturableEn = (s: Suscripcion | undefined, p: Periodo): boolean =>
  Boolean(s && s.desde <= p && (!s.hasta || p <= s.hasta) && (montoEn(s, p) ?? 0) > 0);

/** Activa hoy (no dio de baja antes del mes en curso). */
export const suscripcionActiva = (s: Suscripcion | undefined): boolean =>
  Boolean(s && (!s.hasta || s.hasta >= periodoAFacturar()));

/** Cliente con monto por debajo del precio vigente de su plan. */
export const estaAtrasado = (s: Suscripcion | undefined, planes: Plan[]): boolean => {
  if (!s?.planId) return false;
  const plan = planes.find((p) => p.id === s.planId);
  const monto = montoActual(s);
  return Boolean(plan && monto !== undefined && monto < plan.precio);
};

/**
 * Último mes a facturar si el cliente se da de baja hoy: el mes vencido (que todavía se factura), o el mes
 * de alta si empezó después (el alta se cobra completa). `null` si ya no hay nada que cambiar.
 */
export const periodoBajaHoy = (s: Suscripcion | undefined): Periodo | null => {
  if (!s) return null;
  const vencido = periodoAFacturar();
  const hasta = s.desde > vencido ? s.desde : vencido;
  return s.hasta && s.hasta <= hasta ? null : hasta;
};

/** Se le puede asignar un plan sin tocar meses ya cerrados: sin suscripción o con una activa. */
export const puedeAsignarPlan = (s: Suscripcion | undefined): boolean => !s || suscripcionActiva(s);

/**
 * Suscripción con el plan asignado.
 * - Sin suscripción: alta en el mes en curso, al precio del plan.
 * - Con suscripción activa: cambia el plan; si `aplicarPrecio`, el precio del plan rige desde el mes en curso
 *   (o desde el alta, si todavía no empezó), así la factura del mes anterior sale con el monto viejo.
 */
export const conPlan = (s: Suscripcion | undefined, plan: Plan, aplicarPrecio: boolean): Suscripcion => {
  const actual = periodoActual();
  if (!s) return { planId: plan.id, desde: actual, hasta: null, historial: [{ monto: plan.precio, desde: actual }] };
  const historial =
    aplicarPrecio && montoActual(s) !== plan.precio
      ? conNuevoMonto(s.historial, plan.precio, s.desde > actual ? s.desde : actual)
      : s.historial;
  return { ...s, planId: plan.id, historial };
};

/** Lee la suscripción de Firestore tolerando datos incompletos. */
export const suscripcionDesdeDatos = (raw: unknown): Suscripcion | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (!esPeriodo(r.desde)) return undefined;
  const historial = Array.isArray(r.historial)
    ? r.historial
        .filter((v): v is MontoVigente => {
          const x = v as Partial<MontoVigente> | null;
          return Boolean(x && typeof x.monto === 'number' && Number.isFinite(x.monto) && esPeriodo(x.desde));
        })
        .map((v) => ({ monto: v.monto, desde: v.desde }))
    : [];
  return {
    planId: typeof r.planId === 'string' && r.planId ? r.planId : null,
    desde: r.desde,
    hasta: esPeriodo(r.hasta) ? r.hasta : null,
    historial: ordenar(historial),
  };
};

// ── Formato de montos en formularios ───────────────────────────────────────

/** "60.000", "60000,50" o "60000.5" → 60000.5 (NaN si no es un número válido). */
export const parsearMonto = (v: string): number => {
  const limpio = v.trim().replace(/\s|\$/g, '');
  if (!limpio) return NaN;
  // Con coma: la coma es decimal y los puntos son de miles. Sin coma: puntos seguidos de 3 dígitos son de miles.
  const normalizado = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpio)
      ? limpio.replace(/\./g, '')
      : limpio;
  return /^\d+(\.\d{1,2})?$/.test(normalizado) ? Number(normalizado) : NaN;
};

/** Para precargar un input: 60000.5 → "60000,50" */
export const montoAInput = (n: number | undefined) =>
  n === undefined ? '' : Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');

/** 60000.5 → "60000.50" (formato decimal que pide Faktia) */
export const montoADecimal = (n: number) => n.toFixed(2);
