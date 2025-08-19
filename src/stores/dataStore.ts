import { create } from 'zustand';
import { Client, Message, Document, Activity, Notification } from '@/types';
import {
  mockClients,
  mockMessages,
  mockDocuments,
  mockActivities,
  mockNotifications,
} from '@/data/mockData';

interface DataStore {
  clients: Client[];
  messages: Message[];
  documents: Document[];
  activities: Activity[];
  notifications: Notification[];

  // Client actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Message actions
  addMessage: (message: Omit<Message, 'id'>) => void;
  updateMessageStatus: (id: string, status: Message['status']) => void;
  markMessageAsRead: (id: string) => void;
  markClientMessagesAsRead: (clientId: string) => void;

  // Document actions
  addDocument: (document: Omit<Document, 'id'>) => void;
  deleteDocument: (id: string) => void;

  // Activity actions
  addActivity: (activity: Omit<Activity, 'id'>) => void;

  // Notification actions
  markNotificationAsRead: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  clients: mockClients,
  messages: mockMessages,
  documents: mockDocuments,
  activities: mockActivities,
  notifications: mockNotifications,

  addClient: (clientData) => {
    const newClient: Client = {
      ...clientData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      lastContact: new Date(),
    };
    set((state) => ({ clients: [...state.clients, newClient] }));

    // Add activity
    get().addActivity({
      clientId: newClient.id,
      type: 'nota',
      title: 'Cliente creado',
      description: `Nuevo cliente: ${newClient.firstName} ${newClient.lastName}`,
      timestamp: new Date(),
    });
  },

  updateClient: (id, updates) => {
    set((state) => ({
      clients: state.clients.map((client) =>
        client.id === id ? { ...client, ...updates } : client
      ),
    }));
  },

  deleteClient: (id) => {
    set((state) => ({
      clients: state.clients.filter((client) => client.id !== id),
      messages: state.messages.filter((msg) => msg.clientId !== id),
      documents: state.documents.filter((doc) => doc.clientId !== id),
      activities: state.activities.filter((activity) => activity.clientId !== id),
    }));
  },

  addMessage: (messageData) => {
    const newMessage: Message = {
      ...messageData,
      id: Math.random().toString(36).substr(2, 9),
      read: messageData.isFromAdvisor ? true : false, 
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));

    // Add activity
    get().addActivity({
      clientId: newMessage.clientId,
      type: 'mensaje',
      title: newMessage.isFromAdvisor ? 'Mensaje enviado' : 'Mensaje recibido',
      description: newMessage.content.substring(0, 50) + '...',
      timestamp: newMessage.timestamp,
    });

    // Add notification if from client
    if (!newMessage.isFromAdvisor) {
      const client = get().clients.find((c) => c.id === newMessage.clientId);
      if (client) {
        get().addNotification({
          title: `Nuevo mensaje de ${client.firstName} ${client.lastName}`,
          message: newMessage.content.substring(0, 100),
          timestamp: newMessage.timestamp,
          read: false,
          type: 'mensaje',
          clientId: client.id,
        });
      }
    }
  },

  updateMessageStatus: (id, status) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, status } : msg
      ),
    }));
  },

  markMessageAsRead: (id) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, read: true } : msg
      ),
    }));
  },

  markClientMessagesAsRead: (clientId) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.clientId === clientId && !msg.isFromAdvisor
          ? { ...msg, read: true }
          : msg
      ),
    }));
  },

  addDocument: (documentData) => {
    const newDocument: Document = {
      ...documentData,
      id: Math.random().toString(36).substr(2, 9),
    };
    set((state) => ({ documents: [...state.documents, newDocument] }));

    // Add activity
    get().addActivity({
      clientId: newDocument.clientId,
      type: 'documento',
      title: 'Documento subido',
      description: newDocument.name,
      timestamp: newDocument.uploadDate,
    });

    // Add notification
    const client = get().clients.find((c) => c.id === newDocument.clientId);
    if (client) {
      get().addNotification({
        title: `Documento enviado a ${client.firstName} ${client.lastName}`,
        message: `${newDocument.name} - ${newDocument.description}`,
        timestamp: newDocument.uploadDate,
        read: false,
        type: 'informe',
        clientId: client.id,
      });
    }
  },

  deleteDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
    }));
  },

  addActivity: (activityData) => {
    const newActivity: Activity = {
      ...activityData,
      id: Math.random().toString(36).substr(2, 9),
    };
    set((state) => ({ activities: [...state.activities, newActivity] }));
  },

  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      ),
    }));
  },

  addNotification: (notificationData) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Math.random().toString(36).substr(2, 9),
    };
    set((state) => ({ notifications: [...state.notifications, newNotification] }));
  },
}));