import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import type { Client } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Minúsculas y sin acentos, para que "jose" encuentre "José"
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const fullName = (client: Client) => `${client.firstName} ${client.lastName}`.trim();

/** Select de cliente con buscador (por nombre, email o teléfono). `value` es el id del cliente o '' para "Todos". */
export const ClientCombobox = ({
  clients,
  value,
  onChange,
  id,
}: {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  id?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === value);
  const sorted = [...clients].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es', { sensitivity: 'base' }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            className="flex h-10 w-full items-center justify-between border border-input bg-background px-3 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
              {selected ? fullName(selected) : 'Todos'}
            </span>
            <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${selected ? 'invisible' : ''}`} />
          </button>
        </PopoverTrigger>
        {selected && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground hover:bg-secondary hover:text-primary"
            aria-label="Quitar cliente seleccionado"
            title="Quitar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0">
        <Command filter={(itemValue, search) => (normalize(itemValue).includes(normalize(search)) ? 1 : 0)}>
          <CommandInput placeholder="Buscar por nombre, email o teléfono..." />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__todos__ todos"
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                <Check className={`mr-2 h-4 w-4 ${!value ? 'opacity-100' : 'opacity-0'}`} />
                Todos
              </CommandItem>
              {sorted.map((client) => (
                <CommandItem
                  key={client.id}
                  // El texto de búsqueda incluye email y teléfono; el id lo hace único
                  value={`${fullName(client)} ${client.email} ${client.phone} ${client.id}`}
                  onSelect={() => {
                    onChange(client.id);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 shrink-0 ${value === client.id ? 'opacity-100' : 'opacity-0'}`} />
                  <div className="min-w-0">
                    <p className="truncate">{fullName(client)}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
