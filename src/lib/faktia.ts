/**
 * Cliente de la API pública de Faktia (facturación electrónica ARCA).
 *
 * Faktia es la fuente de verdad de las facturas: número, CAE y PDF salen de ahí.
 * No hay API key en el navegador: cada llamada va con el ID token de Firebase del usuario
 * logueado, y Faktia lo valida (federación, ver FIREBASE_FEDERACION en faktia-backend).
 *
 * Config: VITE_FAKTIA_API_URL, con el prefijo /api (ej. https://<backend-faktia>/api). Sin ella, la sección Facturas
 * muestra que la integración no está configurada.
 */
import { auth } from '@/lib/firebase';
import type { Client } from '@/types';

export const FAKTIA_API_URL = (import.meta.env.VITE_FAKTIA_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
export const faktiaConfigurado = Boolean(FAKTIA_API_URL);

/** Panel web de Faktia (para ver o gestionar comprobantes allá). */
export const FAKTIA_APP_URL = (import.meta.env.VITE_FAKTIA_APP_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

// ── Tipos (forma pública de la API v1) ─────────────────────────────────────

export type TipoComprobante =
  | 'FACTURA_A' | 'NOTA_DEBITO_A' | 'NOTA_CREDITO_A'
  | 'FACTURA_B' | 'NOTA_DEBITO_B' | 'NOTA_CREDITO_B'
  | 'FACTURA_C' | 'NOTA_DEBITO_C' | 'NOTA_CREDITO_C';
export type EstadoComprobante = 'BORRADOR' | 'EMITIENDO' | 'PENDIENTE_VERIFICACION' | 'EMITIDO' | 'RECHAZADO' | 'ANULADO';
export type Moneda = 'ARS' | 'USD';
export type ConceptoArca = 'PRODUCTOS' | 'SERVICIOS' | 'PRODUCTOS_Y_SERVICIOS';
export type UnidadItem = 'HORA' | 'UNIDAD' | 'SERVICIO' | 'MES';
export type TipoDocumento = 'CUIT' | 'CUIL' | 'DNI' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';
export type CondicionIva =
  | 'RESPONSABLE_INSCRIPTO' | 'EXENTO' | 'CONSUMIDOR_FINAL' | 'MONOTRIBUTO' | 'NO_CATEGORIZADO'
  | 'PROVEEDOR_EXTERIOR' | 'CLIENTE_EXTERIOR' | 'IVA_LIBERADO' | 'MONOTRIBUTO_SOCIAL' | 'NO_ALCANZADO' | 'MONOTRIBUTO_TIP';

export interface FaktiaCliente {
  id: string;
  razonSocial: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  condicionIva: CondicionIva;
  domicilio: string | null;
  email: string | null;
}

export interface FaktiaLinea {
  descripcion: string;
  cantidad: string;
  unidad: UnidadItem;
  precioUnitario: string;
  bonificacionPct: string;
  alicuotaIva: string;
  importeNeto: string;
  importeTotal: string;
}

export interface FaktiaComprobante {
  id: string;
  tipo: TipoComprobante;
  estado: EstadoComprobante;
  ambiente: string;
  version: number;
  puntoVenta: number;
  puntoVentaId: string | null;
  numero: number | null;
  fechaEmision: string; // YYYY-MM-DD
  concepto: ConceptoArca;
  periodo: { desde: string; hasta: string } | null;
  vencimientoPago: string | null;
  moneda: Moneda;
  cotizacion: string;
  importes: { netoGravado: string; iva: string; tributos: string; total: string };
  cae: string | null;
  caeVencimiento: string | null;
  cliente: FaktiaCliente;
  lineas: FaktiaLinea[];
  observaciones: string | null;
  advertenciaLetra: string | null;
  error: { mensaje: string; detalle: string | null } | null;
  emitidoEn: string | null;
}

export interface FaktiaConfiguracion {
  emisor: { razonSocial: string; nombreFantasia: string; cuit: string; condicionIva: CondicionIva; ambiente: string };
  puntosVenta: Array<{ id: string; numero: number; descripcion: string | null }>;
}

export interface FaktiaPadron {
  razonSocial?: string;
  condicionIva?: CondicionIva;
  domicilio?: string | null;
  [k: string]: unknown;
}

export interface CrearBorradorInput {
  clienteId: string;
  puntoVentaId: string;
  tipo?: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
  fechaEmision: string;
  concepto: ConceptoArca;
  fechaServicioDesde?: string | null;
  fechaServicioHasta?: string | null;
  fechaVtoPago?: string | null;
  moneda?: Moneda;
  observaciones?: string | null;
  lineas: Array<{ descripcion: string; cantidad: string; unidad: UnidadItem; precioUnitario: string; alicuotaIva: string }>;
}

// ── Etiquetas ──────────────────────────────────────────────────────────────

export const CONDICIONES_IVA: Array<{ value: CondicionIva; label: string }> = [
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_ALCANZADO', label: 'No alcanzado' },
  { value: 'NO_CATEGORIZADO', label: 'No categorizado' },
  { value: 'MONOTRIBUTO_SOCIAL', label: 'Monotributista social' },
  { value: 'MONOTRIBUTO_TIP', label: 'Monotributo trabajador independiente promovido' },
  { value: 'IVA_LIBERADO', label: 'IVA liberado (Ley 19.640)' },
  { value: 'CLIENTE_EXTERIOR', label: 'Cliente del exterior' },
  { value: 'PROVEEDOR_EXTERIOR', label: 'Proveedor del exterior' },
];

export const TIPOS_DOCUMENTO: Array<{ value: TipoDocumento; label: string }> = [
  { value: 'CUIT', label: 'CUIT' },
  { value: 'CUIL', label: 'CUIL' },
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export const ESTADOS: Record<EstadoComprobante, { label: string; className: string }> = {
  BORRADOR: { label: 'Borrador', className: 'bg-muted text-muted-foreground border-border' },
  EMITIENDO: { label: 'Emitiendo', className: 'bg-primary/10 text-primary border-primary/20' },
  PENDIENTE_VERIFICACION: { label: 'Verificando', className: 'bg-gold/10 text-gold border-gold/30' },
  EMITIDO: { label: 'Emitida', className: 'bg-success/10 text-success border-success/30' },
  RECHAZADO: { label: 'Rechazada', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  ANULADO: { label: 'Anulada', className: 'bg-muted text-muted-foreground border-border line-through' },
};

export const letraDe = (tipo: TipoComprobante) => tipo.slice(-1) as 'A' | 'B' | 'C';
export const claseDe = (tipo: TipoComprobante) =>
  tipo.startsWith('NOTA_CREDITO') ? 'Nota de crédito' : tipo.startsWith('NOTA_DEBITO') ? 'Nota de débito' : 'Factura';

/** "0001-00000023" (o "0001-—" si todavía no tiene número). */
export const numeroComprobante = (c: Pick<FaktiaComprobante, 'puntoVenta' | 'numero'>) =>
  `${String(c.puntoVenta).padStart(4, '0')}-${c.numero == null ? '—' : String(c.numero).padStart(8, '0')}`;

const formateadores: Partial<Record<Moneda, Intl.NumberFormat>> = {};
export const formatoMoneda = (monto: string | number, moneda: Moneda = 'ARS') => {
  formateadores[moneda] ??= new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 });
  return formateadores[moneda]!.format(Number(monto) || 0);
};

/** "2026-11-11" → "11/11/2026" sin pasar por zonas horarias. */
export const formatoFecha = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── HTTP ───────────────────────────────────────────────────────────────────

export class FaktiaError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalle?: string | null,
    readonly comprobante?: FaktiaComprobante,
  ) {
    super(message);
  }
}

async function solicitud(ruta: string, init: RequestInit & { idempotencia?: string } = {}): Promise<Response> {
  if (!faktiaConfigurado) throw new FaktiaError('La integración con Faktia no está configurada.', 0);
  const usuario = auth.currentUser;
  if (!usuario) throw new FaktiaError('La sesión expiró. Volvé a iniciar sesión.', 401);

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await usuario.getIdToken()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (init.idempotencia) headers.set('Idempotency-Key', init.idempotencia);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${FAKTIA_API_URL}/v1${ruta}`, { ...init, headers });
  } catch {
    throw new FaktiaError('No se pudo conectar con Faktia.', 0);
  }

  if (!respuesta.ok) {
    let cuerpo: { message?: string | string[]; detalle?: string | null; comprobante?: FaktiaComprobante } = {};
    try {
      cuerpo = await respuesta.json();
    } catch {
      /* sin cuerpo JSON */
    }
    const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join(' ') : cuerpo.message;
    throw new FaktiaError(
      mensaje || (respuesta.status === 401 || respuesta.status === 403 ? 'Tu usuario no tiene acceso a Faktia.' : `Error de Faktia (${respuesta.status}).`),
      respuesta.status,
      cuerpo.detalle,
      cuerpo.comprobante,
    );
  }
  return respuesta;
}

const json = async <T>(ruta: string, init?: RequestInit & { idempotencia?: string }) =>
  (await solicitud(ruta, init)).json() as Promise<T>;

const claveIdempotencia = () => crypto.randomUUID();

export const faktia = {
  configuracion: () => json<FaktiaConfiguracion>('/configuracion'),

  listarComprobantes: (params: { estado?: EstadoComprobante; clienteId?: string; pagina?: number; porPagina?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)));
    return json<{ total: number; pagina: number; porPagina: number; items: FaktiaComprobante[] }>(`/comprobantes?${q}`);
  },

  /** Trae todas las páginas (hasta `maximo`). */
  async todosLosComprobantes(maximo = 1000): Promise<FaktiaComprobante[]> {
    const items: FaktiaComprobante[] = [];
    for (let pagina = 1; items.length < maximo; pagina++) {
      const r = await faktia.listarComprobantes({ pagina, porPagina: 100 });
      items.push(...r.items);
      if (items.length >= r.total || r.items.length === 0) break;
    }
    return items;
  },

  crearBorrador: (datos: CrearBorradorInput) =>
    json<FaktiaComprobante>('/comprobantes', { method: 'POST', body: JSON.stringify(datos), idempotencia: claveIdempotencia() }),

  emitir: (id: string, version?: number) =>
    json<FaktiaComprobante>(`/comprobantes/${id}/emitir`, {
      method: 'POST',
      body: JSON.stringify(version === undefined ? {} : { version }),
      idempotencia: claveIdempotencia(),
    }),

  eliminarBorrador: async (id: string) => {
    await solicitud(`/comprobantes/${id}`, { method: 'DELETE' });
  },

  async descargarPdf(c: FaktiaComprobante) {
    const blob = await (await solicitud(`/comprobantes/${c.id}/pdf`)).blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${claseDe(c.tipo)} ${letraDe(c.tipo)} ${numeroComprobante(c)}.pdf`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  padron: (cuit: string) => json<FaktiaPadron>(`/clientes/padron/${encodeURIComponent(cuit.replace(/\D/g, ''))}`),

  clientesPorReferencia: (refs: string[]) => {
    const q = new URLSearchParams();
    refs.forEach((r) => q.append('referencia', r));
    return json<Array<{ referenciaExterna: string; cliente: FaktiaCliente }>>(`/clientes/referencias?${q}`);
  },

  /**
   * Devuelve el cliente de Faktia asociado a un cliente de EFE Capital (por su id de Firestore).
   * Si no existe lo crea con los datos fiscales; si ya existe con ese documento, lo asocia.
   */
  async asegurarCliente(cliente: Client): Promise<FaktiaCliente> {
    const [vinculado] = await faktia.clientesPorReferencia([cliente.id]);
    if (vinculado) return vinculado.cliente;

    const fiscal = cliente.fiscal;
    if (!fiscal?.numeroDocumento || !fiscal.tipoDocumento || !fiscal.condicionIva) {
      throw new FaktiaError('El cliente no tiene cargados sus datos fiscales (documento y condición de IVA).', 400);
    }
    const datos = {
      razonSocial: fiscal.razonSocial?.trim() || `${cliente.firstName} ${cliente.lastName}`.trim(),
      tipoDocumento: fiscal.tipoDocumento,
      numeroDocumento: fiscal.numeroDocumento.replace(/\D/g, ''),
      condicionIva: fiscal.condicionIva,
      domicilio: fiscal.domicilio?.trim() || undefined,
      email: cliente.email || undefined,
      referenciaExterna: cliente.id,
    };
    try {
      return await json<FaktiaCliente>('/clientes', { method: 'POST', body: JSON.stringify(datos), idempotencia: claveIdempotencia() });
    } catch (err) {
      // Ya existe en Faktia con ese documento: se busca y se asocia a este cliente.
      if (err instanceof FaktiaError && err.status === 409) {
        const encontrados = await json<FaktiaCliente[]>(`/clientes?q=${encodeURIComponent(datos.numeroDocumento)}`);
        const existente = encontrados.find((c) => c.numeroDocumento.replace(/\D/g, '') === datos.numeroDocumento);
        if (existente) {
          const r = await json<{ cliente: FaktiaCliente }>(`/clientes/${existente.id}/referencias`, {
            method: 'POST',
            body: JSON.stringify({ referenciaExterna: cliente.id }),
          });
          return r.cliente;
        }
      }
      throw err;
    }
  },
};
