import { createLucideIcon } from 'lucide-react';

/**
 * Ícono de planes y suscripciones (pago periódico): flecha circular de `RotateCw` con un signo pesos chico adentro.
 * lucide no trae esta combinación; se arma con `createLucideIcon` para que se use igual que cualquier ícono de lucide.
 * El signo es el `DollarSign` de lucide escalado al 40 % alrededor del centro.
 */
export const SuscripcionIcon = createLucideIcon('Suscripcion', [
  ['path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', key: 'flecha' }],
  ['path', { d: 'M21 3v5h-5', key: 'punta' }],
  ['path', { d: 'M12 7.6v8.8', key: 'pesos-linea' }],
  ['path', { d: 'M14 9.2h-3a1.4 1.4 0 0 0 0 2.8h2a1.4 1.4 0 0 1 0 2.8H9.6', key: 'pesos-s' }],
]);
