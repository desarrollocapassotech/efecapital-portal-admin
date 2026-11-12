# EFE Capital — Portal de Administrador

React + Vite + TypeScript + Tailwind + shadcn/ui. Firebase para auth y datos (`src/lib/firebase.ts`, `src/stores/`).

## Navegación

La pantalla de inicio es **Clientes**: `/` redirige a `/clients`. El Dashboard (`src/pages/Index.tsx`) se considera redundante y es un módulo más "en desarrollo": solo aparece (ruta `/` + ítem del menú) con el switch activo.

## Facturas (Faktia)

Las facturas se emiten con **Faktia** (proyecto en `../../FAKTIA`, API pública `/api/v1`), que es la fuente de verdad: número, CAE y PDF salen de ahí. No se guardan facturas en Firestore.
- Cliente HTTP en `src/lib/faktia.ts`. Sin API key en el navegador: cada llamada va con el ID token de Firebase del usuario y Faktia lo valida (federación, `FIREBASE_FEDERACION` en faktia-backend; ver `docs/PRODUCCION.md` allá).
- Config: `VITE_FAKTIA_API_URL` (ver `.env.example`).
- Cliente EFE ↔ cliente Faktia: se asocian por `referenciaExterna` = id del cliente en Firestore (`faktia.asegurarCliente`). Para facturar, el cliente necesita `fiscal` (documento + condición IVA), que se carga en el formulario de cliente.
- Pantallas: `/invoices` (listado, emitir borradores, PDF) y `/invoices/new`. La futura **cuenta corriente** (pagos/saldos) va aparte y se apoya en estos comprobantes.

## Brokers

Un cliente puede tener varios brokers. Lógica en `src/lib/brokers.ts`.

- Fuente de verdad: `brokers: string[]` en el doc del cliente, con nombres canónicos (`BMB`, `IOL`, `Balanz`, + los que se agreguen).
- Se sigue escribiendo `broker: string` (nombres unidos por ", ") porque el portal de clientes todavía lee ese campo.
- Datos viejos con texto libre ("BMB y IOL", "Invertir Online") se separan y mapean al leer; además el store reescribe una vez los docs que no tienen `brokers`.
- Los brokers base se crean en la colección `brokers` si faltan. En el alta/edición (`BrokerPicker`) se eligen varios o se agrega uno nuevo, que se crea en la colección al guardar.

## Módulos en desarrollo

El foco actual es el **facturador**. **Mensajes** e **Informes** todavía no se usan: están ocultos por defecto detrás de `usePreviewStore` / `useShowPreviewModules` (`src/stores/previewStore.ts`, guardado en localStorage). El usuario los puede mostrar con el switch "En desarrollo" del menú lateral, y ahí aparecen con la etiqueta "Beta".

Lo que respeta ese flag: ítems del menú (`preview: true` en `Sidebar.tsx`), ícono de mensajes de la barra móvil, tarjetas del Dashboard, botones "Chat" en Clientes y Detalle de cliente, rutas `/`, `/messages*` y `/reports*` (`PreviewRoute` en `App.tsx`, redirige a `/clients`) y notificaciones push de mensajes. Cualquier entrada nueva a estos módulos tiene que pasar por el mismo flag.

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
- **Encabezado de página**: siempre `PageHeader` (`src/components/PageHeader.tsx`) con breadcrumb + título + acciones. **No usar botones "Volver"**; la navegación hacia atrás es el breadcrumb (ej. `Clientes › Juan Pérez › Editar`). En páginas de primer nivel (un solo nivel) el breadcrumb no se muestra porque repetiría el título.
- Las páginas dejan espacio para la barra móvil (`pt-16`/`pt-20` en móvil, `lg:pt-*` en desktop).
- Iconos: `lucide-react`, tamaño `h-4 w-4` en navegación y tarjetas.

### Pantallas de listado (patrón general)
Referencias: `src/pages/Clients.tsx` y `src/pages/Invoices.tsx`. Toda pantalla nueva de listado sigue este esquema:

1. **`PageHeader`** con la acción principal a la derecha (ej. "Nueva factura"). Sin tarjetas de totales/KPI arriba del listado.
2. **Barra de filtros** en una `Card`: rótulos con `.eyebrow`, un campo por criterio (selects; para elegir un cliente, `ClientCombobox` con buscador) y botón **Buscar**. El listado **solo se filtra al tocar Buscar o Enter** (estado `draft` vs. `applied`).
3. **Filtros aplicados como badges removibles** debajo de la barra (`Etiqueta: valor ×`), y "Limpiar todo" si hay más de uno. Quitar un badge limpia también el campo.
4. **Tabla** en una `Card` con título y contador (`Clientes (4)`):
   - Encabezados ordenables (`SortableHead`): clic ordena, segundo clic invierte; flecha en la columna activa. Definir un orden por defecto con sentido (ej. fecha más reciente primero) y desempatar siempre por nombre.
   - Un dato por columna (ej. CUIT en su propia columna, no debajo del nombre). Sin avatares ni iniciales.
   - Estados como `Badge` de **ancho fijo** y centrados para que queden alineados; marcas secundarias (ej. "Prueba") como etiqueta chica y sutil en la misma línea, no en otra fila.
   - Nada atenuado ni tachado para indicar estado: el estado lo dice el badge.
5. **Columna "Acciones"** a la derecha con **botones de ícono** `variant="outline" size="sm"`, sin texto, con `title`/`aria-label` (tooltip). Orden: **ver detalle (ojo)** primero, luego acciones específicas, y destructivas al final en rojo (`text-destructive`). Nada de menús de "⋯".
6. **Botón ver (ojo) → panel lateral** (`Sheet` desde la derecha, `sm:max-w-2xl`), nunca navegar a otra página. Ver `ClientDetailSheet.tsx` / `InvoiceDetailSheet.tsx`: encabezado con badge de estado + título + subtítulo, secciones separadas por borde con rótulo `.eyebrow`, filas `rótulo | valor`, y acciones al pie (ej. "Editar", "Ver ficha completa", "Ver PDF").
7. **Móvil**: la tabla se vuelve tarjetas apiladas con las mismas acciones; el orden se elige con un select.
8. **Estados vacíos / error / carga** dentro de la tarjeta, centrados con ícono (spinner que gira mientras carga) y una acción (Reintentar, crear el primero).

### Datos de contacto y documentos
- Email → ícono de sobre que abre `mailto:`; teléfono → ícono de WhatsApp que abre `wa.me` en pestaña nueva (`EmailLink` / `WhatsAppLink` en `src/components/ContactLinks.tsx`; normaliza números argentinos a `549…`).
- Comprobantes y PDFs **se abren en una pestaña nueva**, no se descargan. Íconos distintos por tipo (factura `FileText`, nota de crédito `FileMinus`), sin textos como "NC".
- Confirmaciones de acciones irreversibles con `AlertDialog`, explicando la consecuencia (y pidiendo motivo cuando corresponda).

### Al crear o modificar pantallas
1. Componentes de `src/components/ui/` (shadcn) + tokens de color; nada de hex ni colores fijos de Tailwind en las páginas.
2. Mantener todo cuadrado, plano y con bordes finos; el dorado es solo acento.
3. Textos de la interfaz en español.
4. Listados nuevos: seguir el patrón de "Pantallas de listado" (filtros + Buscar + badges, tabla ordenable, acciones con íconos, ojo → panel lateral).
