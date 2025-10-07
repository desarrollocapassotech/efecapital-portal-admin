import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, MessageCircle, Mail, TrendingUp, Target, Building } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    clients,
    updateClient,
  } = useDataStore();

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

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to={`/messages/${id}`} className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat con cliente
            </Link>
          </Button>
          <Button variant="default" size="sm" className="p-2" asChild>
            <Link to={`/clients/${id}/edit`}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Link>
          </Button>
        </div>
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
                __html:
                  user?.objetivos ||
                  'Comparte tus objetivos financieros con tu asesora para recibir recomendaciones personalizadas.',
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

        <Card>
          <CardHeader>
            <CardTitle>Notas del Cliente</CardTitle>
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
      </div>
    </div>
  );
};

export default ClientDetail;