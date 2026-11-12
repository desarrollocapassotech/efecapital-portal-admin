import { Mail } from 'lucide-react';

/**
 * Teléfono → número para wa.me (formato internacional sin "+").
 * Pensado para Argentina: sin código de país se asume 54 y celular (9).
 * "1137026666" → "5491137026666" · "54 9 11 5736-1066" → "5491157361066" · "+54 11 1234-5678" → "5491112345678"
 */
export const numeroWhatsApp = (telefono: string) => {
  let d = telefono.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2); // prefijo internacional
  if (d.startsWith('0')) d = d.slice(1); // 0 de larga distancia
  if (d.startsWith('54')) return d.startsWith('549') ? d : `549${d.slice(2)}`;
  return d.length <= 10 ? `549${d}` : d; // sin país: número argentino; más largo: ya trae otro país
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.45-9.43a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.67c0 5.2-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.7l6.1-1.6a11.33 11.33 0 0 0 5.37 1.37h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.34-8.04z" />
  </svg>
);

const linkIcono =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary';

/** Email + botón que abre el cliente de correo. */
export const EmailLink = ({ email, className = '' }: { email: string; className?: string }) =>
  email ? (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <span className="truncate">{email}</span>
      <a href={`mailto:${email}`} className={`${linkIcono} hover:text-primary`} title="Enviar email" aria-label={`Enviar email a ${email}`}>
        <Mail className="h-3.5 w-3.5" />
      </a>
    </span>
  ) : null;

/** Teléfono + botón que abre un chat de WhatsApp en una pestaña nueva. */
export const WhatsAppLink = ({ telefono, className = '' }: { telefono: string; className?: string }) => {
  const numero = numeroWhatsApp(telefono);
  if (!telefono) return null;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <span className="truncate">{telefono}</span>
      {numero && (
        <a
          href={`https://wa.me/${numero}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${linkIcono} hover:text-[#25D366]`}
          title="Abrir chat de WhatsApp"
          aria-label={`Abrir WhatsApp con ${telefono}`}
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
};
