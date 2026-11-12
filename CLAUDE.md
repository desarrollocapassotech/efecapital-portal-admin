# EFE Capital — Portal de Administrador

React + Vite + TypeScript + Tailwind + shadcn/ui. Firebase para auth y datos (`src/lib/firebase.ts`, `src/stores/`).

## Navegación

La pantalla de inicio es el **Dashboard** (`/`, `src/pages/Index.tsx`): un resumen completo con el recordatorio de facturación pendiente del mes vencido, el estado de suscripciones y comisiones (facturadas sobre el total), los servicios de pago único facturados en el período (facturas emitidas con alguna línea cuyo texto coincide con el nombre de un servicio; suma solo esas líneas, `serviciosFacturados` del hook), y la cartera (clientes e ingreso mensual), más la lista de pendientes. Usa `useFacturacionPeriodo` (`src/hooks/`), el mismo hook que Facturación mensual. No muestra nada de Mensajes ni Informes.

## Facturas (Faktia)

Las facturas se emiten con **Faktia** (proyecto en `../../FAKTIA`, API pública `/api/v1`), que es la fuente de verdad: número, CAE y PDF salen de ahí. No se guardan facturas en Firestore.
- Cliente HTTP en `src/lib/faktia.ts`. Sin API key en el navegador: cada llamada va con el ID token de Firebase del usuario y Faktia lo valida (federación, `FIREBASE_FEDERACION` en faktia-backend; ver `docs/PRODUCCION.md` allá).
- Config: `VITE_FAKTIA_API_URL` (ver `.env.example`).
- Cliente EFE ↔ cliente Faktia: se asocian por `referenciaExterna` = id del cliente en Firestore (`faktia.asegurarCliente`). Para facturar, el cliente necesita `fiscal` (documento + condición IVA), que se carga en el formulario de cliente.
- **Emitir siempre pide confirmación** (`AlertDialog` con receptor, total y aviso de que no se puede deshacer): en "Nueva factura", al emitir un borrador desde el listado y en Facturación mensual. Toda entrada nueva que emita en ARCA tiene que hacer lo mismo.
- **Siempre factura C en pesos (ARS)**, sin IVA discriminado (alícuota 0). No hay selector de moneda. Se manda `tipo: 'FACTURA_C'` desde "Nueva factura" y desde Facturación mensual; no hay selector de tipo. Cada línea de "Nueva factura" tiene solo descripción e importe (cantidad 1, unidad Servicio).
- Pantallas: `/invoices` (listado, emitir borradores, PDF) y `/invoices/new`. La futura **cuenta corriente** (pagos/saldos) va aparte y se apoya en estos comprobantes.

## Facturación mensual (suscripciones y comisiones)

Pantalla `/invoices/monthly` (`src/pages/Billing.tsx`), subpantalla de Facturas (botón en su encabezado, sin ítem propio en el menú; `/billing` redirige): en un solo paso emite las facturas del mes a clientes (suscripción) y brokers (comisiones).
- **Mes vencido**: por defecto factura el mes anterior. Cada factura: concepto Servicios, período = mes completo, emisión hoy, vencimiento a `DIAS_VENCIMIENTO` días.
- **Detección de duplicados**: consulta Faktia con `GET /comprobantes?periodo=YYYY-MM` (filtro por superposición del período de servicio) y marca como facturado al receptor que ya tiene una factura emitida o en curso. Las anuladas no cuentan. Los borradores y las rechazadas del período se reutilizan, no se crea otra factura. La idempotencia de Faktia dura solo 24 h: no alcanza para esto.
- Confirmación previa con `AlertDialog`, emisión secuencial con estado por fila; los errores quedan marcados para reintentar.
- Brokers: el usuario carga el total del mes de cada uno; se muestra lo facturado el mes anterior como referencia (clic para copiarlo). Una factura por broker con una línea "Comisiones — Mes Año".

Suscripción del cliente (`client.suscripcion`, lógica en `src/lib/suscripciones.ts`, se edita en `ClientForm` con `SuscripcionFields`):
- `desde` = mes de alta (se cobra completo), `hasta` = último mes facturado (baja), `planId` opcional.
- `historial` de montos con vigencia `desde`. **Cada cliente tiene su propio monto** (los viejos pueden quedar atrasados respecto del plan). Un cambio rige desde el mes en curso, así la factura del mes anterior sale con el monto viejo. La opción "Es una corrección" reemplaza todo el historial.
- Atajos para asignar plan: en Clientes, la columna **Plan** es un botón de ícono (`SuscripcionIcon` de `src/components/icons/`, flecha circular con signo pesos = pago periódico, el mismo ícono de Planes en todo el admin; `RefreshCw` queda solo para "Actualizar"; verde sutil `success` si tiene suscripción, punteado si no; plan y monto en el tooltip) que abre `SuscripcionDialog` (los mismos `SuscripcionFields` del formulario); en `/plans`, el botón "Asignar clientes" (`UserPlus`) asigna un plan a varios a la vez (`conPlan` en `suscripciones.ts`, `guardarSuscripciones` en el store). Los que no tienen suscripción se dan de alta en el mes en curso al precio del plan; a los que ya tienen, opcionalmente se les aplica el precio desde el mes en curso. Las bajas no se ofrecen.
- Planes (`planes` en Firestore: `nombre`, `precio`) en `/plans`. "Actualizar precio" cambia el precio del plan y lo aplica solo a los clientes tildados: por defecto, los que pagaban el precio vigente; los atrasados quedan como están.

Servicios de pago único (`servicios` en Firestore: `nombre`, `precio`): ABM en `/services` (`Services.tsx`, alta y edición en diálogo). No entran en la facturación mensual. Se eligen en "Nueva factura" con "Agregar servicio…", que completa la línea con el nombre y el precio. Cargados al 2026-11-12: plan mensual "Asesoramiento con seguimiento" $14.900; servicios "Tu primera inversión" $79.900, "Asesoramiento por única vez" $79.900 y "Diagnóstico inicial (asesoramiento con seguimiento)" $34.900.

Receptores en Faktia: clientes con `referenciaExterna` = id del cliente; brokers con `broker:<id>` (`faktia.asegurarReceptor`).

## Clientes: baja lógica

Los clientes **nunca se eliminan** de Firestore: se deshabilitan (`deshabilitadoEn` + `motivoDeshabilitacion` opcional) y conservan facturas, mensajes, documentos y actividades. Store: `deshabilitarCliente` / `habilitarCliente` (no existe `deleteClient`). Helper `clienteHabilitado` en `src/lib/clientes.ts`.
- En Clientes, el último botón de Acciones es "Deshabilitar" (`UserX`, rojo) o "Volver a habilitar" (`UserCheck`) en `EstadoClienteDialog`. El listado muestra por defecto solo habilitados (filtro **Estado**); los deshabilitados llevan la marca "Deshabilitado" junto al nombre.
- Al deshabilitar se ofrece dar de baja la suscripción con `hasta` = mes vencido (o el mes de alta si es posterior), `periodoBajaHoy`. Habilitar no reactiva la suscripción.
- Se excluyen de "Nueva factura", asignación y precio de planes y la cartera del Dashboard. Los filtros de historial (Facturas) siguen mostrándolos. Toda pantalla nueva que ofrezca clientes para operar tiene que filtrar con `clienteHabilitado`.

## Brokers

ABM en `/brokers` (`Brokers.tsx`, `BrokerForm.tsx`, `BrokerDetailSheet.tsx`). El broker tiene datos fiscales (`fiscal`) para facturarle. Si se renombra, el nombre se reemplaza también en los clientes que lo usan (batch). No se puede eliminar si algún cliente lo tiene asignado.

Un cliente puede tener varios brokers. Lógica en `src/lib/brokers.ts`.

- Fuente de verdad: `brokers: string[]` en el doc del cliente, con nombres canónicos (`BMB`, `IOL`, `Balanz`, + los que se agreguen).
- Se sigue escribiendo `broker: string` (nombres unidos por ", ") porque el portal de clientes todavía lee ese campo.
- Datos viejos con texto libre ("BMB y IOL", "Invertir Online") se separan y mapean al leer; además el store reescribe una vez los docs que no tienen `brokers`.
- Los brokers base se crean en la colección `brokers` si faltan. En el alta/edición (`BrokerPicker`) se eligen varios o se agrega uno nuevo, que se crea en la colección al guardar.

## Módulos en desarrollo

El foco actual es el **facturador**. **Mensajes** e **Informes** todavía no se usan: están ocultos por defecto detrás de `usePreviewStore` / `useShowPreviewModules` (`src/stores/previewStore.ts`, guardado en localStorage). El usuario los puede mostrar con el switch "En desarrollo" del menú lateral, y ahí aparecen con la etiqueta "Beta".

Lo que respeta ese flag: ítems del menú (`preview: true` en `Sidebar.tsx`), ícono de mensajes de la barra móvil, botones "Chat" en Clientes y Detalle de cliente, rutas `/messages*` y `/reports*` (`PreviewRoute` en `App.tsx`, redirige a `/clients`) y notificaciones push de mensajes. Cualquier entrada nueva a estos módulos tiene que pasar por el mismo flag.

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
- Perfil de inversor: Conservador → `success`, Moderado → `gold`, Agresivo → `destructive`, otro → `muted` (siempre en versión `/10` de fondo + texto del color). Mostrarlo siempre con `PerfilBadge` (`src/components/PerfilBadge.tsx`: ancho fijo `w-28`, centrado; colores de `colorPerfil` en `src/lib/perfiles.ts`).
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
- En listados (tabla y tarjetas móviles) no se muestran email ni teléfono: solo `ContactButtons` (dos botones de ícono `outline sm`, como los de Acciones; deshabilitados si falta el dato, con el dato en el tooltip).
- Comprobantes y PDFs **se abren en una pestaña nueva**, no se descargan. Íconos distintos por tipo (factura `FileText`, nota de crédito `FileMinus`), sin textos como "NC".
- Confirmaciones de acciones irreversibles con `AlertDialog`, explicando la consecuencia (y pidiendo motivo cuando corresponda).

### Al crear o modificar pantallas
1. Componentes de `src/components/ui/` (shadcn) + tokens de color; nada de hex ni colores fijos de Tailwind en las páginas.
2. Mantener todo cuadrado, plano y con bordes finos; el dorado es solo acento.
3. Textos de la interfaz en español.
4. Listados nuevos: seguir el patrón de "Pantallas de listado" (filtros + Buscar + badges, tabla ordenable, acciones con íconos, ojo → panel lateral).
