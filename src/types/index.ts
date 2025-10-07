export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  investorProfile: 'Conservador' | 'Moderado' | 'Agresivo';
  objectives: string;
  investmentHorizon: string;
  broker: string;
  notes?: Note[];
  lastContact: Date;
  createdAt: Date;
}

export interface Broker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface Note {
  text: string;
  date: string; 
}

export interface Message {
  id: string;
  clientId: string;
  content: string;
  timestamp: Date;
  isFromAdvisor: boolean;
  status: 'pendiente' | 'respondido' | 'en_revision';
  visto?: boolean;
  read?: boolean;
}

export interface Document {
  id: string;
  clientId: string;
  name: string;
  type: 'rendimiento' | 'recomendaciones' | 'informe_mercado';
  description: string;
  uploadDate: Date;
  size: number;
}

export interface Activity {
  id: string;
  clientId: string;
  type: 'mensaje' | 'documento' | 'nota' | 'actualizacion';
  title: string;
  description: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'mensaje' | 'capital' | 'informe';
  clientId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    uid: string;
    name: string;
    email: string;
    role: 'advisor';
  } | null;
}