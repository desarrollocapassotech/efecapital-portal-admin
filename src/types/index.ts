export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  investorProfile: 'Conservador' | 'Moderado' | 'Agresivo';
  objectives: string;
  investmentHorizon: string;
  /** Nombres canónicos de los brokers del cliente (ver src/lib/brokers.ts) */
  brokers: string[];
  /** Datos fiscales para facturar con Faktia (opcionales hasta la primera factura) */
  fiscal?: ClientFiscal;
  /** Suscripción mensual que se le factura (mes vencido). Ver src/lib/suscripciones.ts */
  suscripcion?: Suscripcion;
  notes?: Note[];
  lastContact: Date;
  createdAt: Date;
  /**
   * Baja lógica: los clientes no se eliminan, se deshabilitan y conservan todos sus datos
   * (facturas, mensajes, documentos, actividades). Sin valor = habilitado. Ver src/lib/clientes.ts
   */
  deshabilitadoEn?: Date | null;
  motivoDeshabilitacion?: string;
}

/** Período mensual "YYYY-MM". */
export type Periodo = string;

export interface MontoVigente {
  monto: number;
  /** Primer mes en que rige este monto */
  desde: Periodo;
}

export interface Suscripcion {
  /** Plan al que pertenece (sirve para actualizar precios en bloque). Opcional: puede tener un monto propio. */
  planId?: string | null;
  /** Primer mes que se factura (mes de alta, se cobra completo) */
  desde: Periodo;
  /** Último mes que se factura (baja). Sin valor, sigue activa. */
  hasta?: Periodo | null;
  /** Montos con su vigencia, ordenados por `desde`. El monto de un mes es el último que ya regía. */
  historial: MontoVigente[];
}

export interface Plan {
  id: string;
  nombre: string;
  /** Precio vigente del plan (lo que pagan los clientes al día) */
  precio: number;
}

/** Servicio de pago único (se factura una vez desde "Nueva factura", no entra en la facturación mensual). */
export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
}

/** Datos fiscales de un receptor de factura (cliente o broker). */
export type DatosFiscales = ClientFiscal;

export interface ClientFiscal {
  tipoDocumento: 'CUIT' | 'CUIL' | 'DNI' | 'PASAPORTE';
  numeroDocumento: string;
  condicionIva: import('@/lib/faktia').CondicionIva;
  /** Si se omite, se usa nombre y apellido */
  razonSocial?: string;
  domicilio?: string;
}

export interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  /** Datos fiscales para facturarle las comisiones */
  fiscal?: DatosFiscales;
}

export interface Note {
  text: string;
  date: string; 
}

export interface Message {
  id: string;
  clientId: string;
  content: string;
  timestamp: Date;
  isFromAdvisor: boolean;
  status: 'pendiente' | 'respondido' | 'en_revision';
  read?: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: 'rendimiento' | 'recomendaciones' | 'informe_mercado';
  description: string;
  uploadDate: Date;
  size: number;
  fileUrl: string;
  storagePath: string;
  visibility: 'all' | 'selected';
  clientIds: string[];
}

export interface Activity {
  id: string;
  clientId: string;
  type: 'mensaje' | 'documento' | 'nota' | 'actualizacion';
  title: string;
  description: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'mensaje' | 'capital' | 'informe';
  clientId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    uid: string;
    name: string;
    email: string;
    role: 'advisor';
  } | null;
}