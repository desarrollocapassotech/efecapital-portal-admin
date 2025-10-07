import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MessageCircle, FileText } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Clients = () => {
  const navigate = useNavigate();
  const { clients, deleteClient, messages, documents } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredClients = clients.filter(client =>
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.investorProfile.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient(clientId);
    } catch (error) {
      console.error('Error al eliminar cliente', error);
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'Conservador': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Moderado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Agresivo': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getClientStats = (clientId: string) => {
    const clientMessages = messages.filter(m => m.clientId === clientId);
    const clientDocuments = documents.filter(
      (document) => document.visibility === 'all' || document.clientIds.includes(clientId)
    );
    const pendingMessages = clientMessages.filter(m => m.status === 'pendiente' && !m.isFromAdvisor);
    
    return {
      totalMessages: clientMessages.length,
      pendingMessages: pendingMessages.length,
      totalDocuments: clientDocuments.length
    };
  };

  return (
    <div className="flex-1 p-6 space-y-6 pt-16 lg:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Clientes</h1>
          <p className="text-muted-foreground">
            Administra la información de tus clientes
          </p>
        </div>
        <Button asChild>
          <Link to="/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes por nombre, email o perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List (Responsive: Cards on mobile, Table on desktop) */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </div>
          ) : isMobile ? (
            // Vista en tarjetas para móviles
            <div className="space-y-4">
              {filteredClients.map((client) => {
                const stats = getClientStats(client.id);
                return (
                  <Card key={client.id} className="overflow-hidden shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {client.firstName[0]}{client.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {client.firstName} {client.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">ID: {client.id}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className={getProfileColor(client.investorProfile)}>
                          {client.investorProfile}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div><strong>Email:</strong> {client.email}</div>
                      <div><strong>Teléfono:</strong> {client.phone}</div>
                      <div><strong>Broker:</strong> {client.broker}</div>

                      {/* Estadísticas */}
                      <div className="flex gap-2 mt-2 text-xs">
                        {stats.pendingMessages > 0 && (
                          <Badge variant="destructive">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {stats.pendingMessages} pendiente(s)
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          <FileText className="h-3 w-3 mr-1" />
                          {stats.totalDocuments} doc(s)
                        </Badge>
                      </div>

                      {/* Acciones */}
                      <div className="flex justify-end space-x-2 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán todos los datos 
                                del cliente incluyendo mensajes, documentos y actividades.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteClient(client.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Vista en tabla para desktop
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead className="text-center">Mensajes</TableHead>
                    <TableHead className="text-center">Documentos</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const stats = getClientStats(client.id);
                    
                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-foreground">
                                {client.firstName[0]}{client.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {client.firstName} {client.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {client.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{client.email}</div>
                            <div className="text-sm text-muted-foreground">{client.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getProfileColor(client.investorProfile)}
                          >
                            {client.investorProfile}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {client.broker}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {stats.pendingMessages > 0 ? (
                              <Badge variant="destructive" className="gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {stats.pendingMessages} pendiente(s)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <MessageCircle className="h-3 w-3" />
                                Sin pendientes
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Badge variant="secondary" className="gap-1">
                              <FileText className="h-3 w-3" />
                              {stats.totalDocuments} doc(s)
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}`)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminarán todos los datos 
                                    del cliente incluyendo mensajes, documentos y actividades.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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