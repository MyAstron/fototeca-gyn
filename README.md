<<<<<<< HEAD
# 📷 Gris y Negro - Fototeca (GyN)

Una galería fotográfica web minimalista y elegante diseñada bajo un esquema monocromático de contraste puro (**Gris y Negro**). Este espacio está optimizado para dar protagonismo absoluto al contenido visual, eliminando cualquier distracción de la interfaz.

> [Visitar la Fototeca GyN](https://myastron.github.io/fototeca-gyn/)

---

## ✨ Características Visuales y de Diseño

El diseño de la aplicación web sigue principios estéticos estrictos basados en portafolios fotográficos de alta gama:

* **Estética Monocromática:** Paleta de colores minimalista enfocada en tonos oscuros profundos y escalas de grises sofisticadas para maximizar el contraste de las imágenes expuestas.
* **Interfaz Ultra Limpia:** Menús de navegación simplificados (`← Anterior`, `Inicio`, `Siguiente →`) para un flujo de usuario intuitivo y libre de ruido visual.
* **Estructura Enfocada:** Contenedores fluidos y márgenes equilibrados que permiten a las capturas "respirar" individualmente en pantalla.
* **Carga Dinámica:** Optimización del lado del cliente mediante JavaScript para transiciones fluidas de contenido.

---

## 🛠️ Stack Tecnológico

Fiel a la filosofía de desarrollo ágil y eficiente, el sitio está construido sobre la plataforma nativa de la web para garantizar velocidad de renderizado y portabilidad:

* **HTML5:** Estructura semántica limpia para la visualización del canvas de la galería.
* **CSS3:** Estilos responsivos personalizados con transiciones de color y opacidad fluidas.
* **JavaScript (Vanilla JS):** Lógica nativa encargada de la interactividad, control de navegación de álbumes y manipulación dinámica del DOM sin dependencias pesadas.
* **GitHub Pages:** Despliegue continuo e infraestructura de hosting estático de alta disponibilidad.

---

## 📈 Filosofía del Proyecto
Es para guardar y conservar de manera dinamica el esfuerzo de los estudiantes en busca de la igualdad.

---
Hecho con 🖤 por [MyAstron](https://github.com/MyAstron)
=======
# Fototeca · Gris y Negro

> Mantas, murales y pancartas que guardan en gris y negro la memoria y la lucha del pueblo.  
> Diseñado bajo estándares de alto rendimiento, arquitectura modular y metodología **MyAstron**.

---

## 1. Resumen del Proyecto

**Fototeca** es una aplicación web interactiva de visualización documental y artística. Presenta obras y registros históricos mediante un mosaico dinámico, una línea de tiempo cronológica y un visor cinemático con acercamientos guiados (*deep-zoom* narrativo) y exploración libre.

El sistema ha sido optimizado para cargar instantáneamente en cualquier dispositivo (incluyendo celulares de gama media/baja y conexiones móviles 3G lentas), reduciendo al mínimo el bloqueo del hilo principal y maximizando la resiliencia offline.

---

## 2. Características de Rendimiento y Arquitectura

### 2.1. Skeletons de Carga Nativos (Zero CLS)
- **Despliegue visual inmediato (0ms FCP)**: Mientras se resuelven las peticiones de datos y vistas, el usuario visualiza esqueletos de carga con efecto *shimmer* estilizados con la paleta de color del tema (Gris y Negro).
- **Consistencia dimensional**: Los skeletons conservan las mismas proporciones de aspecto (`aspect-ratio`) y espaciados de la cuadrícula de mosaico para evitar saltos de diseño (*Cumulative Layout Shift*).
- **Accesibilidad**: Respeta automáticamente `prefers-reduced-motion: reduce`.

### 2.2. Aceleración CDN para GitHub Pages
- **Resolvedor de recursos configurable (`App.cdn`)**:
  - Compatible con despliegue en la raíz o en subdirectorios de GitHub Pages (`usuario.github.io/fototeca/`).
  - Para servir todos los recursos estáticos (imágenes, CSS, scripts) desde una CDN global (como jsDelivr), basta con configurar la etiqueta meta en [index.html](file:///home/cris_sic/Desktop/fototeca_gyn/fototeca/index.html):
    ```html
    <meta name="cdn-url" content="https://cdn.jsdelivr.net/gh/tu-usuario/tu-repo@main/">
    ```
  - Si se deja vacío, la aplicación resuelve las rutas relativas automáticamente sin fallos.

### 2.3. Ejecución No Bloqueante del Hilo Principal
- **Búsqueda y filtrado optimizado**: El motor de búsqueda en tiempo real utiliza `requestAnimationFrame` para debouncing y valida el estado antes de mutar el DOM (`t.hidden === ok`), evitando recálculos de estilos innecesarios.
- **Pausa en segundo plano**: La animación de frases tipográficas se suspende automáticamente al cambiar de pestaña o bloquear el teléfono (`visibilitychange`), ahorrando batería y memoria en dispositivos móviles.

### 2.4. Prevención de Re-renders y Layout Thrashing
- **Medición de dimensiones en caché**: En el visor cinemático (`src/js/viewer.js`), las lecturas de dimensiones (`frameWidth`, `frameHeight`) se sincronizan mediante `ResizeObserver` y `layout()`, eliminando las consultas continuas a `frame.clientWidth` en cada fotograma de animación.
- **Renderizado por lotes con `DocumentFragment`**: Tanto en la galería como en la línea de tiempo y las fichas del visor, las tarjetas se agregan en una sola inserción en el DOM, reduciendo los reflows a 1.
- **Transición de tarjetas O(1)**: El visor conmuta únicamente la tarjeta activa anterior y la nueva, en lugar de iterar por toda la colección en cada paso.

### 2.5. Zoom Libre Inteligente y Gestión de Autoplay
- **Desactivación limpia al interactuar**: Al hacer zoom libremente (mediante pellizco con dos dedos, doble toque o rueda/teclas), el reproductor se apaga y el autoplay se desactiva por completo ("como nuevo").
- **Restauración de estado**: Al regresar al zoom guiado (o alejar al 100%), si el usuario tenía el autoplay activo previamente, este se reestablece de forma automática reanudando la secuencia.
- **Gestos táctiles fluidos**: Soporte de `touch-action: pan-y pinch-zoom`, captura de punteros múltiples y detección de doble toque en móviles.

### 2.6. Selector Visual de Formato (Fotografía Original vs Vector SVG)
- **Detección automática**: Si la obra dispone de un archivo vectorial `.svg` en `src/img/thumbs/`, se despliega un conmutador interactivo `[ FOTO | SVG ]` sobre la parte visual de la tarjeta en el mosaico y en la línea de tiempo.
- **Conmutación sin abrir el visor**: El usuario puede alternar entre la foto original y la versión vectorial directamente desde la miniatura sin abrir el visor.
- **Selector sincronizado en el visor**: Dentro del visor cinemático, la barra superior ofrece los botones para alternar entre la fotografía de alta resolución y el trazado vectorial SVG en tiempo real sin perder la posición de zoom.
- **Diseño limpio**: En aquellas obras que solo cuentan con fotografía (sin SVG disponible), el selector se omite y se mantiene invisible.

### 2.7. Lazy Loading Granular y Decodificación Asíncrona
- **Prioridad de pintura para LCP**: Las 3 primeras imágenes del mosaico se marcan con `fetchpriority="high"` y `decoding="async"`.
- **Carga diferida**: Las obras restantes utilizan `loading="lazy" fetchpriority="low" decoding="async"`.

### 2.8. Carga Diferida de Recursos de Terceros
- **Fuentes tipográficas no bloqueantes**: Google Fonts se carga asíncronamente mediante `media="print" onload="this.media='all'"`, precargando la hoja de estilos sin frenar la representación inicial.
- **Scripts externos diferidos**: Bibliotecas como jQuery se declaran con `defer` y la capa base de red (`src/ajax/http.js`) opera con `fetch` nativo sin depender forzosamente de librerías externas.

### 2.9. División de JavaScript por Página (Code Splitting)
- El archivo principal [index.html](file:///home/cris_sic/Desktop/fototeca_gyn/fototeca/index.html) solo carga los módulos mínimos indispensables (`core.js`, `http.js`, `api.js`, `main.js`).
- Los módulos de página se cargan dinámicamente bajo demanda:
  - **Encabezado y Navegación**: [site.js](file:///home/cris_sic/Desktop/fototeca_gyn/fototeca/src/js/site.js) al renderizar la vista de cabecera.
  - **Galería y Mosaico**: [gallery.js](file:///home/cris_sic/Desktop/fototeca_gyn/fototeca/src/js/gallery.js) al renderizar el inicio.
  - **Visor Cinemático**: [viewer.js](file:///home/cris_sic/Desktop/fototeca_gyn/fototeca/src/js/viewer.js) únicamente cuando el usuario abre una obra.

### 2.10. Estrategia de Caché Avanzada en Navegador
- **Service Worker (`sw.js`)**:
  - *Stale-While-Revalidate* para archivos estáticos (imágenes, fuentes, CSS, JS, favicons). Entrega instantánea desde caché y actualización en segundo plano.
  - *Network-First* con reserva local para peticiones de datos (`site.json`, `manifest.json`) y navegación offline.
- **Servidor local (`server.js`)**:
  - Cabeceras `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` para estáticos.
  - Generación de `ETag` y validación de `If-None-Match` con respuestas `304 Not Modified`.
- **Servidor Apache (`.htaccess`)**:
  - Reglas `mod_expires` y `mod_headers` para despliegues en servidores convencionales.

---

## 3. Estructura del Proyecto

```text
fototeca/
├── 404.html               # Página de retorno automático en rutas inválidas
├── build-manifest.js      # Generador de manifiesto de imágenes para hosting estático
├── index.html             # Shell principal con skeletons y enlaces no bloqueantes
├── package.json           # Scripts del proyecto
├── server.js              # Servidor HTTP local con soporte ETag, 304 y Service Worker
├── sw.js                  # Service Worker con caché adaptativo offline
├── .htaccess              # Reglas de seguridad y caché para servidores Apache
└── src/
    ├── ajax/
    │   ├── api.js         # Endpoints de vistas y datos (con fallback automático)
    │   └── http.js        # Cliente fetch/ajax ligero con soporte CDN y caché
    ├── css/
    │   ├── base.css       # Variables de tema, tipografía y diseño global
    │   ├── gallery.css    # Mosaico, skeletons, búsqueda y línea de tiempo
    │   └── viewer.css     # Estilos del visor cinematográfico y zoom libre
    ├── data/
    │   └── site.json      # Configuración del sitio, frases y secciones
    ├── icons/             # Favicons, logo SVG y assets PWA
    ├── img/
    │   ├── info/          # Metadatos narrativos de cada obra (JSON)
    │   ├── thumbs/        # Miniaturas optimizadas (SVG, WebP, JPG)
    │   └── manifest.json  # Catálogo indexado de obras
    ├── js/
    │   ├── core.js        # Namespace App, resolvedor CDN y utilidades
    │   ├── gallery.js     # Lógica del mosaico, filtros y timeline
    │   ├── main.js        # Coordinador de arranque y división de scripts
    │   ├── site.js        # Frases, navegación y tema claro/oscuro
    │   └── viewer.js      # Visor cinematográfico, zoom y reproducción
    └── views/
        ├── header.html    # Parcial de encabezado y controles
        ├── home.html      # Parcial de mosaico con skeletons iniciales
        └── viewer.html    # Parcial del visor
```

---

## 4. Uso y Ejecución

### Modo Local (Desarrollo)
Para iniciar el servidor local con soporte completo de caché y ETag:
```bash
npm start
# O directamente:
node server.js
```
Abre en tu navegador: [http://localhost:8080](http://localhost:8080)

### Actualizar Catálogo de Imágenes
Al agregar nuevas fotografías a `src/img/` y miniaturas a `src/img/thumbs/`:
```bash
npm run manifest
```

### Despliegue en GitHub Pages
1. Sube los archivos a tu repositorio en la rama `main` o `gh-pages`.
2. En la configuración del repositorio (**Settings -> Pages**), selecciona la raíz `/` como fuente.
3. Opcional: si deseas acelerar imágenes pesadas mediante CDN, añade la URL base en el `<meta name="cdn-url">` de [index.html](file:///home/cris_sic/Desktop/fototeca_gyn/fototeca/index.html).

---

## 5. Pruebas y Validación en Móviles y Redes Lentas

Se incluye una suite de pruebas automatizadas que valida:
- Respuesta de cabeceras `Cache-Control` y códigos `304 Not Modified`.
- Presencia de skeletons nativos en el HTML.
- Registro y scope del Service Worker.
- Rendimiento en simulación de dispositivos móviles bajo latencia de red (3G).

Ejecución del test:
```bash
node /home/cris_sic/.gemini/antigravity-cli/brain/6c6231db-2813-41d8-ac17-020ca28eb7f2/scratch/test_performance.js
```

---

## 6. Identidad y Metodología

Desarrollado siguiendo la filosofía **MyAstron**: claridad técnica, diseño sobrio de alto contraste, rendimiento prioritario y documentación estructurada y sostenible en el tiempo.
>>>>>>> b7a3806 (Add Huelga2026 mural data, thumbnail, and service worker for caching)
