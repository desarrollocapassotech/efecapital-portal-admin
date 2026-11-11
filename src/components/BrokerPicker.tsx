import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { canonicalBrokerName, sameBroker } from '@/lib/brokers';

/**
 * Selección múltiple de brokers: botones para alternar los existentes
 * y un campo para agregar uno nuevo (se crea en la colección al guardar el cliente).
 */
export const BrokerPicker = ({
  options,
  value,
  onChange,
  error,
  id,
}: {
  options: string[];
  value: string[];
  onChange: (brokers: string[]) => void;
  error?: string;
  id?: string;
}) => {
  const [newBroker, setNewBroker] = useState('');
  // Brokers nuevos agregados en esta sesión del formulario (todavía no están en la colección)
  const [extraOptions, setExtraOptions] = useState<string[]>([]);

  const allOptions = [...options, ...extraOptions.filter((e) => !options.some((o) => sameBroker(o, e)))];
  const isSelected = (broker: string) => value.some((v) => sameBroker(v, broker));

  const toggle = (broker: string) => {
    onChange(isSelected(broker) ? value.filter((v) => !sameBroker(v, broker)) : [...value, broker]);
  };

  const addNew = () => {
    const name = canonicalBrokerName(newBroker, allOptions);
    if (!name) return;
    if (!allOptions.some((o) => sameBroker(o, name))) {
      setExtraOptions((prev) => [...prev, name]);
    }
    if (!isSelected(name)) {
      onChange([...value, name]);
    }
    setNewBroker('');
  };

  return (
    <div className="space-y-3">
      <div id={id} role="group" aria-label="Brokers" className="flex flex-wrap gap-2">
        {allOptions.map((broker) => {
          const selected = isSelected(broker);
          return (
            <button
              key={broker}
              type="button"
              onClick={() => toggle(broker)}
              aria-pressed={selected}
              className={`inline-flex h-9 items-center gap-1.5 border px-3 text-sm font-medium transition-colors ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-foreground hover:border-primary hover:bg-secondary'
              } ${error && !selected ? 'border-destructive' : ''}`}
            >
              {selected && <Check className="h-3.5 w-3.5" />}
              {broker}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={newBroker}
          onChange={(e) => setNewBroker(e.target.value)}
          onKeyDown={(e) => {
            // Enter agrega el broker en lugar de enviar el formulario
            if (e.key === 'Enter') {
              e.preventDefault();
              addNew();
            }
          }}
          placeholder="Agregar otro broker"
          aria-label="Nombre del nuevo broker"
          className="h-9 text-sm"
        />
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={addNew} disabled={!newBroker.trim()}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
