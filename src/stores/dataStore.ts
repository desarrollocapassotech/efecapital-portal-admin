import { create } from 'zustand';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  Activity,
  Broker,
  Client,
  Document,
  Message,
  Note,
  Notification,
} from '@/types';

const toDate = (value: unknown): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
};

const normalizeNotes = (value: unknown): Note[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((note) => note && typeof note === 'object')
    .map((note) => {
      const noteRecord = note as Partial<Note> & { date?: any };
      const text = typeof noteRecord.text === 'string' ? noteRecord.text : '';
      const dateValue = noteRecord.date instanceof Timestamp
        ? noteRecord.date.toDate().toISOString()
        : typeof noteRecord.date === 'string'
          ? noteRecord.date
          : new Date().toISOString();

      return {
        text,
        date: dateValue,
      };
    });
};

interface AddDocumentInput {
  name: string;
  description: string;
  type: Document['type'];
  visibility: Document['visibility'];
  clientIds: string[];
  file: File;
}

interface DataStore {
  clients: Client[];
  brokers: Broker[];
  messages: Message[];
  documents: Document[];
  activities: Activity[];
  notifications: Notification[];

  startDataListeners: () => void;
  stopDataListeners: () => void;
  ensureBrokerExists: (name: string) => Promise<void>;

  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addMessage: (message: Omit<Message, 'id'>) => Promise<void>;
  updateMessageStatus: (id: string, status: Message['status']) => Promise<void>;
  markMessageAsRead: (id: string) => Promise<void>;
  markClientMessagesAsRead: (clientId: string) => Promise<void>;

  addDocument: (document: AddDocumentInput) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  addActivity: (activity: Omit<Activity, 'id'>) => void;

  markNotificationAsRead: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

export const useDataStore = create<DataStore>((set, get) => {
  let clientsUnsubscribe: Unsubscribe | null = null;
  let messagesUnsubscribe: Unsubscribe | null = null;
  let brokersUnsubscribe: Unsubscribe | null = null;
  let documentsUnsubscribe: Unsubscribe | null = null;

  return {
    clients: [],
    brokers: [],
    messages: [],
    documents: [],
    activities: [],
    notifications: [],

    startDataListeners: () => {
      if (!clientsUnsubscribe) {
        const clientsQuery = query(
          collection(db, 'clients'),
          orderBy('createdAt', 'desc')
        );

        clientsUnsubscribe = onSnapshot(clientsQuery, (snapshot) => {
          const clients = snapshot.docs.map((docSnapshot) => {
            const data = docSnapshot.data();
            const createdAt = toDate(data.createdAt);
            const lastContact = data.lastContact
              ? toDate(data.lastContact)
              : createdAt;

            return {
              id: docSnapshot.id,
              firstName: data.firstName ?? '',
              lastName: data.lastName ?? '',
              email: data.email ?? '',
              phone: data.phone ?? '',
              investorProfile: data.investorProfile ?? 'Moderado',
              objectives: data.objectives ?? '',
              investmentHorizon: data.investmentHorizon ?? '',
              broker: data.broker ?? '',
              notes: normalizeNotes(data.notes),
              lastContact,
              createdAt,
            } satisfies Client;
          });

          set({ clients });
        });
      }

      if (!messagesUnsubscribe) {
        const messagesQuery = query(
          collection(db, 'messages'),
          orderBy('timestamp', 'desc')
        );

        messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const messages = snapshot.docs
            .map((docSnapshot) => {
              const data = docSnapshot.data();
              const visto =
                typeof data.visto === 'boolean'
                  ? data.visto
                  : typeof data.read === 'boolean'
                    ? data.read
                    : Boolean(data.isFromAdvisor);

              return {
                id: docSnapshot.id,
                clientId: data.clientId ?? '',
                content: data.content ?? '',
                timestamp: toDate(data.timestamp),
                isFromAdvisor: Boolean(data.isFromAdvisor),
                status: (data.status ?? 'pendiente') as Message['status'],
                visto,
                read: visto,
              } satisfies Message;
            })
            .sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
            );

          set({ messages });
        });
      }

      if (!brokersUnsubscribe) {
        const brokersQuery = query(
          collection(db, 'brokers'),
          orderBy('name', 'asc')
        );

        brokersUnsubscribe = onSnapshot(brokersQuery, (snapshot) => {
          const brokers = snapshot.docs.map((docSnapshot) => {
            const data = docSnapshot.data();
            return {
              id: docSnapshot.id,
              name: data.name ?? '',
              email: data.email ?? undefined,
              phone: data.phone ?? undefined,
              notes: data.notes ?? undefined,
            } satisfies Broker;
          });

          set({ brokers });
        });
      }

      if (!documentsUnsubscribe) {
        const documentsQuery = query(
          collection(db, 'documents'),
          orderBy('uploadDate', 'desc')
        );

        documentsUnsubscribe = onSnapshot(documentsQuery, (snapshot) => {
          const documents = snapshot.docs.map((docSnapshot) => {
            const data = docSnapshot.data();
            const rawClientIds = Array.isArray(data.clientIds)
              ? (data.clientIds as unknown[]).filter(
                  (clientId): clientId is string => typeof clientId === 'string'
                )
              : [];
            const normalizedClientIds = Array.from(new Set(rawClientIds));

            return {
              id: docSnapshot.id,
              name: data.name ?? '',
              description: data.description ?? '',
              type: (data.type ?? 'informe_mercado') as Document['type'],
              uploadDate: toDate(data.uploadDate),
              size: typeof data.size === 'number' ? data.size : 0,
              fileUrl: data.fileUrl ?? '',
              storagePath: data.storagePath ?? '',
              visibility: (data.visibility ?? 'all') as Document['visibility'],
              clientIds: normalizedClientIds,
            } satisfies Document;
          });

          set({ documents });
        });
      }
    },

    stopDataListeners: () => {
      if (clientsUnsubscribe) {
        clientsUnsubscribe();
        clientsUnsubscribe = null;
      }
      if (messagesUnsubscribe) {
        messagesUnsubscribe();
        messagesUnsubscribe = null;
      }
      if (brokersUnsubscribe) {
        brokersUnsubscribe();
        brokersUnsubscribe = null;
      }
      if (documentsUnsubscribe) {
        documentsUnsubscribe();
        documentsUnsubscribe = null;
      }

      set({
        clients: [],
        brokers: [],
        messages: [],
        documents: [],
        activities: [],
        notifications: [],
      });
    },

    ensureBrokerExists: async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      const existing = get().brokers.find(
        (broker) => broker.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existing) {
        return;
      }

      const brokersRef = collection(db, 'brokers');
      const snapshot = await getDocs(
        query(brokersRef, where('name', '==', trimmedName))
      );

      if (!snapshot.empty) {
        return;
      }

      await addDoc(brokersRef, {
        name: trimmedName,
      });
    },

    addClient: async (clientData) => {
      await get().ensureBrokerExists(clientData.broker);

      const notes = Array.isArray(clientData.notes) ? clientData.notes : [];

      const docRef = await addDoc(collection(db, 'clients'), {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        investorProfile: clientData.investorProfile,
        objectives: clientData.objectives,
        investmentHorizon: clientData.investmentHorizon,
        broker: clientData.broker,
        notes,
        lastContact: clientData.lastContact
          ? Timestamp.fromDate(new Date(clientData.lastContact))
          : serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      get().addActivity({
        clientId: docRef.id,
        type: 'nota',
        title: 'Cliente creado',
        description: `Nuevo cliente: ${clientData.firstName} ${clientData.lastName}`,
        timestamp: new Date(),
      });
    },

    updateClient: async (id, updates) => {
      if (updates.broker) {
        await get().ensureBrokerExists(updates.broker);
      }

      const clientRef = doc(db, 'clients', id);
      const payload: Record<string, unknown> = {};

      if (typeof updates.firstName === 'string') payload.firstName = updates.firstName;
      if (typeof updates.lastName === 'string') payload.lastName = updates.lastName;
      if (typeof updates.email === 'string') payload.email = updates.email;
      if (typeof updates.phone === 'string') payload.phone = updates.phone;
      if (typeof updates.investorProfile === 'string') payload.investorProfile = updates.investorProfile;
      if (typeof updates.objectives === 'string') payload.objectives = updates.objectives;
      if (typeof updates.investmentHorizon === 'string') payload.investmentHorizon = updates.investmentHorizon;
      if (typeof updates.broker === 'string') payload.broker = updates.broker;
      if (Array.isArray(updates.notes)) payload.notes = updates.notes;
      if (updates.lastContact) {
        payload.lastContact = Timestamp.fromDate(new Date(updates.lastContact));
      }

      if (Object.keys(payload).length === 0) {
        return;
      }

      await updateDoc(clientRef, payload);
    },

    deleteClient: async (id) => {
      await deleteDoc(doc(db, 'clients', id));

      const messagesQuery = query(
        collection(db, 'messages'),
        where('clientId', '==', id)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      if (!messagesSnapshot.empty) {
        const batch = writeBatch(db);
        messagesSnapshot.forEach((messageDoc) => batch.delete(messageDoc.ref));
        await batch.commit();
      }

      set((state) => ({
        activities: state.activities.filter((activity) => activity.clientId !== id),
        documents: state.documents
          .map((document) => {
            if (!document.clientIds.includes(id)) {
              return document;
            }

            const updatedClientIds = document.clientIds.filter((clientId) => clientId !== id);
            return { ...document, clientIds: updatedClientIds };
          })
          .filter((document) => document.visibility === 'all' || document.clientIds.length > 0),
        notifications: state.notifications.filter(
          (notification) => notification.clientId !== id
        ),
      }));
    },

    addMessage: async (messageData) => {
      const visto =
        typeof messageData.visto === 'boolean'
          ? messageData.visto
          : messageData.isFromAdvisor
            ? true
            : false;

      await addDoc(collection(db, 'messages'), {
        clientId: messageData.clientId,
        content: messageData.content,
        timestamp: messageData.timestamp
          ? Timestamp.fromDate(new Date(messageData.timestamp))
          : serverTimestamp(),
        isFromAdvisor: messageData.isFromAdvisor,
        status: messageData.status ?? 'pendiente',
        visto,
        read: visto,
      });

      const clientRef = doc(db, 'clients', messageData.clientId);
      await updateDoc(clientRef, { lastContact: serverTimestamp() });

      get().addActivity({
        clientId: messageData.clientId,
        type: 'mensaje',
        title: messageData.isFromAdvisor ? 'Mensaje enviado' : 'Mensaje recibido',
        description: messageData.content.substring(0, 50) + '...',
        timestamp: messageData.timestamp ?? new Date(),
      });

      if (!messageData.isFromAdvisor) {
        const client = get().clients.find((c) => c.id === messageData.clientId);
        if (client) {
          get().addNotification({
            title: `Nuevo mensaje de ${client.firstName} ${client.lastName}`,
            message: messageData.content.substring(0, 100),
            timestamp: messageData.timestamp ?? new Date(),
            read: false,
            type: 'mensaje',
            clientId: client.id,
          });
        }
      }
    },

    updateMessageStatus: async (id, status) => {
      await updateDoc(doc(db, 'messages', id), { status });
    },

    markMessageAsRead: async (id) => {
      await updateDoc(doc(db, 'messages', id), { visto: true, read: true });
    },

    markClientMessagesAsRead: async (clientId) => {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('clientId', '==', clientId),
        where('isFromAdvisor', '==', false)
      );

      const snapshot = await getDocs(messagesQuery);
      if (snapshot.empty) {
        return;
      }

      const unseenMessages = snapshot.docs.filter((messageDoc) => {
        const data = messageDoc.data();
        const visto =
          typeof data.visto === 'boolean'
            ? data.visto
            : typeof data.read === 'boolean'
              ? data.read
              : false;

        return !visto;
      });

      if (unseenMessages.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      unseenMessages.forEach((messageDoc) => {
        batch.update(messageDoc.ref, { visto: true, read: true });
      });
      await batch.commit();
    },

    addDocument: async (documentData) => {
      const allClientIds = get()
        .clients
        .map((client) => client.id);

      const normalizedClientIds = Array.from(
        new Set(
          documentData.visibility === 'selected'
            ? documentData.clientIds
            : allClientIds
        )
      );

      const uploadDate = new Date();
      const storagePath = `reports/${Date.now()}-${documentData.file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, documentData.file);
      const fileUrl = await getDownloadURL(storageRef);

      try {
        const docRef = await addDoc(collection(db, 'documents'), {
          name: documentData.name.trim(),
          description: documentData.description.trim(),
          type: documentData.type,
          size: documentData.file.size,
          visibility: documentData.visibility,
          clientIds: normalizedClientIds,
          fileUrl,
          storagePath,
          uploadDate: serverTimestamp(),
        });

        const newDocument: Document = {
          id: docRef.id,
          name: documentData.name.trim(),
          description: documentData.description.trim(),
          type: documentData.type,
          uploadDate,
          size: documentData.file.size,
          fileUrl,
          storagePath,
          visibility: documentData.visibility,
          clientIds: normalizedClientIds,
        };

        set((state) => ({
          documents: [
            ...state.documents.filter((doc) => doc.id !== newDocument.id),
            newDocument,
          ],
        }));

        const targetClients =
          newDocument.clientIds.length > 0
            ? get().clients.filter((client) =>
                newDocument.clientIds.includes(client.id)
              )
            : get().clients;

        targetClients.forEach((client) => {
          get().addActivity({
            clientId: client.id,
            type: 'documento',
            title: 'Documento subido',
            description: newDocument.name,
            timestamp: uploadDate,
          });

          get().addNotification({
            title: `Nuevo informe: ${newDocument.name}`,
            message: newDocument.description,
            timestamp: uploadDate,
            read: false,
            type: 'informe',
            clientId: client.id,
          });
        });
      } catch (error) {
        await deleteObject(storageRef).catch(() => undefined);
        throw error;
      }
    },

    deleteDocument: async (id) => {
      const existingDocument = get().documents.find((doc) => doc.id === id);

      await deleteDoc(doc(db, 'documents', id));

      if (existingDocument?.storagePath) {
        await deleteObject(ref(storage, existingDocument.storagePath)).catch(
          () => undefined
        );
      }

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
      set((state) => ({
        notifications: [...state.notifications, newNotification],
      }));
    },
  };
});
