import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

/** Encabezado de tabla ordenable: clic ordena, segundo clic invierte (patrón de listados). */
export const SortableHead = <K extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: K;
  activeKey: K;
  direction: SortDirection;
  onSort: (key: K) => void;
  className?: string;
}) => {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          '-ml-2 inline-flex items-center gap-1.5 px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground',
          active && 'text-foreground'
        )}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'opacity-50'}`} />
      </button>
    </TableHead>
  );
};
