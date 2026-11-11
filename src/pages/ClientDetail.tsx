import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import {
  Edit,
  MessageCircle,
  Mail,
  TrendingUp,
  Target,
  Building,
  Phone,
  Clock,
  CalendarDays,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { CONDICIONES_IVA } from '@/lib/faktia';
import { CopyableText } from '@/components/CopyButton';
import { useDataStore } from '@/stores/dataStore';
import { useShowPreviewModules } from '@/stores/previewStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Fila de la ficha del cliente: rótulo con ícono a la izquierda, valor a la derecha. */
const InfoRow = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 px-5 py-3.5">
    <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
    <div className="min-w-0">{children}</div>
  </div>
);

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    clients,
    updateClient,
  } = useDataStore();

  const showPreviewModules = useShowPreviewModules();
  const [newNote, setNewNote] = useState('');
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-6">
        <PageHeader
          breadcrumbs={[{ label: 'Clientes', to: '/clients' }, { label: 'No encontrado' }]}
          title="Cliente no encontrado"
          description="Puede que haya sido eliminado o que el enlace no sea correcto."
        />
      </div>
    );
  }

  // Mapeamos el cliente al formato del dashboard
  const user = {
    id: client.id,
    nombre: `${client.firstName} ${client.lastName}`,
    tipoInversor: client.investorProfile,
    brokers: client.brokers,
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
    // El formulario guarda el perfil en minúsculas; comparar sin distinguir mayúsculas
    switch (tipo?.toLowerCase()) {
      case 'conservador':
        return 'bg-primary/10 text-primary';
      case 'moderado':
        return 'bg-gold/10 text-gold';
      case 'agresivo':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Clientes', to: '/clients' },
          { label: `${client.firstName} ${client.lastName}` },
        ]}
        title={`${client.firstName} ${client.lastName}`}
        description=""
        actions={
          <>
            {showPreviewModules && (
              <Button variant="secondary" size="sm" asChild>
                <Link to={`/messages/${id}`} className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat con cliente
                </Link>
              </Button>
            )}
            <Button variant="default" size="sm" asChild>
              <Link to={`/clients/${id}/edit`} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </>
        }
      />

      {/* Dos columnas en desktop: ficha a la izquierda, objetivos + notas a la derecha */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Ficha del cliente */}
        <Card className="lg:sticky lg:top-6">
          <CardContent className="divide-y divide-border p-0">
            <InfoRow icon={TrendingUp} label="Perfil">
              <Badge className={getTipoInversorColor(user.tipoInversor || '')}>{user.tipoInversor}</Badge>
            </InfoRow>

            <InfoRow icon={Building} label={user.brokers.length > 1 ? 'Brokers' : 'Broker'}>
              {user.brokers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.brokers.map((broker) => (
                    <span key={broker} className="border border-border bg-secondary px-2 py-0.5 text-sm font-medium">
                      {broker}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Sin asignar</span>
              )}
            </InfoRow>

            <InfoRow icon={Clock} label="Horizonte">
              <span className="text-sm">{client.investmentHorizon || '—'}</span>
            </InfoRow>

            <InfoRow icon={CalendarDays} label="Fecha de alta">
              <span className="text-sm tabular-nums">
                {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: es }) : '—'}
              </span>
            </InfoRow>

            <InfoRow icon={FileText} label="Fiscal">
              {client.fiscal ? (
                <div className="text-sm leading-snug">
                  <p className="tabular-nums">
                    {client.fiscal.tipoDocumento} {client.fiscal.numeroDocumento}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CONDICIONES_IVA.find((c) => c.value === client.fiscal!.condicionIva)?.label}
                  </p>
                </div>
              ) : (
                <Link to={`/clients/${id}/edit`} className="text-sm text-primary underline-offset-4 hover:underline">
                  Completar datos fiscales
                </Link>
              )}
            </InfoRow>

            <InfoRow icon={Phone} label="Teléfono">
              {user.telefono ? (
                <CopyableText value={user.telefono} label="Teléfono" className="text-sm" />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </InfoRow>

            <InfoRow icon={Mail} label="Email">
              {user.email ? (
                <CopyableText value={user.email} label="Email" className="max-w-full text-sm" />
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </InfoRow>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
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
                __html: user?.objetivos || '<p>Sin objetivos registrados.</p>',
              }}
            />
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
    </div>
  );
};

export default ClientDetail;