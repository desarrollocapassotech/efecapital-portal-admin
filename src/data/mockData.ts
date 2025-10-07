import { Client, Message, Document, Activity, Notification } from '@/types';

export const mockClients: Client[] = [
  {
    id: '1',
    firstName: 'María',
    lastName: 'González',
    email: 'maria.gonzalez@email.com',
    phone: '+54 11 4567-8901',
    investorProfile: 'Conservador',
    objectives: 'Preservación de capital y crecimiento a largo plazo',
    investmentHorizon: '10-15 años',
    broker: 'Banco Galicia',
    notes: [
      {
        text: 'Cliente muy meticulosa, prefiere inversiones de bajo riesgo. Tiene experiencia previa con fondos comunes.',
        date: new Date('2023-06-15').toISOString() // misma fecha que createdAt
      }
    ],
    lastContact: new Date('2024-01-15'),
    createdAt: new Date('2023-06-15')
  },
  {
    id: '2',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    email: 'carlos.rodriguez@email.com',
    phone: '+54 11 5678-9012',
    investorProfile: 'Agresivo',
    objectives: 'Máximo crecimiento del capital',
    investmentHorizon: '5-7 años',
    broker: 'Invertir Online',
    notes: [
      {
        text: 'Cliente muy meticulosa, prefiere inversiones de bajo riesgo. Tiene experiencia previa con fondos comunes.',
        date: new Date('2023-06-15').toISOString() // misma fecha que createdAt
      }
    ],
    lastContact: new Date('2024-01-18'),
    createdAt: new Date('2023-08-10')
  },
  {
    id: '3',
    firstName: 'Ana',
    lastName: 'Martínez',
    email: 'ana.martinez@email.com',
    phone: '+54 11 6789-0123',
    investorProfile: 'Moderado',
    objectives: 'Diversificación y crecimiento balanceado',
    investmentHorizon: '7-10 años',
    broker: 'BYMA',
    notes: [
      {
        text: 'Cliente muy meticulosa, prefiere inversiones de bajo riesgo. Tiene experiencia previa con fondos comunes.',
        date: new Date('2023-06-15').toISOString() // misma fecha que createdAt
      }
    ],
    lastContact: new Date('2024-01-10'),
    createdAt: new Date('2023-04-20')
  },
  {
    id: '4',
    firstName: 'Roberto',
    lastName: 'Silva',
    email: 'roberto.silva@email.com',
    phone: '+54 11 7890-1234',
    investorProfile: 'Conservador',
    objectives: 'Ingresos regulares y seguridad',
    investmentHorizon: '3-5 años',
    broker: 'Banco Santander',
    notes: [
      {
        text: 'Cliente muy meticulosa, prefiere inversiones de bajo riesgo. Tiene experiencia previa con fondos comunes.',
        date: new Date('2023-06-15').toISOString() // misma fecha que createdAt
      }
    ],
    lastContact: new Date('2024-01-05'),
    createdAt: new Date('2023-09-05')
  },
  {
    id: '5',
    firstName: 'Laura',
    lastName: 'Fernández',
    email: 'laura.fernandez@email.com',
    phone: '+54 11 8901-2345',
    investorProfile: 'Moderado',
    objectives: 'Crecimiento para compra de vivienda',
    investmentHorizon: '2-3 años',
    broker: 'Portfolio Personal',
    notes: [
      {
        text: 'Cliente muy meticulosa, prefiere inversiones de bajo riesgo. Tiene experiencia previa con fondos comunes.',
        date: new Date('2023-06-15').toISOString() // misma fecha que createdAt
      }
    ],
    lastContact: new Date('2024-01-12'),
    createdAt: new Date('2023-11-30')
  }
];

export const mockMessages: Message[] = [
  {
    id: '1',
    clientId: '1',
    content: '¡Hola! Quería consultarte sobre la evolución de mi cartera este mes. ¿Podrías enviarme un reporte?',
    timestamp: new Date('2024-01-18T10:30:00'),
    isFromAdvisor: false,
    status: 'pendiente',
    read: false
  },
  {
    id: '2',
    clientId: '1',
    content: 'Por supuesto, María. Te preparo el reporte de performance de enero y te lo envío esta tarde. ¿Hay algún aspecto específico que te interese revisar?',
    timestamp: new Date('2024-01-18T11:45:00'),
    isFromAdvisor: true,
    status: 'respondido'
  },
  {
    id: '3',
    clientId: '2',
    content: 'He estado leyendo sobre criptomonedas y me interesa incorporar algo a mi portfolio. ¿Qué opinas?',
    timestamp: new Date('2024-01-17T14:20:00'),
    isFromAdvisor: false,
    status: 'en_revision'
  },
  {
    id: '4',
    clientId: '3',
    content: 'Vi que el mercado tuvo volatilidad esta semana. ¿Deberíamos ajustar algo en mi estrategia?',
    timestamp: new Date('2024-01-16T09:15:00'),
    isFromAdvisor: false,
    status: 'pendiente'
  },
  {
    id: '5',
    clientId: '4',
    content: 'Quería informarte que recibí un bono y me gustaría invertir una parte. ¿Cuándo podemos hablar?',
    timestamp: new Date('2024-01-15T16:30:00'),
    isFromAdvisor: false,
    status: 'respondido'
  }
];

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Reporte_Performance_Enero_2024.pdf',
    type: 'rendimiento',
    description: 'Análisis detallado de performance de cartera enero 2024',
    uploadDate: new Date('2024-01-18T15:30:00'),
    size: 2048576,
    visibility: 'selected',
    clientIds: ['1']
  },
  {
    id: '2',
    name: 'Recomendaciones_Portfolio_Agresivo.pdf',
    type: 'recomendaciones',
    description: 'Sugerencias de ajuste para perfil agresivo',
    uploadDate: new Date('2024-01-17T11:00:00'),
    size: 1536000,
    visibility: 'selected',
    clientIds: ['2']
  },
  {
    id: '3',
    name: 'Informe_Mercado_Semanal.pdf',
    type: 'informe_mercado',
    description: 'Análisis semanal de condiciones del mercado',
    uploadDate: new Date('2024-01-16T09:45:00'),
    size: 3072000,
    visibility: 'all',
    clientIds: []
  },
  {
    id: '4',
    name: 'Estrategia_Conservadora_2024.pdf',
    type: 'recomendaciones',
    description: 'Plan de inversión conservador para 2024',
    uploadDate: new Date('2024-01-15T14:20:00'),
    size: 2560000,
    visibility: 'selected',
    clientIds: ['4']
  }
];

export const mockActivities: Activity[] = [
  {
    id: '1',
    clientId: '1',
    type: 'mensaje',
    title: 'Nuevo mensaje recibido',
    description: 'Consulta sobre evolución de cartera',
    timestamp: new Date('2024-01-18T10:30:00')
  },
  {
    id: '2',
    clientId: '1',
    type: 'documento',
    title: 'Documento enviado',
    description: 'Reporte de Performance Enero 2024',
    timestamp: new Date('2024-01-18T15:30:00')
  },
  {
    id: '3',
    clientId: '2',
    type: 'mensaje',
    title: 'Consulta sobre criptomonedas',
    description: 'Cliente interesado en diversificar con crypto',
    timestamp: new Date('2024-01-17T14:20:00')
  },
  {
    id: '4',
    clientId: '3',
    type: 'nota',
    title: 'Nota actualizada',
    description: 'Interés en ETFs internacionales',
    timestamp: new Date('2024-01-16T12:00:00')
  },
  {
    id: '5',
    clientId: '4',
    type: 'mensaje',
    title: 'Nuevo capital disponible',
    description: 'Cliente recibió bono, desea invertir',
    timestamp: new Date('2024-01-15T16:30:00')
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nuevo mensaje de María González',
    message: 'Consulta sobre evolución de cartera',
    timestamp: new Date('2024-01-18T10:30:00'),
    read: false,
    type: 'mensaje',
    clientId: '1'
  },
  {
    id: '2',
    title: 'Carlos Rodríguez: Nuevo capital',
    message: 'Cliente reporta ingreso de capital adicional',
    timestamp: new Date('2024-01-17T14:20:00'),
    read: false,
    type: 'capital',
    clientId: '2'
  },
  {
    id: '3',
    title: 'Documento enviado a Ana Martínez',
    message: 'Informe de mercado semanal entregado',
    timestamp: new Date('2024-01-16T09:45:00'),
    read: true,
    type: 'informe',
    clientId: '3'
  }
];
// src/data/mockData.ts

// ... (tus arrays mockClients, mockMessages, etc.)

/**
 * Devuelve los datos simulados para un usuario específico
 */
export const getMockDataForUser = (userId: string) => {
  // Buscar cliente por ID
  const client = mockClients.find(c => c.id === userId);

  // Filtrar datos relacionados con el cliente
  const mensajes = mockMessages.filter(m => m.clientId === userId);
  const archivos = mockDocuments.filter(
    d => d.visibility === 'all' || d.clientIds.includes(userId)
  );
  const historial = mockActivities.filter(a => a.clientId === userId);

  // Aquí puedes simular más datos si no los tienes en otro lado
  return {
    // Datos del cliente
    nombre: client ? `${client.firstName} ${client.lastName}` : 'Cliente Desconocido',
    tipoInversor: client?.investorProfile,
    broker: client?.broker,
    objetivos: client?.objectives,
    telefono: client?.phone,
    email: client?.email,

    // Datos relacionados
    mensajes,
    archivos,
    historial,
    notificaciones: mockNotifications.filter(n => n.clientId === userId),
  };
};