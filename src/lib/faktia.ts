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
import type { Broker, Client, DatosFiscales } from '@/types';

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
  /** Comprobante al que se asocia (ej. la factura que anula una nota de crédito) */
  asociado?: { id: string; tipo: TipoComprobante; numero: number | null } | null;
  /** Notas de crédito/débito emitidas sobre este comprobante */
  notas?: Array<{ id: string; tipo: TipoComprobante; numero: number | null; estado: EstadoComprobante }>;
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
  ANULADO: { label: 'Anulada', className: 'bg-secondary text-foreground border-border' },
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

/**
 * Política de reintentos para React Query: solo errores de red o del servidor (5xx),
 * hasta 2 veces. Un 4xx (sin permiso, datos inválidos) no se arregla reintentando.
 */
export const reintentarFaktia = (intentos: number, error: unknown) =>
  intentos < 2 && error instanceof FaktiaError && (error.status === 0 || error.status >= 500);

const json = async <T>(ruta: string, init?: RequestInit & { idempotencia?: string }) =>
  (await solicitud(ruta, init)).json() as Promise<T>;

const claveIdempotencia = () => crypto.randomUUID();

/** A quién se le factura: cliente o broker de EFE Capital, con su referencia en Faktia. */
export interface Receptor {
  /** referenciaExterna en Faktia: id del cliente, o `broker:<id>` para brokers */
  referencia: string;
  nombre: string;
  email?: string;
  fiscal?: DatosFiscales;
}

export const referenciaBroker = (brokerId: string) => `broker:${brokerId}`;

export const receptorDeCliente = (c: Client): Receptor => ({
  referencia: c.id,
  nombre: `${c.firstName} ${c.lastName}`.trim(),
  email: c.email,
  fiscal: c.fiscal,
});

export const receptorDeBroker = (b: Broker): Receptor => ({
  referencia: referenciaBroker(b.id),
  nombre: b.name,
  email: b.email,
  fiscal: b.fiscal,
});

export const faktia = {
  configuracion: () => json<FaktiaConfiguracion>('/configuracion'),

  /** `periodo` (YYYY-MM): comprobantes cuyo período de servicio abarca ese mes. */
  listarComprobantes: (
    params: { estado?: EstadoComprobante; clienteId?: string; periodo?: string; pagina?: number; porPagina?: number } = {},
  ) => {
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

  /** Todos los comprobantes de un período de servicio (YYYY-MM). */
  async comprobantesDelPeriodo(periodo: string): Promise<FaktiaComprobante[]> {
    const items: FaktiaComprobante[] = [];
    for (let pagina = 1; ; pagina++) {
      const r = await faktia.listarComprobantes({ periodo, pagina, porPagina: 100 });
      items.push(...r.items);
      if (items.length >= r.total || r.items.length === 0) return items;
    }
  },

  /**
   * `idempotencia`: clave fija para operaciones que se pueden repetir (ej. facturación mensual: reintentar
   * no duplica). Faktia la recuerda 24 h; por defecto se usa una clave nueva.
   */
  crearBorrador: (datos: CrearBorradorInput, idempotencia: string = claveIdempotencia()) =>
    json<FaktiaComprobante>('/comprobantes', { method: 'POST', body: JSON.stringify(datos), idempotencia }),

  emitir: (id: string, version?: number, idempotencia: string = claveIdempotencia()) =>
    json<FaktiaComprobante>(`/comprobantes/${id}/emitir`, {
      method: 'POST',
      body: JSON.stringify(version === undefined ? {} : { version }),
      idempotencia,
    }),

  /** Borrador de nota de crédito/débito sobre una factura emitida (mismas líneas). */
  crearNota: (id: string, clase: 'NOTA_CREDITO' | 'NOTA_DEBITO', motivo: string) =>
    json<FaktiaComprobante>(`/comprobantes/${id}/notas`, {
      method: 'POST',
      body: JSON.stringify({ clase, motivo }),
      idempotencia: claveIdempotencia(),
    }),

  /**
   * Anula una factura emitida: crea la nota de crédito por el total y la emite en ARCA.
   * Si ARCA no la acepta, la NC queda en Faktia como borrador/rechazada para revisarla.
   */
  async anular(factura: FaktiaComprobante, motivo: string): Promise<FaktiaComprobante> {
    const nota = await faktia.crearNota(factura.id, 'NOTA_CREDITO', motivo);
    return faktia.emitir(nota.id, nota.version);
  },

  eliminarBorrador: async (id: string) => {
    await solicitud(`/comprobantes/${id}`, { method: 'DELETE' });
  },

  /**
   * Abre el PDF del comprobante en una pestaña nueva.
   * La pestaña se abre antes de la descarga (en el mismo clic) para que el navegador no la bloquee
   * como pop-up; el PDF se pide con el token y se muestra cuando llega.
   */
  async abrirPdf(c: FaktiaComprobante) {
    const pestana = window.open('', '_blank');
    if (pestana) {
      pestana.document.title = `${claseDe(c.tipo)} ${letraDe(c.tipo)} ${numeroComprobante(c)}`;
      pestana.document.body.style.cssText = 'font-family:system-ui,sans-serif;color:#555;padding:2rem';
      pestana.document.body.textContent = 'Cargando comprobante…';
    }
    try {
      const blob = await (await solicitud(`/comprobantes/${c.id}/pdf`)).blob();
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (pestana && !pestana.closed) pestana.location.href = url;
      else window.open(url, '_blank'); // el navegador bloqueó la pestaña previa
      // Se libera más tarde: la pestaña necesita la URL mientras carga el PDF
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (err) {
      pestana?.close();
      throw err;
    }
  },

  padron: (cuit: string) => json<FaktiaPadron>(`/clientes/padron/${encodeURIComponent(cuit.replace(/\D/g, ''))}`),

  clientesPorReferencia: (refs: string[]) => {
    const q = new URLSearchParams();
    refs.forEach((r) => q.append('referencia', r));
    return json<Array<{ referenciaExterna: string; cliente: FaktiaCliente }>>(`/clientes/referencias?${q}`);
  },

  /** Cliente de Faktia asociado a un cliente de EFE Capital (referencia = id de Firestore). */
  asegurarCliente: (cliente: Client): Promise<FaktiaCliente> =>
    faktia.asegurarReceptor(receptorDeCliente(cliente)),

  /**
   * Devuelve el cliente de Faktia asociado a una referencia (cliente o broker de EFE Capital).
   * Si no existe lo crea con los datos fiscales; si ya existe con ese documento, lo asocia.
   */
  async asegurarReceptor(receptor: Receptor): Promise<FaktiaCliente> {
    const [vinculado] = await faktia.clientesPorReferencia([receptor.referencia]);
    if (vinculado) return vinculado.cliente;

    const fiscal = receptor.fiscal;
    if (!fiscal?.numeroDocumento || !fiscal.tipoDocumento || !fiscal.condicionIva) {
      throw new FaktiaError(`${receptor.nombre} no tiene cargados sus datos fiscales (documento y condición de IVA).`, 400);
    }
    const datos = {
      razonSocial: fiscal.razonSocial?.trim() || receptor.nombre,
      tipoDocumento: fiscal.tipoDocumento,
      numeroDocumento: fiscal.numeroDocumento.replace(/\D/g, ''),
      condicionIva: fiscal.condicionIva,
      domicilio: fiscal.domicilio?.trim() || undefined,
      email: receptor.email || undefined,
      referenciaExterna: receptor.referencia,
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
            body: JSON.stringify({ referenciaExterna: receptor.referencia }),
          });
          return r.cliente;
        }
      }
      throw err;
    }
  },
};
