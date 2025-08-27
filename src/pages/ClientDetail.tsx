import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Clock,
  Mail,
  TrendingUp,
  Target,
  Building,
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getMockDataForUser } from '@/data/mockData';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    clients,
    messages,
    activities,
    addMessage,
    updateClient,
  } = useDataStore();

  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newNote, setNewNote] = useState('');

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-foreground">Cliente no encontrado</h2>
          <Button asChild className="mt-4">
            <Link to="/clients">Volver a Clientes</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Mapeamos el cliente al formato del dashboard
  const user = {
    id: client.id,
    nombre: `${client.firstName} ${client.lastName}`,
    tipoInversor: client.investorProfile,
    broker: client.broker,
    objetivos: client.objectives,
    telefono: client.phone,
    email: client.email,
  };

  // Datos mockeados del cliente
  const mockData = getMockDataForUser(user.id);

  const clientMessages = messages
    .filter((m) => m.clientId === id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const clientActivities = activities
    .filter((a) => a.clientId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    // Enviar mensaje de texto
    if (newMessage.trim()) {
      addMessage({
        clientId: id!,
        content: newMessage,
        timestamp: new Date(),
        isFromAdvisor: true,
        status: 'respondido',
      });
    }

    // Enviar cada archivo como mensaje
    attachments.forEach((file) => {
      const content = `[${file.type.startsWith('image/') ? 'Imagen' : 'PDF'}: ${file.name}]`;
      addMessage({
        clientId: id!,
        content,
        timestamp: new Date(),
        isFromAdvisor: true,
        status: 'respondido',
      });
    });

    // Limpiar
    setNewMessage('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleUpdateNotes = () => {
    if (newNote.trim()) {
      updateClient(id!, {
        notes: client.notes + '\n\n' + new Date().toLocaleDateString() + ': ' + newNote,
      });
      setNewNote('');
    }
  };

  const getTipoInversorColor = (tipo: string) => {
    switch (tipo) {
      case 'conservador':
        return 'bg-blue-100 text-blue-800';
      case 'moderado':
        return 'bg-green-100 text-green-800';
      case 'agresivo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link to="/clients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {client.firstName} {client.lastName}
            </h1>
            <p className="text-muted-foreground">Vista completa del cliente</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/clients/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      {/* === PARTE SUPERIOR: Información del cliente === */}
      <div className="space-y-6">
        {/* Tipo de inversor y Bróker */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tipo de Inversor</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge className={getTipoInversorColor(user.tipoInversor || '')}>
                {user.tipoInversor}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bróker</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{user.broker}</div>
            </CardContent>
          </Card>
        </div>

        {/* Objetivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objetivos de Inversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{user.objetivos}</p>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground leading-relaxed">📞 {user.telefono}</p>
            <p className="text-muted-foreground leading-relaxed">📧 {user.email}</p>
          </CardContent>
        </Card>
      </div>

      {/* === Pestañas: Mensajes, Notas, Actividad === */}
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
          <TabsTrigger value="notes">Notas Internas</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        {/* === MESSAGES TAB === */}
        <TabsContent value="messages" className="flex flex-col h-full">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Centro de Comunicaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              {/* Historial de mensajes */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {clientMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No hay mensajes todavía</p>
                ) : (
                  <div className="space-y-3">
                    {clientMessages.map((message) => {
                      const isFile =
                        message.content.startsWith('[PDF:') || message.content.startsWith('[Imagen:');

                      // Extraemos el nombre del archivo del contenido: `[PDF: nombre.pdf]`
                      const getFileName = () => {
                        const match = message.content.match(/\[.*?:\s*(.+?)\]/);
                        return match ? match[1] : 'Archivo';
                      };

                      const fileName = getFileName();

                      return (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg max-w-[80%] ${message.isFromAdvisor
                              ? 'bg-primary/10 border-l-4 border-primary ml-8 self-end'
                              : 'bg-muted border-l-4 border-border mr-8 self-start'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {message.isFromAdvisor ? 'Tú (Asesora)' : client.firstName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(message.timestamp, 'dd/MM HH:mm', { locale: es })}
                            </span>
                          </div>

                          {isFile ? (
                            // Vista especial para archivos
                            <div
                              className={`flex items-center gap-3 p-3 bg-background border border-border rounded-lg shadow-sm cursor-pointer hover:shadow transition-shadow`}
                              onClick={() => alert(`Simulando descarga de: ${fileName}`)}
                            >
                              {message.content.startsWith('[Imagen:') ? (
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-primary" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">{fileName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {message.content.startsWith('[Imagen:') ? 'Imagen' : 'Documento PDF'}
                                </p>
                              </div>

                              <FileDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          ) : (
                            // Mensaje de texto normal
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Input de mensaje */}
              <div className="space-y-3 border-t pt-4">
                {/* Vista previa de adjuntos */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted rounded">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-background px-2 py-1 rounded text-sm border"
                      >
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="max-w-xs truncate">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-destructive hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <label className="cursor-pointer p-2 hover:bg-muted rounded">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>

                  <Textarea
                    placeholder="Escribir nuevo mensaje al cliente..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={3}
                    className="flex-1"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && attachments.length === 0}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Puedes adjuntar PDFs o imágenes. Presiona{' '}
                  <kbd className="px-1 bg-background border rounded">Enter</kbd> para enviar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === NOTAS INTERNAS === */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Agregar nueva nota interna..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleUpdateNotes} disabled={!newNote.trim()}>
                  Agregar Nota
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Historial de Notas</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {client.notes || 'No hay notas registradas'}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ACTIVIDAD === */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              {clientActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay actividades registradas</p>
              ) : (
                <div className="space-y-4">
                  {clientActivities.map((activity) => (
                    <div key={activity.id} className="flex space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {format(activity.timestamp, 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetail;