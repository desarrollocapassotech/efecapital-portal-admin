import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Módulos que todavía no están en uso (Mensajes e Informes).
 * Por defecto quedan ocultos; el usuario puede mostrarlos desde el menú lateral
 * ("Módulos en desarrollo") para ver cómo van quedando. La preferencia se guarda en localStorage.
 */
interface PreviewStore {
  showPreviewModules: boolean;
  togglePreviewModules: () => void;
}

export const usePreviewStore = create<PreviewStore>()(
  persist(
    (set) => ({
      showPreviewModules: false,
      togglePreviewModules: () => set((state) => ({ showPreviewModules: !state.showPreviewModules })),
    }),
    { name: 'efe-admin-preview-modules' }
  )
);

/** Atajo para componentes que solo necesitan leer el flag. */
export const useShowPreviewModules = () => usePreviewStore((state) => state.showPreviewModules);
