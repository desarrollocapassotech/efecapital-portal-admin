import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useDataStore } from '@/stores/dataStore';
import { PageHeader } from '@/components/PageHeader';
import { FiscalFields, fiscalDraftFrom, fiscalFromDraft, validarFiscal, type FiscalDraft } from '@/components/FiscalFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sameBroker } from '@/lib/brokers';

/** Alta y edición de brokers (/brokers/new y /brokers/:id/edit). */
export const BrokerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { brokers, clients, isLoading, addBroker, updateBroker } = useDataStore();
  const editando = Boolean(id);
  const existente = editando ? brokers.find((b) => b.id === id) : undefined;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [fiscal, setFiscal] = useState<FiscalDraft>(fiscalDraftFrom());
  const [errores, setErrores] = useState<{ nombre?: string; email?: string; fiscal?: string }>({});
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(!editando);

  // Los brokers llegan por listener: se precarga el formulario cuando aparece el registro
  useEffect(() => {
    if (cargado || !existente) return;
    setNombre(existente.name);
    setEmail(existente.email ?? '');
    setTelefono(existente.phone ?? '');
    setNotas(existente.notes ?? '');
    setFiscal(fiscalDraftFrom(existente.fiscal));
    setCargado(true);
  }, [existente, cargado]);

  const clientesAfectados =
    existente && nombre.trim() && !sameBroker(nombre, existente.name)
      ? clients.filter((c) => c.brokers.some((b) => sameBroker(b, existente.name))).length
      : 0;

  const validar = () => {
    const e: typeof errores = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio';
    else if (brokers.some((b) => b.id !== id && sameBroker(b.name, nombre))) e.nombre = 'Ya existe un broker con ese nombre';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'El email no es válido';
    const f = validarFiscal(fiscal);
    if (f) e.fiscal = f;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) {
      toast.error('Revisá los datos del broker');
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        name: nombre.trim(),
        email: email.trim() || undefined,
        phone: telefono.trim() || undefined,
        notes: notas.trim() || undefined,
        fiscal: fiscalFromDraft(fiscal),
      };
      if (editando && id) await updateBroker(id, datos);
      else await addBroker(datos);
      toast.success(editando ? 'Broker actualizado' : 'Broker creado');
      navigate('/brokers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el broker');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = editando ? 'Editar broker' : 'Nuevo broker';
  const header = (
    <PageHeader
      breadcrumbs={[
        { label: 'Brokers', to: '/brokers' },
        ...(existente ? [{ label: existente.name }] : []),
        ...(editando ? [{ label: 'Editar' }] : [{ label: 'Nuevo broker' }]),
      ]}
      title={titulo}
    />
  );

  if (editando && !existente) {
    return (
      <div className="flex-1 space-y-6 p-3 pt-16 sm:p-6 lg:pt-6">
        {header}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <p>El broker no existe o fue eliminado.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/brokers">Ir a Brokers</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-3 pt-16 sm:p-6 lg:pt-6">
      {header}

      <form onSubmit={guardar} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos del broker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. BMB"
                className={errores.nombre ? 'border-destructive' : ''}
              />
              {errores.nombre && <p className="mt-1 text-sm text-destructive">{errores.nombre}</p>}
              {clientesAfectados > 0 && !errores.nombre && (
                <p className="mt-2 border-l-2 border-gold bg-gold/10 p-2 text-sm">
                  El nombre nuevo se va a aplicar también en {clientesAfectados === 1 ? '1 cliente' : `${clientesAfectados} clientes`}.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Opcional"
                  className={errores.email ? 'border-destructive' : ''}
                />
                {errores.email && <p className="mt-1 text-sm text-destructive">{errores.email}</p>}
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div>
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Opcional" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos fiscales</CardTitle>
            <p className="text-sm text-muted-foreground">Necesarios para facturarle las comisiones de cada mes.</p>
          </CardHeader>
          <CardContent>
            <FiscalFields
              value={fiscal}
              onChange={(next) => {
                setFiscal(next);
                if (errores.fiscal) setErrores((p) => ({ ...p, fiscal: validarFiscal(next) || undefined }));
              }}
              error={errores.fiscal}
              placeholderRazonSocial="Si se deja vacío, el nombre del broker"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link to="/brokers">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editando ? 'Guardar cambios' : 'Crear broker'}
          </Button>
        </div>
      </form>
    </div>
  );
};
