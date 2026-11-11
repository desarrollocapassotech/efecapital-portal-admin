# EFE Capital — Portal de Administrador

React + Vite + TypeScript + Tailwind + shadcn/ui. Firebase para auth y datos (`src/lib/firebase.ts`, `src/stores/`).

## Estilo visual

Corporativo, cuadrado y minimalista, basado en el logo de EFE Capital (`../Logo1.png`, `../Logo2.png`): negro/blanco, una barra dorada con degradé y azul marino institucional.

### Colores
Todos están definidos como tokens HSL en `src/index.css` y expuestos en `tailwind.config.ts`. **Usar siempre los tokens, nunca colores fijos de Tailwind** (`bg-blue-500`, `text-green-600`, `bg-gray-100`, etc.).

| Token | Uso |
|---|---|
| `primary` (azul marino `#1E2E51`) | Botones principales, cifras, avatares, links |
| `gold` / `gold-light` | Acento de marca: ítem activo, contadores sin leer, destacados. Con moderación |
| `sidebar` y `sidebar-*` | Menú lateral y barra superior móvil (azul marino profundo) |
| `background`, `card`, `muted`, `secondary`, `border` | Neutros fríos; fondo gris muy claro, tarjetas blancas |
| `destructive`, `success`, `warning` | Estados, en tonos apagados |

- Barra dorada del logo: clase `.brand-bar` (degradé `#FADC5C → #9E7C00`). Se usa como línea fina (2–3px) debajo de la marca, arriba de tarjetas de login/404 y en el hover de las tarjetas.
- Perfil de inversor: Conservador → `primary`, Moderado → `gold`, Agresivo → `destructive`, otro → `muted` (siempre en versión `/10` de fondo + texto del color).
- Avisos: `border-l-2` del color + fondo `/10` + `text-foreground` (ej. `border-l-2 border-gold bg-gold/10`).

### Formas
- `--radius: 0.125rem` (2px). Todos los `rounded-*` (incluidos `xl`, `2xl`, `3xl`) se resuelven a ese valor: la interfaz es cuadrada.
- **No usar `rounded-full`** en avatares, íconos con fondo, badges ni puntos de notificación. Excepción: spinners y controles de shadcn que lo necesitan (switch, radio).
- Sin sombras en tarjetas (`Card` no tiene `shadow`). Separar con bordes de 1px (`border-border`). Grillas de tarjetas con `gap-px bg-border` para lograr líneas divisorias finas.
- Sin efectos de escala (`hover:scale-*`) ni degradés de fondo. Los hovers cambian solo color de fondo/borde.

### Tipografía
- `font-sans` = **Inter** (texto general). `font-display` = **Montserrat** (la del logo), aplicada automáticamente a `h1–h4`.
- Rótulos y encabezados de sección: clase `.eyebrow` (11px, mayúsculas, `tracking-[0.14em]`, `text-muted-foreground`).
- Badges y botones secundarios en mayúsculas pequeñas con `tracking-wider`.
- Cifras grandes: `font-display text-4xl font-semibold tabular-nums text-primary`.

### Layout
- **Menú lateral** (`src/components/Sidebar.tsx`): fondo `bg-sidebar`, logo blanco (`public/logo-white.png`) + "EFE CAPITAL" en Montserrat espaciada, `.brand-bar` debajo. Ítem activo: `bg-sidebar-accent`, texto blanco, barra dorada de 3px a la izquierda e ícono `text-gold-light`. Contraíble en desktop (`w-64` ↔ `lg:w-16`, se guarda en `localStorage`); en móvil es un panel deslizable.
- **Barra superior** (`src/components/Layout.tsx` + `UserMenu.tsx`): en desktop, barra blanca `h-14` con el usuario (iniciales cuadradas + nombre/email) y un botón **"Cerrar sesión" separado, visible, no dentro de un desplegable**. En móvil, la barra azul incluye mensajes, iniciales y botón de salir.
- Las páginas dejan espacio para la barra móvil (`pt-16`/`pt-20` en móvil, `lg:pt-*` en desktop).
- Iconos: `lucide-react`, tamaño `h-4 w-4` en navegación y tarjetas.

### Al crear o modificar pantallas
1. Componentes de `src/components/ui/` (shadcn) + tokens de color; nada de hex ni colores fijos de Tailwind en las páginas.
2. Mantener todo cuadrado, plano y con bordes finos; el dorado es solo acento.
3. Textos de la interfaz en español.
