import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDataStore } from '@/stores/dataStore';
import { faktia, faktiaConfigurado, referenciaBroker, reintentarFaktia, type FaktiaComprobante } from '@/lib/faktia';
import { facturableEn } from '@/lib/suscripciones';
import type { Periodo } from '@/types';

/** La factura más relevante de un receptor en el período (las anuladas no cuentan: se puede volver a facturar). */
export const PRIORIDAD: Partial<Record<FaktiaComprobante['estado'], number>> = {
  EMITIDO: 4,
  PENDIENTE_VERIFICACION: 3,
  EMITIENDO: 3,
  RECHAZADO: 2,
  BORRADOR: 1,
};

/** Neto de una factura (sin IVA). */
export const netoDe = (c: FaktiaComprobante) => c.lineas.reduce((acc, l) => acc + (Number(l.importeNeto) || 0), 0);

/** Facturas agrupadas por referencia de EFE (cliente o broker:<id>), quedándose con la más relevante. */
export const facturasPorReferencia = (comprobantes: FaktiaComprobante[] | undefined, refs: Map<string, string> | undefined) => {
  const mapa = new Map<string, FaktiaComprobante>();
  if (!comprobantes || !refs) return mapa;
  for (const c of comprobantes) {
    if (!c.tipo.startsWith('FACTURA')) continue;
    const ref = refs.get(c.cliente.id);
    const prioridad = PRIORIDAD[c.estado];
    if (!ref || !prioridad) continue;
    const actual = mapa.get(ref);
    if (!actual || prioridad > (PRIORIDAD[actual.estado] ?? 0)) mapa.set(ref, c);
  }
  return mapa;
};

/**
 * Estado de la facturación de un período: clientes con suscripción ese mes, brokers,
 * y la factura que cada uno ya tiene en Faktia. Lo usan Facturación mensual y el Dashboard (comparten caché).
 */
export const useFacturacionPeriodo = (periodo: Periodo) => {
  const { clients, brokers } = useDataStore();

  const suscriptos = useMemo(() => clients.filter((c) => facturableEn(c.suscripcion, periodo)), [clients, periodo]);
  const referencias = useMemo(
    () => [...suscriptos.map((c) => c.id), ...brokers.map((b) => referenciaBroker(b.id))].sort(),
    [suscriptos, brokers]
  );

  const periodoQuery = useQuery({
    queryKey: ['faktia', 'periodo', periodo],
    queryFn: () => faktia.comprobantesDelPeriodo(periodo),
    enabled: faktiaConfigurado,
    staleTime: 30_000,
    retry: reintentarFaktia,
  });

  /** faktiaClienteId → referencia (id de cliente o broker:<id>) */
  const refsQuery = useQuery({
    queryKey: ['faktia', 'referencias', referencias.join(',')],
    queryFn: async () => {
      const mapa = new Map<string, string>();
      for (let i = 0; i < referencias.length; i += 200) {
        const r = await faktia.clientesPorReferencia(referencias.slice(i, i + 200));
        r.forEach((v) => mapa.set(v.cliente.id, v.referenciaExterna));
      }
      return mapa;
    },
    enabled: faktiaConfigurado && referencias.length > 0,
    staleTime: 5 * 60_000,
    retry: reintentarFaktia,
  });

  const facturas = useMemo(() => facturasPorReferencia(periodoQuery.data, refsQuery.data), [periodoQuery.data, refsQuery.data]);

  return {
    suscriptos,
    brokers,
    periodoQuery,
    refsQuery,
    facturas,
    cargando: periodoQuery.isLoading || (referencias.length > 0 && refsQuery.isLoading),
    error: periodoQuery.error ?? refsQuery.error,
  };
};
