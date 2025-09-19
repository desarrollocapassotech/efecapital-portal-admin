import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
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
  broker: string;
  notes: string;
};

// Componente RichTextEditor solo para objetivos
const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  error, 
  id 
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  id: string;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

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
      editorRef.current.addEventListener('blur', handleBlur);
      editorRef.current.addEventListener('input', handleInput);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('focus', handleFocus);
        editorRef.current.removeEventListener('blur', handleBlur);
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

  const handleBlur = () => {
    if (editorRef.current && !editorRef.current.textContent?.trim()) {
      editorRef.current.innerHTML = `<p style="color: #94a3b8; margin: 0;">${placeholder}</p>`;
      onChange('');
    }
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
      <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-t-md bg-gray-50">
        <ToolbarButton command="bold" icon={Bold} title="Negrita (Ctrl+B)" />
        <ToolbarButton command="italic" icon={Italic} title="Cursiva (Ctrl+I)" />
        <ToolbarButton command="underline" icon={Underline} title="Subrayado (Ctrl+U)" />
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
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
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <ToolbarButton command="justifyLeft" icon={AlignLeft} title="Alinear a la izquierda" />
        <ToolbarButton command="justifyCenter" icon={AlignCenter} title="Centrar" />
        <ToolbarButton command="justifyRight" icon={AlignRight} title="Alinear a la derecha" />
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <select
          onChange={(e) => executeCommand('fontSize', e.target.value)}
          className="h-8 text-sm border border-gray-300 rounded px-2 bg-white"
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
        className={`border border-t-0 rounded-b-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-500' : 'border-gray-200'
        }`}
        style={{
          minHeight: '120px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
      />
      
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
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
    investorProfile: existingClient?.investorProfile ?? 'Moderado',
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
            <RichTextEditor
              id="objectives"
              value={formData.objectives}
              onChange={(value) => handleChange('objectives', value)}
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