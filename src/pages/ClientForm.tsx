import { useState, useRef, useEffect, useMemo } from 'react';
import { BrokerPicker } from '@/components/BrokerPicker';
import {
  FiscalFields,
  fiscalDraftFrom,
  fiscalFromDraft,
  validarFiscal,
  type FiscalDraft,
} from '@/components/FiscalFields';
import {
  SuscripcionFields,
  suscripcionDraftFrom,
  suscripcionFromDraft,
  validarSuscripcion,
  type SuscripcionDraft,
} from '@/components/SuscripcionFields';
import { buildBrokerOptions } from '@/lib/brokers';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Save, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
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
  investorProfile: 'Conservador' | 'Moderado' | 'Agresivo';
  objectives: string;
  investmentHorizon: string;
  notes: string;
};

// Componente RichTextEditor solo para objetivos
const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  error,
  id,
  onFieldBlur
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  id: string;
  onFieldBlur?: () => void;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const blurCallbackRef = useRef(onFieldBlur);

  useEffect(() => {
    blurCallbackRef.current = onFieldBlur;
  }, [onFieldBlur]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.contentEditable = 'true';
      editorRef.current.style.minHeight = '120px';
      editorRef.current.style.padding = '12px';
      editorRef.current.style.outline = 'none';
      editorRef.current.style.fontSize = '14px';
      editorRef.current.style.lineHeight = '1.5';
      
      if (value) {
        editorRef.current.innerHTML = value;
      } else {
        editorRef.current.innerHTML = `<p style="color: #94a3b8; margin: 0;">${placeholder}</p>`;
      }

      editorRef.current.addEventListener('focus', handleFocus);
      editorRef.current.addEventListener('blur', handleEditorBlur);
      editorRef.current.addEventListener('input', handleInput);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('focus', handleFocus);
        editorRef.current.removeEventListener('blur', handleEditorBlur);
        editorRef.current.removeEventListener('input', handleInput);
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentContent = editorRef.current.innerHTML;
      if (value && value !== currentContent) {
        editorRef.current.innerHTML = value;
      } else if (!value && !editorRef.current.textContent?.trim()) {
        editorRef.current.innerHTML = `<p style="color: #94a3b8; margin: 0;">${placeholder}</p>`;
      }
    }
  }, [value, placeholder]);

  const handleFocus = () => {
    if (editorRef.current && !value) {
      editorRef.current.innerHTML = '<p></p>';
      const range = document.createRange();
      const sel = window.getSelection();
      if (editorRef.current.firstChild) {
        range.setStart(editorRef.current.firstChild, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  const handleEditorBlur = () => {
    if (editorRef.current && !editorRef.current.textContent?.trim()) {
      editorRef.current.innerHTML = `<p style="color: #94a3b8; margin: 0;">${placeholder}</p>`;
      onChange('');
    }
    blurCallbackRef.current?.();
  };

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const textContent = editorRef.current.textContent || '';
      
      if (textContent.trim()) {
        onChange(content);
      } else {
        onChange('');
      }
    }
  };

  const executeCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value || undefined);
    editorRef.current?.focus();
  };

  const isCommandActive = (command: string) => {
    return document.queryCommandState(command);
  };

  const ToolbarButton = ({ 
    command, 
    icon: Icon, 
    title, 
    value: commandValue = null 
  }: {
    command: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value?: string | null;
  }) => {
    const isActive = isCommandActive(command);
    
    return (
      <Button
        type="button"
        variant={isActive ? "default" : "outline"}
        size="sm"
        onClick={() => executeCommand(command, commandValue)}
        title={title}
        className="h-8 w-8 p-0"
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  const insertList = (ordered = false) => {
    const command = ordered ? 'insertOrderedList' : 'insertUnorderedList';
    executeCommand(command);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 p-2 border border-input rounded-t-md bg-muted">
        <ToolbarButton command="bold" icon={Bold} title="Negrita (Ctrl+B)" />
        <ToolbarButton command="italic" icon={Italic} title="Cursiva (Ctrl+I)" />
        <ToolbarButton command="underline" icon={Underline} title="Subrayado (Ctrl+U)" />
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insertList(false)}
          title="Lista con viñetas"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insertList(true)}
          title="Lista numerada"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <ToolbarButton command="justifyLeft" icon={AlignLeft} title="Alinear a la izquierda" />
        <ToolbarButton command="justifyCenter" icon={AlignCenter} title="Centrar" />
        <ToolbarButton command="justifyRight" icon={AlignRight} title="Alinear a la derecha" />
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <select
          onChange={(e) => executeCommand('fontSize', e.target.value)}
          className="h-8 text-sm border border-input rounded px-2 bg-background"
          title="Tamaño de fuente"
        >
          <option value="2">Pequeño</option>
          <option value="3">Normal</option>
          <option value="4">Grande</option>
          <option value="5">Muy Grande</option>
        </select>
      </div>

      <div
        ref={editorRef}
        id={id}
        className={`border border-t-0 rounded-b-md focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring ${
          error ? 'border-destructive' : 'border-input'
        }`}
        style={{
          minHeight: '120px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
      />
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};

export const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { clients, addClient, updateClient, brokers, planes } = useDataStore();
  const { toast } = useToast();

  const isEditing = id && id !== 'new';
  const existingClient = isEditing ? clients.find(c => c.id === id) : null;

  const [formData, setFormData] = useState<FormState>({
    firstName: existingClient?.firstName ?? '',
    lastName: existingClient?.lastName ?? '',
    email: existingClient?.email ?? '',
    phone: existingClient?.phone ?? '',
    // Las opciones del select están en minúsculas (así se guarda); normalizar para que no quede vacío
    investorProfile: (existingClient?.investorProfile?.toLowerCase() ?? 'moderado') as FormState['investorProfile'],
    objectives: existingClient?.objectives ?? '',
    investmentHorizon: existingClient?.investmentHorizon ?? '',
    notes: '',
  });

  // Brokers: selección múltiple, se maneja aparte del resto de campos de texto
  const [selectedBrokers, setSelectedBrokers] = useState<string[]>(existingClient?.brokers ?? []);
  const [brokersError, setBrokersError] = useState('');
  const brokerOptions = useMemo(
    () => buildBrokerOptions(brokers.map((b) => b.name), existingClient?.brokers ?? []),
    [brokers, existingClient]
  );

  const [fiscalDraft, setFiscalDraft] = useState<FiscalDraft>(fiscalDraftFrom(existingClient?.fiscal));
  const [fiscalError, setFiscalError] = useState('');

  const [suscripcionDraft, setSuscripcionDraft] = useState<SuscripcionDraft>(suscripcionDraftFrom(existingClient?.suscripcion));
  const [suscripcionError, setSuscripcionError] = useState('');

  const handleBrokersChange = (next: string[]) => {
    setSelectedBrokers(next);
    if (next.length > 0) setBrokersError('');
  };

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const validateField = (field: keyof FormState, value: FormState[keyof FormState]) => {
    switch (field) {
      case 'firstName':
        return value.trim() ? '' : 'El nombre es requerido';
      case 'lastName':
        return value.trim() ? '' : 'El apellido es requerido';
      case 'email': {
        const trimmedEmail = value.trim();
        if (!trimmedEmail) return 'El email es requerido';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) return 'El email no es válido';
        const duplicateEmail = clients.find(c =>
          c.email === trimmedEmail && (!isEditing || c.id !== id)
        );
        if (duplicateEmail) {
          return 'Ya existe un cliente con este email';
        }
        return '';
      }
      case 'phone': {
        const trimmedPhone = value.trim();
        if (!trimmedPhone) return 'El teléfono es requerido';
        const phoneRegex = /^\+?[0-9\s()-]{7,20}$/;
        return phoneRegex.test(trimmedPhone)
          ? ''
          : 'Utiliza un formato válido (ej: +54 11 1234-5678)';
      }
      case 'objectives': {
        const plainText = value
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .trim();
        return plainText ? '' : 'Los objetivos son requeridos';
      }
      case 'investmentHorizon':
        return value.trim() ? '' : 'El horizonte de inversión es requerido';
      default:
        return '';
    }
  };

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (touchedFields[field] || errors[field]) {
      const errorMessage = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: errorMessage }));
    }
  };

  const handleBlur = <K extends keyof FormState>(field: K) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const errorMessage = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: errorMessage }));
  };

  const validateForm = () => {
    const fieldsToValidate: Array<keyof FormState> = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'objectives',
      'investmentHorizon',
    ];

    const newErrors: Partial<Record<keyof FormState, string>> = {};

    fieldsToValidate.forEach(field => {
      const errorMessage = validateField(field, formData[field]);
      if (errorMessage) {
        newErrors[field] = errorMessage;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setTouchedFields(prev => ({
        ...prev,
        ...fieldsToValidate.reduce(
          (acc, field) => ({ ...acc, [field]: true }),
          {} as Partial<Record<keyof FormState, boolean>>
        )
      }));
    }

    setErrors(newErrors);

    const brokersMessage = selectedBrokers.length > 0 ? '' : 'Selecciona al menos un broker';
    setBrokersError(brokersMessage);

    const fiscalMessage = validarFiscal(fiscalDraft);
    setFiscalError(fiscalMessage);

    const suscripcionMessage = validarSuscripcion(suscripcionDraft);
    setSuscripcionError(suscripcionMessage);

    return Object.keys(newErrors).length === 0 && !brokersMessage && !fiscalMessage && !suscripcionMessage;
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
        brokers: selectedBrokers,
        fiscal: fiscalFromDraft(fiscalDraft),
        suscripcion: suscripcionFromDraft(suscripcionDraft, existingClient?.suscripcion),
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
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={
          isEditing && existingClient
            ? [
                { label: 'Clientes', to: '/clients' },
                { label: `${existingClient.firstName} ${existingClient.lastName}`, to: `/clients/${id}` },
                { label: 'Editar' },
              ]
            : [{ label: 'Clientes', to: '/clients' }, { label: isEditing ? 'Editar' : 'Nuevo cliente' }]
        }
        title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
      />

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
                    onBlur={() => handleBlur('firstName')}
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
                    onBlur={() => handleBlur('lastName')}
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
                  onBlur={() => handleBlur('email')}
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
                  onBlur={() => handleBlur('phone')}
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
                <Label htmlFor="brokers">Brokers *</Label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Selecciona uno o más. Si no está en la lista, agrégalo abajo.
                </p>
                <BrokerPicker
                  id="brokers"
                  options={brokerOptions}
                  value={selectedBrokers}
                  onChange={handleBrokersChange}
                  error={brokersError}
                />
              </div>

              <div>
                <Label htmlFor="investmentHorizon">Horizonte de Inversión *</Label>
                <Input
                  id="investmentHorizon"
                  value={formData.investmentHorizon}
                  onChange={(e) => handleChange('investmentHorizon', e.target.value)}
                  onBlur={() => handleBlur('investmentHorizon')}
                  placeholder="Ej: 5-7 años, largo plazo, corto plazo"
                  className={errors.investmentHorizon ? 'border-destructive' : ''}
                />
                {errors.investmentHorizon && (
                  <p className="text-sm text-destructive mt-1">{errors.investmentHorizon}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Datos fiscales: opcionales al dar de alta, necesarios para facturar con Faktia */}
        <Card>
          <CardHeader>
            <CardTitle>Datos fiscales</CardTitle>
            <p className="text-sm text-muted-foreground">
              Necesarios para emitirle facturas. Podés completarlos ahora o antes de la primera factura.
            </p>
          </CardHeader>
          <CardContent>
            <FiscalFields
              value={fiscalDraft}
              onChange={(next) => {
                setFiscalDraft(next);
                if (fiscalError) setFiscalError(validarFiscal(next));
              }}
              error={fiscalError}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suscripción</CardTitle>
          </CardHeader>
          <CardContent>
            <SuscripcionFields
              value={suscripcionDraft}
              onChange={(next) => {
                setSuscripcionDraft(next);
                if (suscripcionError) setSuscripcionError(validarSuscripcion(next));
              }}
              planes={planes}
              existente={existingClient?.suscripcion}
              error={suscripcionError}
            />
          </CardContent>
        </Card>

        {/* Full-width sections */}
        <Card>
          <CardHeader>
            <CardTitle>Objetivos de Inversión</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="objectives">Objetivos *</Label>
            <RichTextEditor
              id="objectives"
              value={formData.objectives}
              onChange={(value) => handleChange('objectives', value)}
              onFieldBlur={() => handleBlur('objectives')}
              placeholder="Describe los objetivos financieros del cliente..."
              error={errors.objectives}
            />
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