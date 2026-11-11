/**
 * Normalización de brokers.
 *
 * Un cliente puede operar con varios brokers. En Firestore se guarda:
 *  - `brokers: string[]` → fuente de verdad (nombres canónicos, ej. ["BMB", "IOL"])
 *  - `broker: string`    → mismos nombres unidos por ", " (compatibilidad con el portal de clientes)
 *
 * Clientes viejos solo tienen `broker` como texto libre ("BMB y IOL", "Invertir Online"...):
 * se separa y se mapea a los nombres canónicos al leer.
 */

/** Brokers base; se crean en la colección `brokers` si no existen. */
export const DEFAULT_BROKERS = ['BMB', 'IOL', 'Balanz'] as const;

/** Variantes conocidas → nombre canónico (claves en minúsculas, sin acentos). */
const ALIASES: Record<string, string> = {
  bmb: 'BMB',
  iol: 'IOL',
  'invertir online': 'IOL',
  invertironline: 'IOL',
  balanz: 'Balanz',
  'balanz capital': 'Balanz',
};

const keyOf = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Separa un texto libre con varios brokers: "BMB y IOL", "BMB, IOL", "BMB / IOL", "BMB + IOL". */
export const splitBrokerText = (text: unknown): string[] => {
  if (typeof text !== 'string') return [];
  return text
    .split(/\s*(?:,|;|\/|\+|&|\s+y\s+|\s+e\s+)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
};

/**
 * Devuelve el nombre canónico: primero alias conocidos, después coincidencia
 * (sin distinguir mayúsculas/acentos) contra `known`; si no hay, el nombre tal cual, recortado.
 */
export const canonicalBrokerName = (name: string, known: readonly string[] = []): string => {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const key = keyOf(trimmed);
  if (ALIASES[key]) return ALIASES[key];
  return known.find((candidate) => keyOf(candidate) === key) ?? trimmed;
};

/** Normaliza y deduplica una lista de brokers. */
export const normalizeBrokerList = (names: readonly string[], known: readonly string[] = []): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    // Por si algún valor viene con varios brokers juntos ("BMB y IOL")
    for (const part of splitBrokerText(raw)) {
      const name = canonicalBrokerName(part, known);
      const key = keyOf(name);
      if (!name || seen.has(key)) continue;
      seen.add(key);
      result.push(name);
    }
  }
  return result;
};

/** Lee los brokers de un documento de cliente (nuevo esquema o texto viejo). */
export const brokersFromClientData = (data: { brokers?: unknown; broker?: unknown }): string[] => {
  if (Array.isArray(data.brokers)) {
    return normalizeBrokerList(data.brokers.filter((b): b is string => typeof b === 'string'));
  }
  return normalizeBrokerList(splitBrokerText(data.broker));
};

const collator = new Intl.Collator('es', { sensitivity: 'base' });

/** Opciones para selects: brokers base + colección `brokers` + los usados por clientes, sin duplicados. */
export const buildBrokerOptions = (...sources: ReadonlyArray<readonly string[]>): string[] =>
  normalizeBrokerList([...DEFAULT_BROKERS, ...sources.flat()], DEFAULT_BROKERS).sort(collator.compare);

export const formatBrokers = (brokers: readonly string[]) => brokers.join(', ');

export const sameBroker = (a: string, b: string) => keyOf(a) === keyOf(b);
