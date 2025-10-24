import { Link } from 'react-router-dom';
import { Users, MessageCircle, FileText } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const { clients, messages, documents } = useDataStore();
  
  // Calcular mensajes no leídos
  const unreadMessages = messages.filter(m => !m.isFromAdvisor && !m.read).length;
  const displayUnreadCount = unreadMessages > 99 ? '99+' : unreadMessages;

  return (
    <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 pt-16 lg:pt-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-2 px-4 mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Panel de Administración</h1>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
          {/* Tarjeta de Clientes */}
          <Link to="/clients" className="group">
            <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/20 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Clientes</h3>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{clients.length}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Tarjeta de Chats */}
          <Link to="/messages" className="group">
            <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105">
              <CardContent className="p-6 text-center relative">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                    <MessageCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Mensajes</h3>
                {unreadMessages > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute top-4 right-4 h-6 min-w-[1.5rem] px-2 text-xs"
                  >
                    {displayUnreadCount}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Tarjeta de Informes */}
          <Link to="/reports" className="group">
            <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/20 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                    <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Informes</h3>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{documents.length}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
