import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Upload, Users, ListChecks, FileText, Trash2 } from 'lucide-react';
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
  rendimiento: 'Rendimiento de cartera',
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

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) => b.uploadDate.getTime() - a.uploadDate.getTime()
      ),
    [documents]
  );

  const totalDocuments = documents.length;
  const documentsForAll = documents.filter((doc) => doc.visibility === 'all').length;
  const documentsWithCustomAudience = totalDocuments - documentsForAll;

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
    <div className="flex-1 space-y-6 p-6 pt-16 lg:pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Informes</h1>
          <p className="text-muted-foreground">
            Publica informes para toda tu cartera o elige clientes específicos.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Nuevo informe</CardTitle>
              <p className="text-sm text-muted-foreground">
                Adjunta el archivo, define los destinatarios y comparte la actualización.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Upload className="h-5 w-5" />
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
                <Input id="report-file" type="file" onChange={handleFileChange} />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} · {formatFileSize(selectedFile.size)}
                  </p>
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
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label
                    htmlFor="visibility-all"
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-primary/50 ${
                      visibility === 'all' ? 'border-primary bg-primary/5' : 'border-border'
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
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition hover:border-primary/50 ${
                      visibility === 'selected'
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
                    <ScrollArea className="h-48 rounded-md border bg-muted/30 p-2">
                      <div className="space-y-2">
                        {clients.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No hay clientes cargados en tu cartera todavía.
                          </p>
                        ) : (
                          clients.map((client) => {
                            const isChecked = selectedClients.includes(client.id);
                            return (
                              <label
                                key={client.id}
                                className={`flex cursor-pointer items-center justify-between rounded-md border bg-background p-3 text-sm transition hover:border-primary/50 ${
                                  isChecked ? 'border-primary' : 'border-border'
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

        <Card className="h-full">
          <CardHeader className="space-y-1">
            <CardTitle>Resumen de informes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vista rápida del estado actual de los informes compartidos.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Informes publicados</p>
                  <p className="text-2xl font-semibold">{totalDocuments}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  Disponible para todos los clientes
                </div>
                <Badge variant="secondary">{documentsForAll}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Con destinatarios personalizados
                </div>
                <Badge variant="secondary">{documentsWithCustomAudience}</Badge>
              </div>
            </div>

            <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Comparte informes generales con toda tu cartera y utiliza la distribución
              personalizada para compartir recomendaciones específicas con determinados clientes.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de informes compartidos</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
              <Upload className="h-10 w-10" />
              <div>
                <p className="font-medium text-foreground">Todavía no has compartido informes.</p>
                <p className="text-sm">
                  Publica tu primer informe para visualizarlo en este listado.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Informe</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Publicado</TableHead>
                    <TableHead>Destinatarios</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDocuments.map((document) => {
                    const audienceLabel = visibilityLabels[document.visibility];
                    const clientNames = document.clientIds.map(getClientName);
                    const recipientsText =
                      document.visibility === 'all'
                        ? 'Todos los clientes'
                        : clientNames.length > 0
                          ? clientNames.join(', ')
                          : 'Clientes eliminados';

                    return (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              {document.name}
                            </a>
                            {document.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {document.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{documentTypeLabels[document.type]}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Intl.DateTimeFormat('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(document.uploadDate)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>{audienceLabel}</p>
                            <p className="text-xs text-muted-foreground">{recipientsText}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(document.size)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleDelete(document.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar informe</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
