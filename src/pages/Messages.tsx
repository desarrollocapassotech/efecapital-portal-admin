import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, MessageCircle, Search } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Messages = () => {
  const { messages, clients, updateClient } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<{ clientId: string; index: number } | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  useEffect(() => {
    if (clients.length === 0) {
      return;
    }

    const existingClient = clients.find((client) => client.id === selectedClientId);
    if (!existingClient) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedClientNotes = useMemo(() => {
    if (!selectedClient || !Array.isArray(selectedClient.notes)) {
      return [];
    }

    return [...selectedClient.notes].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [selectedClient]);

  const newMessagesCount = messages.filter(
    (msg) => !msg.isFromAdvisor && (!msg.read)
  ).length;
  const displayNewMessagesCount = newMessagesCount > 99 ? '99+' : newMessagesCount;
  const hasNewMessages = newMessagesCount > 0;

  // Filtrar clientes que tengan mensajes y coincidan con el término de búsqueda
  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        const clientMessages = messages.filter((m) => m.clientId === client.id);
        if (clientMessages.length === 0) return false;

        const matchesSearch =
          searchTerm === '' ||
          client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.lastName.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
      })
      .sort((a, b) => {
        // Ordenar por mensaje más reciente
        const aMessages = messages.filter((m) => m.clientId === a.id);
        const bMessages = messages.filter((m) => m.clientId === b.id);

        const aLatest = aMessages.length ? new Date(aMessages[0].timestamp) : new Date(0);
        const bLatest = bMessages.length ? new Date(bMessages[0].timestamp) : new Date(0);

        return bLatest.getTime() - aLatest.getTime();
      });
  }, [clients, messages, searchTerm]);

  // Verificar si hay mensajes no leídos (del cliente y no leídos)
  const hasUnreadMessages = (clientId: string) => {
    return messages.some(
      (msg) => msg.clientId === clientId && !msg.isFromAdvisor && !msg.read
    );
  };

  const handleAddNote = async () => {
    if (!selectedClient || !newNote.trim()) {
      return;
    }

    const existingNotes = Array.isArray(selectedClient.notes) ? selectedClient.notes : [];
    const updatedNotes = [
      ...existingNotes,
      {
        text: newNote.trim(),
        date: new Date().toISOString(),
      },
    ];

    try {
      await updateClient(selectedClient.id, { notes: updatedNotes });
      setNewNote('');
    } catch (error) {
      console.error('Error al agregar la nota', error);
    }
  };

  const startEditingNote = (clientId: string, index: number, text: string) => {
    setEditingNote({ clientId, index });
    setEditingNoteText(text);
  };

  const cancelEditingNote = () => {
    setEditingNote(null);
    setEditingNoteText('');
  };

  const saveEditingNote = async () => {
    if (!editingNote || !editingNoteText.trim()) {
      return;
    }

    const client = clients.find((item) => item.id === editingNote.clientId);
    if (!client || !Array.isArray(client.notes)) {
      return;
    }

    const updatedNotes = [...client.notes];
    updatedNotes[editingNote.index] = {
      ...updatedNotes[editingNote.index],
      text: editingNoteText.trim(),
    };

    try {
      await updateClient(client.id, { notes: updatedNotes });
      setEditingNote(null);
      setEditingNoteText('');
    } catch (error) {
      console.error('Error al guardar la nota', error);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="relative lg:hidden">
            <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            {hasNewMessages && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:min-w-[1.5rem] px-1 text-xs leading-none flex items-center justify-center"
              >
                {displayNewMessagesCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mensajes</h1>
          </div>
        </div>
        {hasNewMessages && (
          <Badge className="hidden lg:inline-flex h-6 min-w-[1.5rem] px-2 text-xs items-center justify-center">
            {displayNewMessagesCount}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
          <TabsTrigger value="notes">Notas internas</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-6">
          {/* Search Bar */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Clientes ({filteredClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm
                    ? 'No se encontraron clientes con ese nombre'
                    : 'No tienes mensajes todavía'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredClients.map((client) => {
                    const clientMessages = messages.filter((m) => m.clientId === client.id);
                    const latestMessage = clientMessages[0];
                    return (
                      <Link
                        key={client.id}
                        to={`/messages/${client.id}`}
                        className="rounded-lg border border-border/60 bg-background/80 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex flex-col gap-3 p-3 sm:p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-center gap-3 sm:gap-4">
                              {/* Avatar con indicador de no leído */}
                              <div className="relative">
                                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary">
                                  <span className="text-sm sm:text-base font-medium text-primary-foreground">
                                    {client.firstName[0]}
                                    {client.lastName[0]}
                                  </span>
                                </div>
                                {hasUnreadMessages(client.id) && (
                                  <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500 ring-2 ring-background"></span>
                                )}
                              </div>

                              {/* Información del cliente */}
                              <div className="min-w-0 space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    to={`/messages/${client.id}`}
                                    className="font-semibold text-sm sm:text-base text-foreground transition-colors hover:text-primary"
                                  >
                                    {client.firstName} {client.lastName}
                                  </Link>
                                  {hasUnreadMessages(client.id) && (
                                    <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500"></span>
                                  )}
                                </div>
                                {latestMessage ? (
                                  <p className="line-clamp-1 text-xs sm:text-sm text-muted-foreground">
                                    {latestMessage.content}
                                  </p>
                                ) : (
                                  <p className="text-xs sm:text-sm text-muted-foreground">Sin mensajes</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 lg:justify-end">
                              {latestMessage && (
                                <div className="text-xs text-muted-foreground">
                                  Ultimo mensaje: {format(new Date(latestMessage.timestamp), 'dd MMM HH:mm', {
                                    locale: es,
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Selecciona un cliente para consultar o agregar notas internas.
                </p>
                <Select
                  value={selectedClientId}
                  onValueChange={(value) => setSelectedClientId(value)}
                  disabled={clients.length === 0}
                >
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedClient ? (
                <p className="text-sm text-muted-foreground">
                  No hay clientes disponibles para gestionar notas.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Textarea
                      placeholder={`Agregar una nota interna para ${selectedClient.firstName} ${selectedClient.lastName}...`}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                      Agregar nota
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Historial de notas</h4>
                    {selectedClientNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aún no hay notas registradas para este cliente.
                      </p>
                    ) : (
                      <div
                        className="space-y-4 max-h-[400px] overflow-y-auto pr-2"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#9ca3af transparent' }}
                      >
                        {selectedClientNotes.map((note, index) => {
                          const originalIndex = Array.isArray(selectedClient.notes)
                            ? selectedClient.notes.findIndex(
                              (item) => item.date === note.date && item.text === note.text
                            )
                            : -1;
                          const isEditing =
                            editingNote !== null &&
                            originalIndex !== -1 &&
                            editingNote.clientId === selectedClient.id &&
                            editingNote.index === originalIndex;

                          return (
                            <div
                              key={`${note.date}-${index}`}
                              className="space-y-3 rounded-lg border border-border bg-muted p-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-primary">
                                  {format(new Date(note.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </span>
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={saveEditingNote}
                                      disabled={!editingNoteText.trim()}
                                    >
                                      Guardar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEditingNote}>
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      originalIndex !== -1 &&
                                      startEditingNote(selectedClient.id, originalIndex, note.text)
                                    }
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
                                <p className="whitespace-pre-wrap text-sm">{note.text}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
