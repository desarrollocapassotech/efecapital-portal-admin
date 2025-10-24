import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  Upload,
  Users,
  ListChecks,
  FileText,
  Trash2,
  BarChart3,
  Plus,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '@/types';

const documentTypeLabels: Record<Document['type'], string> = {
  rendimiento: 'Seguimiento de cartera',
  recomendaciones: 'Recomendaciones personalizadas',
  informe_mercado: 'Informe de mercado',
};

const visibilityLabels: Record<Document['visibility'], string> = {
  all: 'Todos los clientes',
  selected: 'Clientes seleccionados',
};

const formatFileSize = (size: number) => {
  if (!size) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'xlsx':
    case 'xls':
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <FileImage className="h-4 w-4 text-blue-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};


export const Reports = () => {
  const { clients, documents, addDocument, deleteDocument } = useDataStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Document['type']>('informe_mercado');
  const [visibility, setVisibility] = useState<Document['visibility']>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState('');


  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();

    if (!term) {
      return clients;
    }

    return clients.filter((client) => {
      const haystack = `${client.firstName} ${client.lastName} ${client.email}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, clientSearch]);

  const handleToggleClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (file && !name) {
      setName(file.name);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedFile(null);
    setSelectedClients([]);
    setVisibility('all');
    setType('informe_mercado');
    setClientSearch('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Falta el nombre del informe',
        description: 'Asigna un nombre para identificar el informe que estás compartiendo.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'Adjunta un archivo',
        description: 'Selecciona el documento que quieres compartir con tus clientes.',
        variant: 'destructive',
      });
      return;
    }

    if (visibility === 'selected' && selectedClients.length === 0) {
      toast({
        title: 'Selecciona al menos un cliente',
        description: 'Debes elegir a qué clientes quieres enviar el informe personalizado.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDocument({
        name,
        description,
        type,
        visibility,
        clientIds:
          visibility === 'selected'
            ? selectedClients
            : clients.map((client) => client.id),
        file: selectedFile,
      });

      toast({
        title: 'Informe compartido',
        description:
          visibility === 'all'
            ? 'El informe estará disponible para todos los clientes.'
            : `Compartido con ${selectedClients.length} cliente(s) seleccionado(s).`,
      });

      resetForm();
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos compartir el informe',
        description: 'Intenta nuevamente. Si el problema persiste contacta al administrador.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      toast({
        title: 'Informe eliminado',
        description: 'El informe y su archivo fueron eliminados correctamente.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos eliminar el informe',
        description: 'Vuelve a intentarlo en unos segundos.',
        variant: 'destructive',
      });
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((item) => item.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Cliente eliminado';
  };

  return (
    <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Informes</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href="/reports/history">
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver Historial
            </a>
          </Button>
          <Button onClick={() => document.getElementById('upload-form')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Informe
          </Button>
        </div>
      </div>

      {/* Formulario de subida mejorado */}
      <Card id="upload-form">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Upload className="h-5 w-5" />
              Nuevo informe
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Adjunta el archivo, define los destinatarios y comparte la actualización.
            </p>
          </div>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <FileText className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-name">Nombre del informe</Label>
                <Input
                  id="report-name"
                  placeholder="Ej. Informe semanal de mercado"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de informe</Label>
                <Select value={type} onValueChange={(value) => setType(value as Document['type'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Descripción</Label>
              <Textarea
                id="report-description"
                placeholder="Describe brevemente el contenido del informe..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-file">Archivo</Label>
              <div className="relative">
                <Input
                  id="report-file"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  {getFileIcon(selectedFile.name)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label>Destinatarios</Label>
                <p className="text-sm text-muted-foreground">
                  Decide si el informe es para toda la cartera o para clientes específicos.
                </p>
              </div>
              <RadioGroup
                value={visibility}
                onValueChange={(value) => setVisibility(value as Document['visibility'])}
                className="grid gap-3 grid-cols-1 sm:grid-cols-2"
              >
                <label
                  htmlFor="visibility-all"
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-primary/50 ${visibility === 'all' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                >
                  <RadioGroupItem id="visibility-all" value="all" />
                  <div>
                    <p className="font-medium">Todos los clientes</p>
                    <p className="text-sm text-muted-foreground">
                      Ideal para reportes de mercado o comunicaciones generales.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="visibility-selected"
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-primary/50 ${visibility === 'selected'
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                    }`}
                >
                  <RadioGroupItem id="visibility-selected" value="selected" />
                  <div>
                    <p className="font-medium">Clientes seleccionados</p>
                    <p className="text-sm text-muted-foreground">
                      Para información personalizada o sensible.
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {visibility === 'selected' && (
                <div className="rounded-lg border border-dashed p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ListChecks className="h-4 w-4" />
                    Elige los clientes que podrán acceder al informe
                  </div>
                  <Input
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    placeholder="Buscar clientes por nombre o correo..."
                    className="mb-3"
                  />
                  <ScrollArea className="h-48 rounded-md border bg-muted/30 p-2">
                    <div className="space-y-2">
                      {clients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No hay clientes cargados en tu cartera todavía.
                        </p>
                      ) : filteredClients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No se encontraron clientes con ese criterio de búsqueda.
                        </p>
                      ) : (
                        filteredClients.map((client) => {
                          const isChecked = selectedClients.includes(client.id);
                          return (
                            <label
                              key={client.id}
                              className={`flex cursor-pointer items-center justify-between rounded-md border bg-background p-3 text-sm transition hover:border-primary/50 ${isChecked ? 'border-primary' : 'border-border'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => handleToggleClient(client.id)}
                                />
                                <div>
                                  <p className="font-medium">
                                    {client.firstName} {client.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{client.email}</p>
                                </div>
                              </div>
                              <Badge variant="outline">{client.investorProfile}</Badge>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  {selectedClients.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {selectedClients.length} cliente(s) seleccionado(s).
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Publicando...' : 'Compartir informe'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
