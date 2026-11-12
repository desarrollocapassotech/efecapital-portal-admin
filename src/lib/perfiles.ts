/**
 * Colores del badge de perfil de inversor (fondo /10 + texto + borde del color).
 * Conservador → verde (`success`), Moderado → dorado (`gold`), Agresivo → rojo (`destructive`).
 */
export const colorPerfil = (perfil: string | undefined) => {
  // El formulario guarda el perfil en minúsculas; comparar sin distinguir mayúsculas
  switch (perfil?.toLowerCase()) {
    case 'conservador':
      return 'bg-success/10 text-success border-success/30';
    case 'moderado':
      return 'bg-gold/10 text-gold border-gold/30';
    case 'agresivo':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};
