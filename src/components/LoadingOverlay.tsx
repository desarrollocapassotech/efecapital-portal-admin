import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export const LoadingOverlay = ({
  message = 'Cargando información...',
  className,
}: LoadingOverlayProps) => {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <p className="mt-4 text-sm font-medium text-muted-foreground" role="status">
        {message}
      </p>
    </div>
  );
};
