# Mis gastos

App web de escritorio para que una persona de 68 años, poco tecnológica, anote sus gastos y vea en qué se le va la plata. Un solo usuario, un solo computador (Mac con Safari). Proyecto personal, sin fines comerciales.

## Qué leer antes de escribir código

- `docs/brief.md`: alcance, pantallas, reglas, criterios de aceptación y fases. Es la fuente de verdad del producto.
- `docs/arquitectura.md`: stack, modelo de datos, reglas de cálculo y riesgos.
- `docs/cartola.md`: importación de la cartola del banco. Solo aplica en la fase 6.
- `design/pantallas/*.html`: referencia visual de las cuatro pestañas. Ábrelas en el navegador. Respeta estructura, textos, tamaños y colores. Los datos que muestran son de ejemplo.
- `design/tokens.css`: colores, tipografía, espaciado y radios como variables CSS.

Si el brief y una pantalla de referencia se contradicen, manda el brief. Avísame de la contradicción.

## Reglas que no se negocian

1. Simple ante todo. Si una función no está en el brief, no se agrega. Pregunta antes.
2. Todo el texto en español de Chile, tratando de tú. Montos en pesos chilenos, sin decimales y con punto de miles: `$12.500`.
3. Texto base de 20 px y nada bajo 17 px. Toda área clicable mide 48 px de alto o más.
4. Cada acción se resuelve con un clic simple. Nada de doble clic, clic derecho, menús desplegables ocultos ni información que solo aparece al pasar el mouse. Arrastrar nunca es la única vía.
5. Un estado nunca se comunica solo con color: siempre lleva texto o ícono.
6. Los datos no salen del computador. Sin backend, sin analítica y sin llamadas a servicios externos.
7. Nada se pierde sin aviso: toda eliminación pide confirmación y ofrece deshacer.

## Stack

- Vite, React y TypeScript en modo estricto.
- Estilos con CSS propio y las variables de `design/tokens.css`. Sin librerías de componentes ni de gráficos: las barras son elementos HTML.
- Datos en IndexedDB. Nunca `localStorage` para datos del usuario.
- Fuente DM Sans empaquetada dentro del proyecto, no cargada desde Google Fonts.
- Pruebas con Vitest y Testing Library.
- El resultado es un sitio estático que abre sin conexión después de la primera carga.

## Comandos

- `npm install`: instala dependencias.
- `npm run dev`: servidor local para desarrollo.
- `npm test`: pruebas.
- `npm run build`: genera el sitio en `dist/`.
- `npm run preview`: abre la versión publicada en local, con funcionamiento sin conexión.
- `npm run iconos`: vuelve a generar los íconos PNG desde `public/icono.svg`.
- En desarrollo, `?datos=ejemplo` carga seis meses de datos de ejemplo y `?datos=vacio` deja la app vacía.

Publicación e instalación: `docs/publicar.md` y `docs/instalacion.md`.

## Forma de trabajar

- Avanza por las fases de `docs/brief.md`, una a la vez. Antes de cada fase, propón el plan y espera mi aprobación.
- Una fase se cierra cuando las pruebas pasan, revisaste cada criterio de aceptación en la app andando y me dejaste un resumen de qué quedó hecho y qué no.
- Escribe pruebas para toda la lógica de montos, fechas, meses y totales.
- Commits pequeños, con mensajes en español.
- Si algo es ambiguo, pregunta. No adivines ni rellenes con funciones extra.
