import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  FileText,
  Clock,
  User,
  Mail,
  Phone,
  TrendingUp,
  Target,
  Building,
  FileDown,
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
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
    documents,
    activities,
    addMessage,
    updateMessageStatus,
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

  const clientDocuments = documents
    .filter((d) => d.clientId === id)
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

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

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'conservador':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'agresivo':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'pendiente':
  //       return 'bg-warning text-warning-foreground';
  //     case 'respondido':
  //       return 'bg-success text-success-foreground';
  //     case 'en_revision':
  //       return 'bg-primary text-primary-foreground';
  //     default:
  //       return 'bg-secondary text-secondary-foreground';
  //   }
  // };

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

      {/* === PARTE SUPERIOR: Igual que el dashboard del cliente === */}
      <div className="space-y-6">
        {/* Profile Overview */}
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

        {/* Objectives */}
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

        {/* Contact */}
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

      {/* === PARTE INFERIOR: Tabs admin (mensajes, documentos, etc.) === */}
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="notes">Notas Internas</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
<TabsContent value="messages" className="flex flex-col h-full">
  <Card className="flex-1 flex flex-col">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        Centro de Comunicaciones
      </CardTitle>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col space-y-4">
      {/* Historial de mensajes (arriba) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {clientMessages.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No hay mensajes todavía</p>
        ) : (
          <div className="space-y-3">
            {clientMessages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.isFromAdvisor
                    ? 'bg-primary/10 border-l-4 border-primary ml-8'
                    : 'bg-muted border-l-4 border-border mr-8'
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
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input de mensaje (abajo) */}
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
          {/* Botón de adjuntar */}
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

          {/* Área de texto */}
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

          {/* Botón de enviar */}
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

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientDocuments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay documentos subidos</p>
              ) : (
                <div className="space-y-3">
                  {clientDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <h4 className="font-medium">{doc.name}</h4>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{doc.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(doc.uploadDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <FileDown className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
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

        {/* Activity Tab */}
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