import { Link } from 'react-router-dom';
import { Users, MessageCircle, FileText, ArrowRight, type LucideIcon } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';

type Tile = {
  to: string;
  label: string;
  icon: LucideIcon;
  value: number | string;
  caption: string;
  highlight?: boolean;
};

const Index = () => {
  const { clients, messages, documents } = useDataStore();

  // Calcular mensajes no leídos
  const unreadMessages = messages.filter((m) => !m.isFromAdvisor && !m.read).length;
  const displayUnreadCount = unreadMessages > 99 ? '99+' : unreadMessages;

  const tiles: Tile[] = [
    { to: '/clients', label: 'Clientes', icon: Users, value: clients.length, caption: 'Clientes registrados' },
    {
      to: '/messages',
      label: 'Mensajes',
      icon: MessageCircle,
      value: displayUnreadCount,
      caption: unreadMessages === 1 ? 'Mensaje sin leer' : 'Mensajes sin leer',
      highlight: unreadMessages > 0,
    },
    { to: '/reports', label: 'Informes', icon: FileText, value: documents.length, caption: 'Informes publicados' },
  ];

  return (
    <div className="flex-1 p-4 sm:p-8 pt-20 lg:pt-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
          {tiles.map(({ to, label, icon: Icon, value, caption, highlight }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col bg-card p-6 transition-colors hover:bg-secondary"
            >
              <span className="brand-bar absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <span className="eyebrow">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p
                className={`mt-6 font-display text-4xl font-semibold tabular-nums ${
                  highlight ? 'text-gold' : 'text-primary'
                }`}
              >
                {value}
              </p>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{caption}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
