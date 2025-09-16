import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  investorProfile: 'conservador' | 'moderado' | 'agresivo';
  objectives: string;
  investmentHorizon: string;
  broker: string;
  notes: string;
};

export const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { clients, addClient, updateClient, brokers } = useDataStore();
  const { toast } = useToast();

  const isEditing = id && id !== 'new';
  const existingClient = isEditing ? clients.find(c => c.id === id) : null;

  const [formData, setFormData] = useState<FormState>({
    firstName: existingClient?.firstName ?? '',
    lastName: existingClient?.lastName ?? '',
    email: existingClient?.email ?? '',
    phone: existingClient?.phone ?? '',
    investorProfile: existingClient?.investorProfile ?? 'moderado',
    objectives: existingClient?.objectives ?? '',
    investmentHorizon: existingClient?.investmentHorizon ?? '',
    broker: existingClient?.broker ?? '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!formData.email.includes('@')) newErrors.email = 'El email no es válido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.objectives.trim()) newErrors.objectives = 'Los objetivos son requeridos';
    if (!formData.investmentHorizon.trim()) newErrors.investmentHorizon = 'El horizonte de inversión es requerido';
    if (!formData.broker.trim()) newErrors.broker = 'El broker es requerido';

    // Check for duplicate email (only for new clients or different email)
    const duplicateEmail = clients.find(c => 
      c.email === formData.email && (!isEditing || c.id !== id)
    );
    if (duplicateEmail) {
      newErrors.email = 'Ya existe un cliente con este email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive"
      });
      return;
    }

    try {
      const noteEntries = formData.notes.trim()
        ? [
            ...(existingClient?.notes ?? []),
            {
              text: formData.notes.trim(),
              date: new Date().toISOString(),
            },
          ]
        : existingClient?.notes;

      const baseData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        investorProfile: formData.investorProfile,
        objectives: formData.objectives,
        investmentHorizon: formData.investmentHorizon,
        broker: formData.broker,
      };

      if (isEditing) {
        const updatePayload = {
          ...baseData,
          ...(noteEntries ? { notes: noteEntries } : {}),
        };

        await updateClient(id, updatePayload);
        toast({
          title: "Cliente actualizado",
          description: "La información del cliente ha sido actualizada exitosamente"
        });
      } else {
        const notesForNewClient = formData.notes.trim()
          ? [{ text: formData.notes.trim(), date: new Date().toISOString() }]
          : [];

        await addClient({
          ...baseData,
          notes: notesForNewClient,
          lastContact: new Date()
        });
        toast({
          title: "Cliente creado",
          description: "El nuevo cliente ha sido registrado exitosamente"
        });
      }
      navigate('/clients');
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el cliente",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Actualiza la información del cliente' : 'Registra un nuevo cliente en el sistema'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Juan"
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Pérez"
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="juan.perez@email.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investment Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Inversión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="investorProfile">Perfil de Inversor *</Label>
                <Select
                  value={formData.investorProfile}
                  onValueChange={(value) =>
                    handleChange('investorProfile', value as FormState['investorProfile'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservador">Conservador</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="agresivo">Agresivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="broker">Broker *</Label>
                <Input
                  id="broker"
                  value={formData.broker}
                  onChange={(e) => handleChange('broker', e.target.value)}
                  placeholder="Ej: Banco Galicia, Invertir Online"
                  className={errors.broker ? 'border-destructive' : ''}
                  list="brokers-list"
                />
                <datalist id="brokers-list">
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.name} />
                  ))}
                </datalist>
                {errors.broker && (
                  <p className="text-sm text-destructive mt-1">{errors.broker}</p>
                )}
              </div>

              <div>
                <Label htmlFor="investmentHorizon">Horizonte de Inversión *</Label>
                <Input
                  id="investmentHorizon"
                  value={formData.investmentHorizon}
                  onChange={(e) => handleChange('investmentHorizon', e.target.value)}
                  placeholder="Ej: 5-7 años"
                  className={errors.investmentHorizon ? 'border-destructive' : ''}
                />
                {errors.investmentHorizon && (
                  <p className="text-sm text-destructive mt-1">{errors.investmentHorizon}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full-width sections */}
        <Card>
          <CardHeader>
            <CardTitle>Objetivos de Inversión</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="objectives">Objetivos *</Label>
            <Textarea
              id="objectives"
              value={formData.objectives}
              onChange={(e) => handleChange('objectives', e.target.value)}
              placeholder="Describe los objetivos financieros del cliente..."
              rows={3}
              className={errors.objectives ? 'border-destructive' : ''}
            />
            {errors.objectives && (
              <p className="text-sm text-destructive mt-1">{errors.objectives}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas adicionales sobre el cliente..."
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Estas notas solo son visibles para ti como asesora.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link to="/clients">Cancelar</Link>
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
};