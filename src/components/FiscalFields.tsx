import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientFiscal } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONDICIONES_IVA, TIPOS_DOCUMENTO, faktia, faktiaConfigurado, FaktiaError } from '@/lib/faktia';

export type FiscalDraft = {
  tipoDocumento: ClientFiscal['tipoDocumento'];
  numeroDocumento: string;
  condicionIva: ClientFiscal['condicionIva'] | '';
  razonSocial: string;
  domicilio: string;
};

export const fiscalDraftFrom = (fiscal?: ClientFiscal): FiscalDraft => ({
  tipoDocumento: fiscal?.tipoDocumento ?? 'CUIT',
  numeroDocumento: fiscal?.numeroDocumento ?? '',
  condicionIva: fiscal?.condicionIva ?? '',
  razonSocial: fiscal?.razonSocial ?? '',
  domicilio: fiscal?.domicilio ?? '',
});

/** Dígito verificador de CUIT/CUIL (módulo 11). */
export const cuitValido = (valor: string) => {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return verificador === Number(d[10]);
};

/** Valida el bloque fiscal. Vacío es válido (se completa antes de la primera factura). */
export const validarFiscal = (f: FiscalDraft): string => {
  const numero = f.numeroDocumento.replace(/\D/g, '');
  if (!numero && !f.condicionIva) return '';
  if (!numero) return 'Completá el número de documento';
  if ((f.tipoDocumento === 'CUIT' || f.tipoDocumento === 'CUIL') && !cuitValido(numero)) {
    return `El ${f.tipoDocumento} no es válido (revisá el dígito verificador)`;
  }
  if (f.tipoDocumento === 'DNI' && (numero.length < 7 || numero.length > 8)) return 'El DNI debe tener 7 u 8 dígitos';
  if (!f.condicionIva) return 'Elegí la condición frente al IVA';
  return '';
};

/** Convierte el borrador al dato a guardar (undefined si está vacío). */
export const fiscalFromDraft = (f: FiscalDraft): ClientFiscal | undefined => {
  const numero = f.numeroDocumento.replace(/\D/g, '');
  if (!numero || !f.condicionIva) return undefined;
  return {
    tipoDocumento: f.tipoDocumento,
    numeroDocumento: numero,
    condicionIva: f.condicionIva,
    ...(f.razonSocial.trim() ? { razonSocial: f.razonSocial.trim() } : {}),
    ...(f.domicilio.trim() ? { domicilio: f.domicilio.trim() } : {}),
  };
};

export const FiscalFields = ({
  value,
  onChange,
  error,
}: {
  value: FiscalDraft;
  onChange: (next: FiscalDraft) => void;
  error?: string;
}) => {
  const [consultando, setConsultando] = useState(false);
  const set = <K extends keyof FiscalDraft>(k: K, v: FiscalDraft[K]) => onChange({ ...value, [k]: v });
  const esCuit = value.tipoDocumento === 'CUIT' || value.tipoDocumento === 'CUIL';

  const consultarPadron = async () => {
    setConsultando(true);
    try {
      const datos = await faktia.padron(value.numeroDocumento);
      onChange({
        ...value,
        razonSocial: datos.razonSocial ?? value.razonSocial,
        condicionIva: datos.condicionIva ?? value.condicionIva,
        domicilio: datos.domicilio ?? value.domicilio,
      });
      toast.success('Datos completados desde el padrón de ARCA');
    } catch (err) {
      toast.error(err instanceof FaktiaError ? err.message : 'No se pudo consultar el padrón');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div>
          <Label htmlFor="tipoDocumento">Documento</Label>
          <Select value={value.tipoDocumento} onValueChange={(v) => set('tipoDocumento', v as FiscalDraft['tipoDocumento'])}>
            <SelectTrigger id="tipoDocumento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="numeroDocumento">Número</Label>
          <div className="flex gap-2">
            <Input
              id="numeroDocumento"
              inputMode="numeric"
              value={value.numeroDocumento}
              onChange={(e) => set('numeroDocumento', e.target.value)}
              placeholder={esCuit ? '20-12345678-9' : '12345678'}
              className={error ? 'border-destructive' : ''}
            />
            {esCuit && faktiaConfigurado && (
              <Button
                type="button"
                variant="outline"
                onClick={consultarPadron}
                disabled={consultando || !cuitValido(value.numeroDocumento)}
                title="Completar razón social, condición de IVA y domicilio desde ARCA"
              >
                {consultando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Padrón
              </Button>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="condicionIva">Condición frente al IVA</Label>
        <Select value={value.condicionIva} onValueChange={(v) => set('condicionIva', v as FiscalDraft['condicionIva'])}>
          <SelectTrigger id="condicionIva" className={error && !value.condicionIva ? 'border-destructive' : ''}>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {CONDICIONES_IVA.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="razonSocial">Razón social</Label>
          <Input
            id="razonSocial"
            value={value.razonSocial}
            onChange={(e) => set('razonSocial', e.target.value)}
            placeholder="Si se deja vacío, nombre y apellido"
          />
        </div>
        <div>
          <Label htmlFor="domicilio">Domicilio fiscal</Label>
          <Input id="domicilio" value={value.domicilio} onChange={(e) => set('domicilio', e.target.value)} placeholder="Opcional" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
