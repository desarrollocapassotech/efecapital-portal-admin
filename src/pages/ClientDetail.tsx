import { useState } from 'react';
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
  Send
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { 
    clients, 
    messages, 
    documents, 
    activities, 
    addMessage, 
    updateMessageStatus,
    updateClient 
  } = useDataStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [newNote, setNewNote] = useState('');

  const client = clients.find(c => c.id === id);
  
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

  const clientMessages = messages.filter(m => m.clientId === id).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const clientDocuments = documents.filter(d => d.clientId === id).sort((a, b) => 
    new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );
  
  const clientActivities = activities.filter(a => a.clientId === id).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      addMessage({
        clientId: id!,
        content: newMessage,
        timestamp: new Date(),
        isFromAdvisor: true,
        status: 'respondido'
      });
      setNewMessage('');
    }
  };

  const handleUpdateNotes = () => {
    if (newNote.trim()) {
      updateClient(id!, { notes: client.notes + '\n\n' + new Date().toLocaleDateString() + ': ' + newNote });
      setNewNote('');
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'conservador': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'agresivo': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-warning text-warning-foreground';
      case 'respondido': return 'bg-success text-success-foreground';
      case 'en_revision': return 'bg-primary text-primary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
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
            <p className="text-muted-foreground">Perfil completo del cliente</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/clients/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Client Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-primary-foreground">
                  {client.firstName[0]}{client.lastName[0]}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{client.firstName} {client.lastName}</h3>
                <Badge className={getProfileColor(client.investorProfile)}>
                  Perfil {client.investorProfile}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{client.broker}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Último contacto: {format(client.lastContact, 'dd/MM/yyyy', { locale: es })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Perfil de Inversión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Objetivos</h4>
              <p className="text-sm">{client.objectives}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Horizonte de Inversión</h4>
              <p className="text-sm">{client.investmentHorizon}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Fecha de Registro</h4>
              <p className="text-sm">{format(client.createdAt, 'dd/MM/yyyy', { locale: es })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mensajes Totales</span>
              <span className="font-medium">{clientMessages.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mensajes Pendientes</span>
              <span className="font-medium text-warning">
                {clientMessages.filter(m => m.status === 'pendiente' && !m.isFromAdvisor).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Documentos</span>
              <span className="font-medium">{clientDocuments.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Actividades</span>
              <span className="font-medium">{clientActivities.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Mensajes</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="notes">Notas Internas</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Centro de Comunicaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Send Message */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Escribir nuevo mensaje al cliente..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensaje
                </Button>
              </div>

              {/* Messages History */}
              <div className="space-y-3">
                <h4 className="font-medium">Historial de Conversación</h4>
                {clientMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No hay mensajes todavía
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
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
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(message.status)}>
                              {message.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(message.timestamp, 'dd/MM HH:mm', { locale: es })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        {!message.isFromAdvisor && message.status === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => updateMessageStatus(message.id, 'respondido')}
                          >
                            Marcar como Respondido
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                <p className="text-center text-muted-foreground py-8">
                  No hay documentos subidos
                </p>
              ) : (
                <div className="space-y-3">
                  {clientDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                <p className="text-center text-muted-foreground py-8">
                  No hay actividades registradas
                </p>
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