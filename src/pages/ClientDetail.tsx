import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Mail,
  TrendingUp,
  Target,
  Building,
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  FileDown,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    clients,
    messages,
    activities,
    addMessage,
    updateClient,
    markClientMessagesAsRead,
  } = useDataStore();

  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

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

  const clientMessages = useMemo(
    () =>
      messages
        .filter((m) => m.clientId === id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [id, messages]
  );

  useEffect(() => {
    if (!id) {
      return;
    }

    const hasUnseenMessages = clientMessages.some(
      (message) => !message.isFromAdvisor && !message.visto
    );

    if (hasUnseenMessages) {
      markClientMessagesAsRead(id);
    }
  }, [id, clientMessages, markClientMessagesAsRead]);

  const clientActivities = activities
    .filter((a) => a.clientId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    try {
      if (newMessage.trim()) {
        await addMessage({
          clientId: id!,
          content: newMessage,
          timestamp: new Date(),
          isFromAdvisor: true,
          status: 'respondido',
        });
      }

      for (const file of attachments) {
        const content = `[${file.type.startsWith('image/') ? 'Imagen' : 'PDF'}: ${file.name}]`;
        await addMessage({
          clientId: id!,
          content,
          timestamp: new Date(),
          isFromAdvisor: true,
          status: 'respondido',
        });
      }

      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error al enviar el mensaje', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleUpdateNotes = async () => {
    if (!newNote.trim()) return;

    const updatedNotes = [
      ...(Array.isArray(client.notes) ? client.notes : []),
      {
        text: newNote.trim(),
        date: new Date().toISOString(),
      },
    ];

    try {
      await updateClient(id!, { notes: updatedNotes });
      setNewNote('');
    } catch (error) {
      console.error('Error al actualizar las notas', error);
    }
  };

  const startEditing = (index: number) => {
    if (!client.notes || !Array.isArray(client.notes)) return;
    const note = client.notes[index];
    if (!note) return;
    setEditingNoteIndex(index);
    setEditingNoteText(note.text);
  };

  const cancelEdit = () => {
    setEditingNoteIndex(null);
    setEditingNoteText('');
  };

  const saveEdit = async () => {
    if (editingNoteIndex === null || !editingNoteText.trim() || !client.notes || !Array.isArray(client.notes)) return;

    const updatedNotes = [...client.notes];
    updatedNotes[editingNoteIndex] = {
      ...updatedNotes[editingNoteIndex],
      text: editingNoteText.trim(),
    };

    try {
      await updateClient(id!, { notes: updatedNotes });
      setEditingNoteIndex(null);
      setEditingNoteText('');
    } catch (error) {
      console.error('Error al guardar la nota', error);
    }
  };

  const getTipoInversorColor = (tipo: string) => {
    switch (tipo) {
      case 'Conservador':
        return 'bg-blue-100 text-blue-800';
      case 'Moderado':
        return 'bg-green-100 text-green-800';
      case 'Agresivo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="p-2" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Link>
        </Button>

        <div className="flex-1 flex flex-col items-center text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Vista completa del cliente</p>
        </div>

        <Button variant="default" size="sm" className="p-2" asChild>
          <Link to={`/clients/${id}/edit`}>
            <Edit className="h-4 w-4" />
            <span className="sr-only">Editar</span>
          </Link>
        </Button>
      </div>

      {/* Información del cliente */}
      <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objetivos de Inversión
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div
            className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: user?.objetivos || "Comparte tus objetivos financieros con tu asesora para recibir recomendaciones personalizadas."
            }}
          />
        </CardContent>
        </Card>

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

      {/* Pestañas */}
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
          <TabsTrigger value="notes">Notas Internas</TabsTrigger>
        </TabsList>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="flex flex-col h-full">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Mensajes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
              {/* Historial de mensajes con scroll */}
              <div
                className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0"
                style={{
                  maxHeight: 'calc(100vh - 400px)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9ca3af transparent',
                }}
              >
                {clientMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No hay mensajes todavía</p>
                ) : (
                  <div className="space-y-3">
                    {clientMessages.map((message) => {
                      const isFile =
                        message.content.startsWith('[PDF:') || message.content.startsWith('[Imagen:');

                      const getFileName = () => {
                        const match = message.content.match(/\[.*?:\s*(.+?)\]/);
                        return match ? match[1] : 'Archivo';
                      };

                      const fileName = getFileName();

                      return (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg max-w-[80%] ${
                            message.isFromAdvisor
                              ? 'bg-primary/10 border-l-4 border-primary ml-8 self-end'
                              : 'bg-muted border-l-4 border-border mr-8 self-start'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2 gap-4">
                            <span className="text-sm font-medium">
                              {message.isFromAdvisor ? 'Tú (Asesora)' : client.firstName}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {format(new Date(message.timestamp), 'dd/MM HH:mm', { locale: es })}
                              </span>
                              {message.visto ? (
                                <CheckCheck
                                  className="h-4 w-4 text-emerald-500"
                                  aria-label="Mensaje visto"
                                />
                              ) : (
                                <Clock
                                  className="h-4 w-4 text-muted-foreground"
                                  aria-label="Mensaje pendiente de lectura"
                                />
                              )}
                            </div>
                          </div>

                          {isFile ? (
                            <div
                              className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg shadow-sm cursor-pointer hover:shadow transition-shadow"
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
                          aria-label={`Eliminar ${file.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <label
                    className="cursor-pointer p-2 hover:bg-muted rounded"
                    aria-label="Adjuntar archivo"
                  >
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
                    aria-label="Enviar mensaje"
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

        {/* NOTAS INTERNAS */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Textarea
                  placeholder="Agregar una nueva nota interna..."
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
                {client.notes ? (
                  Array.isArray(client.notes) ? (
                    <div
                      className="space-y-4 max-h-[400px] overflow-y-auto pr-2"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#9ca3af transparent' }}
                    >
                      {[...client.notes]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((note, index) => {
                          const originalIndex = client.notes!.findIndex(
                            (n) => n.date === note.date && n.text === note.text
                          );
                          const isEditing = editingNoteIndex === originalIndex;

                          return (
                            <div
                              key={`${note.date}-${index}`}
                              className="p-3 bg-muted rounded-lg border border-border space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-primary">
                                  {format(new Date(note.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </span>
                                {isEditing ? (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={saveEdit}
                                      disabled={!editingNoteText.trim()}
                                    >
                                      Guardar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(originalIndex)}
                                    aria-label="Editar nota"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>

                              {isEditing ? (
                                <Textarea
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  rows={3}
                                  className="text-sm"
                                  autoFocus
                                />
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-lg border border-border">
                      <span className="text-xs font-medium text-muted-foreground">
                        {client.createdAt
                          ? format(new Date(client.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })
                          : 'Fecha desconocida'}
                      </span>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{client.notes}</p>
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground text-sm">No hay notas registradas.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetail;