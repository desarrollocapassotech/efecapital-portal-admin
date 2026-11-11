import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

/** Botón de ícono que copia `value` al portapapeles y confirma con un check. */
export const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  if (!value) return null;

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
    } catch {
      toast.error(`No se pudo copiar el ${label.toLowerCase()}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

/** Texto + botón de copiar alineados. */
export const CopyableText = ({
  value,
  label,
  className = '',
}: {
  value: string;
  label: string;
  className?: string;
}) => (
  <span className={`group inline-flex min-w-0 items-center gap-1 ${className}`}>
    <span className="truncate">{value}</span>
    <CopyButton value={value} label={label} />
  </span>
);
