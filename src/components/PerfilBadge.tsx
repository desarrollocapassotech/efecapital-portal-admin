import { Badge } from '@/components/ui/badge';
import { colorPerfil } from '@/lib/perfiles';

/** Badge del perfil de inversor: ancho fijo y centrado para que queden alineados en listados. */
export const PerfilBadge = ({ perfil }: { perfil: string | undefined }) => (
  <Badge variant="outline" className={`w-28 justify-center ${colorPerfil(perfil)}`}>
    {perfil || '—'}
  </Badge>
);
