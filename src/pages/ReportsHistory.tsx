import { useMemo, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Download,
  Eye,
  Filter,
  Search,
  Trash2,
  FileText,
  Users,
  ArrowLeft,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDataStore } from '@/stores/dataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const getDocumentTypeIcon = (type: Document['type']) => {
  switch (type) {
    case 'rendimiento':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'recomendaciones':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'informe_mercado':
      return <BarChart3 className="h-4 w-4 text-purple-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
};

export const ReportsHistory = () => {
  const { clients, documents, deleteDocument } = useDataStore();
  const { toast } = useToast();

  const [documentSearch, setDocumentSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<Document['type'] | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<Document['visibility'] | 'all'>('all');

  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filtrar por búsqueda de texto
    if (documentSearch.trim()) {
      const searchTerm = documentSearch.trim().toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchTerm) ||
          doc.description.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.type === typeFilter);
    }

    // Filtrar por visibilidad
    if (visibilityFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.visibility === visibilityFilter);
    }

    return filtered.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  }, [documents, documentSearch, typeFilter, visibilityFilter]);

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
    <div className="flex-1 space-y-6 p-6 pt-16 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Historial de Informes</h1>
            <p className="text-muted-foreground">
              Gestiona y filtra todos tus informes compartidos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDocumentSearch('');
              setTypeFilter('all');
              setVisibilityFilter('all');
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar informes..."
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as Document['type'] | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(documentTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as Document['visibility'] | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por audiencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las audiencias</SelectItem>
                {Object.entries(visibilityLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de informes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lista de informes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredDocuments.length > 0 
              ? `Mostrando ${filteredDocuments.length} de ${documents.length} informes`
              : documents.length === 0 
                ? 'No hay informes compartidos'
                : 'No se encontraron informes con los filtros aplicados'
            }
          </p>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
              {documents.length === 0 ? (
                <>
                  <FileText className="h-10 w-10" />
                  <div>
                    <p className="font-medium text-foreground">Todavía no has compartido informes.</p>
                    <p className="text-sm">
                      Ve a la página de gestión de informes para crear tu primer informe.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Search className="h-10 w-10" />
                  <div>
                    <p className="font-medium text-foreground">No se encontraron informes.</p>
                    <p className="text-sm">
                      Ajusta los filtros para ver más resultados.
                    </p>
                  </div>
                </>
              )}
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
                  {filteredDocuments.map((document) => {
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
                          <div className="flex items-center gap-3">
                            {getFileIcon(document.name)}
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
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDocumentTypeIcon(document.type)}
                            <Badge variant="outline">{documentTypeLabels[document.type]}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Intl.DateTimeFormat('es-ES', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(document.uploadDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>{audienceLabel}</p>
                            <p className="text-xs text-muted-foreground">{recipientsText}</p>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(document.size)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={document.fileUrl} target="_blank" rel="noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={document.fileUrl} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDelete(document.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

export default ReportsHistory;
