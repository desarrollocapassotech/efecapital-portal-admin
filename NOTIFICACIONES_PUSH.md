# Notificaciones Push - Portal Admin EfeCapital

## 📱 Funcionalidad Implementada

Se ha implementado un sistema completo de notificaciones push que alerta al usuario cuando llegan mensajes nuevos de clientes o cuando se suben nuevos documentos.

## 🚀 Características

### ✅ Notificaciones Automáticas
- **Mensajes nuevos**: Se muestran notificaciones cuando un cliente envía un mensaje
- **Documentos nuevos**: Se muestran notificaciones cuando se sube un nuevo informe
- **Navegación inteligente**: Al hacer clic en la notificación, te lleva directamente al chat del cliente o a la sección correspondiente

### ✅ Configuración Flexible
- **Solicitud de permisos**: El sistema solicita permisos del navegador automáticamente
- **Estado visual**: Muestra claramente si las notificaciones están activadas, bloqueadas o no configuradas
- **Instrucciones claras**: Guía al usuario sobre cómo habilitar las notificaciones si están bloqueadas

### ✅ Pruebas Integradas
- **Componente de prueba**: Permite probar las notificaciones con contenido personalizado
- **Validación**: Verifica que los permisos estén concedidos antes de mostrar notificaciones

## 🛠️ Archivos Implementados

### Servicios
- `src/lib/notifications.ts` - Servicio principal de notificaciones push
- `src/hooks/useNotificationSetup.ts` - Hook para configuración automática

### Componentes
- `src/components/NotificationSettings.tsx` - Configuración de notificaciones
- `src/components/NotificationTester.tsx` - Pruebas de notificaciones

### Integración
- `src/stores/dataStore.ts` - Integrado con el sistema de mensajes existente
- `src/App.tsx` - Configuración automática al cargar la aplicación
- `src/pages/Index.tsx` - Página principal con configuración y pruebas

## 📋 Cómo Usar

### 1. Activar Notificaciones
1. Ve a la página principal (`/`)
2. En la sección "Configuración de notificaciones", haz clic en "Activar notificaciones"
3. Permite las notificaciones cuando tu navegador lo solicite

### 2. Probar Notificaciones
1. En la sección "Probar notificaciones", personaliza el contenido
2. Haz clic en "Probar notificación de mensaje" o "Probar notificación de documento"
3. Verifica que aparezca la notificación en tu sistema operativo

### 3. Notificaciones Automáticas
- Las notificaciones se mostrarán automáticamente cuando:
  - Un cliente envía un mensaje nuevo
  - Se sube un nuevo documento/informe
- Al hacer clic en la notificación, te llevará directamente al chat o sección correspondiente

## 🔧 Configuración Técnica

### Permisos del Navegador
- **granted**: Notificaciones activadas ✅
- **denied**: Notificaciones bloqueadas ❌
- **default**: Permisos no solicitados aún ⚠️

### Compatibilidad
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (limitado)
- ❌ Navegadores muy antiguos

### Personalización
Las notificaciones incluyen:
- **Título**: Nombre del cliente o tipo de documento
- **Contenido**: Mensaje o descripción
- **Icono**: Favicon de la aplicación
- **Datos**: Información para navegación automática
- **Auto-cierre**: Se cierran automáticamente después de 5 segundos

## 🐛 Solución de Problemas

### Notificaciones No Aparecen
1. Verifica que los permisos estén concedidos
2. Asegúrate de que el navegador soporte notificaciones
3. Revisa la configuración del sistema operativo

### Permisos Bloqueados
1. Haz clic en el ícono de candado/información en la barra de direcciones
2. Selecciona "Permitir" en la sección de notificaciones
3. Recarga la página

### Notificaciones No Funcionan en Safari
- Safari tiene limitaciones con las notificaciones push
- Considera usar Chrome o Firefox para mejor compatibilidad

## 📱 Experiencia de Usuario

### Flujo de Notificación
1. **Cliente envía mensaje** → Sistema detecta mensaje nuevo
2. **Notificación aparece** → Muestra título y contenido del mensaje
3. **Usuario hace clic** → Navega automáticamente al chat del cliente
4. **Mensaje se marca como leído** → Notificación se cierra automáticamente

### Beneficios
- **Inmediatez**: Recibes alertas instantáneas de mensajes nuevos
- **Eficiencia**: No necesitas revisar constantemente la aplicación
- **Contexto**: Las notificaciones incluyen información relevante
- **Acceso rápido**: Un clic te lleva directamente al mensaje

## 🔮 Futuras Mejoras

- [ ] Notificaciones con sonido personalizable
- [ ] Configuración de horarios de notificaciones
- [ ] Notificaciones por tipo de mensaje
- [ ] Integración con notificaciones del sistema operativo
- [ ] Historial de notificaciones
