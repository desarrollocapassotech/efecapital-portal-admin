/**
 * Baja lógica de clientes: nunca se borran de Firestore, se marcan con `deshabilitadoEn`.
 * Así no se pierden sus facturas, mensajes, documentos ni actividades, y se pueden volver a habilitar.
 *
 * Dónde se excluyen los deshabilitados: listado de Clientes (por defecto, filtro "Estado"), "Nueva factura",
 * asignación y actualización de precio de planes, y la cartera del Dashboard. La facturación mensual se rige
 * por la suscripción (`hasta`), que se da de baja al deshabilitar.
 */
import type { Client } from '@/types';

export const clienteHabilitado = (c: Pick<Client, 'deshabilitadoEn'>): boolean => !c.deshabilitadoEn;
