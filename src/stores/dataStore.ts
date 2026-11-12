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
  Plan,
} from '@/types';
import { notificationService } from '@/lib/notifications';
import { conNuevoMonto, suscripcionDesdeDatos } from '@/lib/suscripciones';
import {
  DEFAULT_BROKERS,
  brokersFromClientData,
  canonicalBrokerName,
  formatBrokers,
  normalizeBrokerList,
  sameBroker,
} from '@/lib/brokers';

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

const collectionKeys = ['clients', 'messages', 'brokers', 'documents', 'planes'] as const;
type CollectionKey = (typeof collectionKeys)[number];

/** Firestore no acepta `undefined`: se quitan esas claves. */
const sinIndefinidos = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

export type BrokerInput = Omit<Broker, 'id'>;

interface DataStore {
  clients: Client[];
  brokers: Broker[];
  planes: Plan[];
  messages: Message[];
  documents: Document[];
  activities: Activity[];
  notifications: Notification[];
  isLoading: boolean;

  startDataListeners: () => void;
  stopDataListeners: () => void;
  ensureBrokerExists: (name: string) => Promise<void>;

  addBroker: (broker: BrokerInput) => Promise<void>;
  /** Si cambia el nombre, se actualiza también en los clientes que lo usan. */
  updateBroker: (id: string, broker: BrokerInput) => Promise<void>;
  /** Falla si algún cliente lo tiene asignado. */
  deleteBroker: (id: string) => Promise<void>;

  addPlan: (plan: Omit<Plan, 'id'>) => Promise<void>;
  renamePlan: (id: string, nombre: string) => Promise<void>;
  /** Falla si algún cliente lo tiene asignado. */
  deletePlan: (id: string) => Promise<void>;
  /** Cambia el precio del plan y, a los clientes indicados, les aplica el nuevo monto desde el mes en curso. */
  actualizarPrecioPlan: (planId: string, precio: number, clientIds: string[]) => Promise<void>;

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
  let planesUnsubscribe: Unsubscribe | null = null;
  const migratedClientIds = new Set<string>();
  let defaultBrokersEnsured = false;

  const collectionsLoaded: Record<CollectionKey, boolean> = {
    clients: false,
    messages: false,
    brokers: false,
    documents: false,
    planes: false,
  };

  const resetLoadingState = () => {
    for (const key of collectionKeys) {
      collectionsLoaded[key] = false;
    }
    set({ isLoading: true });
  };

  const markCollectionAsLoaded = (collection: CollectionKey) => {
    if (collectionsLoaded[collection]) {
      return;
    }

    collectionsLoaded[collection] = true;

    const allCollectionsLoaded = collectionKeys.every(
      (key) => collectionsLoaded[key]
    );

    if (allCollectionsLoaded) {
      set({ isLoading: false });
    }
  };

  return {
    clients: [],
    brokers: [],
    planes: [],
    messages: [],
    documents: [],
    activities: [],
    notifications: [],
    isLoading: false,

    startDataListeners: () => {
      const shouldResetLoading =
        !clientsUnsubscribe ||
        !messagesUnsubscribe ||
        !brokersUnsubscribe ||
        !documentsUnsubscribe ||
        !planesUnsubscribe;

      if (shouldResetLoading) {
        resetLoadingState();
      }

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
              brokers: brokersFromClientData(data),
              fiscal: data.fiscal && typeof data.fiscal === 'object' ? (data.fiscal as Client['fiscal']) : undefined,
              suscripcion: suscripcionDesdeDatos(data.suscripcion),
              notes: normalizeNotes(data.notes),
              lastContact,
              createdAt,
            } satisfies Client;
          });

          set({ clients });
          markCollectionAsLoaded('clients');

          // Migración única: clientes con `broker` como texto libre ("BMB y IOL") y sin `brokers`
          // se reescriben con la lista normalizada. Idempotente: solo toca docs sin `brokers`.
          snapshot.docs.forEach((docSnapshot) => {
            if (migratedClientIds.has(docSnapshot.id)) return;
            const data = docSnapshot.data();
            if (Array.isArray(data.brokers)) return;
            migratedClientIds.add(docSnapshot.id);
            const brokers = brokersFromClientData(data);
            updateDoc(docSnapshot.ref, { brokers, broker: formatBrokers(brokers) }).catch((error) => {
              migratedClientIds.delete(docSnapshot.id);
              console.error('No se pudo normalizar los brokers del cliente', docSnapshot.id, error);
            });
          });
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
              const read =
                typeof data.read === 'boolean'
                  ? data.read
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
                read: read,
              } satisfies Message;
            })
            .sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
            );

          set({ messages });
          markCollectionAsLoaded('messages');
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
              fiscal: data.fiscal && typeof data.fiscal === 'object' ? (data.fiscal as Broker['fiscal']) : undefined,
            } satisfies Broker;
          });

          set({ brokers });
          markCollectionAsLoaded('brokers');

          // Asegurar que existan los brokers base (BMB, IOL, Balanz)
          if (!defaultBrokersEnsured) {
            defaultBrokersEnsured = true;
            DEFAULT_BROKERS.forEach((name) => {
              get().ensureBrokerExists(name).catch((error) => {
                console.error('No se pudo crear el broker base', name, error);
              });
            });
          }
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
          markCollectionAsLoaded('documents');
        });
      }

      if (!planesUnsubscribe) {
        planesUnsubscribe = onSnapshot(
          query(collection(db, 'planes'), orderBy('precio', 'asc')),
          (snapshot) => {
            const planes = snapshot.docs.map((docSnapshot) => {
              const data = docSnapshot.data();
              return {
                id: docSnapshot.id,
                nombre: data.nombre ?? '',
                precio: typeof data.precio === 'number' ? data.precio : 0,
              } satisfies Plan;
            });
            set({ planes });
            markCollectionAsLoaded('planes');
          },
          (error) => {
            console.error('No se pudieron leer los planes', error);
            markCollectionAsLoaded('planes');
          }
        );
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
      if (planesUnsubscribe) {
        planesUnsubscribe();
        planesUnsubscribe = null;
      }

      set({
        clients: [],
        brokers: [],
        planes: [],
        messages: [],
        documents: [],
        activities: [],
        notifications: [],
        isLoading: false,
      });
    },

    ensureBrokerExists: async (name: string) => {
      const trimmedName = canonicalBrokerName(name, get().brokers.map((b) => b.name));
      if (!trimmedName) {
        return;
      }

      const existing = get().brokers.find((broker) => sameBroker(broker.name, trimmedName));

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

    addBroker: async (broker) => {
      const name = canonicalBrokerName(broker.name, get().brokers.map((b) => b.name));
      if (!name) throw new Error('El nombre es obligatorio');
      if (get().brokers.some((b) => sameBroker(b.name, name))) {
        throw new Error('Ya existe un broker con ese nombre');
      }
      await addDoc(collection(db, 'brokers'), sinIndefinidos({ ...broker, name }));
    },

    updateBroker: async (id, broker) => {
      const actual = get().brokers.find((b) => b.id === id);
      if (!actual) throw new Error('El broker ya no existe');
      const name = broker.name.trim().replace(/\s+/g, ' ');
      if (!name) throw new Error('El nombre es obligatorio');
      if (get().brokers.some((b) => b.id !== id && sameBroker(b.name, name))) {
        throw new Error('Ya existe un broker con ese nombre');
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'brokers', id), {
        name,
        email: broker.email ?? null,
        phone: broker.phone ?? null,
        notes: broker.notes ?? null,
        fiscal: broker.fiscal ?? null,
      });
      // Los clientes guardan el nombre del broker: si cambió, se reemplaza en cada uno
      if (name !== actual.name) {
        get()
          .clients.filter((c) => c.brokers.some((b) => sameBroker(b, actual.name)))
          .forEach((c) => {
            const brokers = normalizeBrokerList(c.brokers.map((b) => (sameBroker(b, actual.name) ? name : b)));
            batch.update(doc(db, 'clients', c.id), { brokers, broker: formatBrokers(brokers) });
          });
      }
      await batch.commit();
    },

    deleteBroker: async (id) => {
      const broker = get().brokers.find((b) => b.id === id);
      if (!broker) return;
      const enUso = get().clients.filter((c) => c.brokers.some((b) => sameBroker(b, broker.name))).length;
      if (enUso > 0) {
        throw new Error(`Lo ${enUso === 1 ? 'usa 1 cliente' : `usan ${enUso} clientes`}: quitalo de sus fichas antes de eliminarlo`);
      }
      await deleteDoc(doc(db, 'brokers', id));
    },

    addPlan: async ({ nombre, precio }) => {
      await addDoc(collection(db, 'planes'), { nombre: nombre.trim(), precio });
    },

    renamePlan: async (id, nombre) => {
      await updateDoc(doc(db, 'planes', id), { nombre: nombre.trim() });
    },

    deletePlan: async (id) => {
      const enUso = get().clients.filter((c) => c.suscripcion?.planId === id).length;
      if (enUso > 0) {
        throw new Error(`Lo ${enUso === 1 ? 'tiene 1 cliente' : `tienen ${enUso} clientes`}: cambiales el plan antes de eliminarlo`);
      }
      await deleteDoc(doc(db, 'planes', id));
    },

    actualizarPrecioPlan: async (planId, precio, clientIds) => {
      const batch = writeBatch(db);
      batch.update(doc(db, 'planes', planId), { precio });
      get()
        .clients.filter((c) => clientIds.includes(c.id) && c.suscripcion)
        .forEach((c) => {
          batch.update(doc(db, 'clients', c.id), {
            'suscripcion.historial': conNuevoMonto(c.suscripcion!.historial, precio),
          });
        });
      await batch.commit();
    },

    addClient: async (clientData) => {
      const brokers = normalizeBrokerList(clientData.brokers, get().brokers.map((b) => b.name));
      await Promise.all(brokers.map((name) => get().ensureBrokerExists(name)));

      const notes = Array.isArray(clientData.notes) ? clientData.notes : [];

      const docRef = await addDoc(collection(db, 'clients'), {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        investorProfile: clientData.investorProfile,
        objectives: clientData.objectives,
        investmentHorizon: clientData.investmentHorizon,
        brokers,
        broker: formatBrokers(brokers), // compatibilidad con el portal de clientes
        ...(clientData.fiscal ? { fiscal: clientData.fiscal } : {}),
        ...(clientData.suscripcion ? { suscripcion: clientData.suscripcion } : {}),
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
      const brokers = Array.isArray(updates.brokers)
        ? normalizeBrokerList(updates.brokers, get().brokers.map((b) => b.name))
        : null;
      if (brokers) {
        await Promise.all(brokers.map((name) => get().ensureBrokerExists(name)));
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
      if (brokers) {
        payload.brokers = brokers;
        payload.broker = formatBrokers(brokers); // compatibilidad con el portal de clientes
      }
      if (Array.isArray(updates.notes)) payload.notes = updates.notes;
      if ('fiscal' in updates) payload.fiscal = updates.fiscal ?? null;
      if ('suscripcion' in updates) payload.suscripcion = updates.suscripcion ?? null;
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
      await addDoc(collection(db, 'messages'), {
        clientId: messageData.clientId,
        content: messageData.content,
        timestamp: messageData.timestamp
          ? Timestamp.fromDate(new Date(messageData.timestamp))
          : serverTimestamp(),
        isFromAdvisor: messageData.isFromAdvisor,
        status: messageData.status ?? 'pendiente',
        read: false,
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
          // Agregar notificación interna
          get().addNotification({
            title: `Nuevo mensaje de ${client.firstName} ${client.lastName}`,
            message: messageData.content.substring(0, 100),
            timestamp: messageData.timestamp ?? new Date(),
            read: false,
            type: 'mensaje',
            clientId: client.id,
          });

          // Mostrar notificación push del navegador
          notificationService.showMessageNotification(
            `${client.firstName} ${client.lastName}`,
            messageData.content,
            client.id
          ).catch((error) => {
            console.warn('No se pudo mostrar la notificación push:', error);
          });
        }
      }
    },

    updateMessageStatus: async (id, status) => {
      await updateDoc(doc(db, 'messages', id), { status });
    },

    markMessageAsRead: async (id) => {
      await updateDoc(doc(db, 'messages', id), { read: true });
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
        const read =
          typeof data.read === 'boolean'
            ? data.read
            : typeof data.read === 'boolean'
              ? data.read
              : false;

        return !read;
      });

      if (unseenMessages.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      unseenMessages.forEach((messageDoc) => {
        batch.update(messageDoc.ref, { read: true });
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

          // Mostrar notificación push del navegador para documentos
          notificationService.showDocumentNotification(
            newDocument.name,
            newDocument.description
          ).catch((error) => {
            console.warn('No se pudo mostrar la notificación push de documento:', error);
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
