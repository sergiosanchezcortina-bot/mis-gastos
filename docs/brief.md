# Brief de producto: Mis gastos

Versión 1, 17 de noviembre de 2026. "Mis gastos" es un nombre provisional.

## 1. Problema

Mi papá tiene 68 años y es poco tecnológico. No sabe con claridad en qué se le va la plata cada mes ni qué cuentas ya pagó. Las apps de finanzas que existen le piden demasiado: cuentas, presupuestos, etiquetas, sincronización. Necesita algo que pueda usar solo, sentado en su computador, en pocos minutos.

## 2. Enfoque

Una app web de escritorio con cuatro pestañas que responde tres preguntas:

1. Cuánto llevo gastado este mes.
2. En qué se fue.
3. Qué me falta pagar.

La tarea central es anotar un gasto en tres pasos: monto, día y categoría. Los datos viven solo en su computador. No hay cuentas de usuario ni servidor.

## 3. Narrativa

- **Un día normal.** En la tarde abre la app desde el Dock. Ve el Resumen, hace clic en "Agregar gasto", anota los tres gastos del día y cierra. Le toma menos de dos minutos.
- **Día de pagar cuentas.** Entra a "Gastos recurrentes", marca "Agua" como pagada y corrige el monto porque este mes fue distinto.
- **Fin de mes.** Mira el Resumen, ve que Supermercado es lo que más pesa y hace clic para ver esos gastos.
- **Se equivocó.** Anotó $32.000 en vez de $23.000. Hace clic en "Corregir" en esa fila y lo arregla.
- **Se atrasó.** Pasó cinco días sin anotar. Usa "Otro día" para ponerse al día.

## 4. Metas

### 4.1 Métricas

Se miden observando el uso real, no con analítica dentro de la app.

| Meta | Cómo se verifica |
|---|---|
| Anota gastos al menos 4 días por semana durante las 3 primeras semanas | Fechas de los gastos en la tabla |
| Anota un gasto en menos de 20 segundos | Prueba con él, cronometrada |
| Responde las tres preguntas mirando el Resumen en menos de 1 minuto | Prueba con él |
| No pide ayuda después de la primera semana | Conversación |

### 4.2 Modelo de impacto

No aplica. Es una app personal para un usuario.

## 5. No metas

Quedan fuera a propósito. No agregar sin preguntar.

- Presupuestos o límites por categoría.
- Ingresos, saldos o patrimonio.
- Varias cuentas, tarjetas o medios de pago.
- Subcategorías, etiquetas o notas en los gastos.
- Fotos de boletas.
- Usuarios, contraseñas o sincronización entre dispositivos.
- Versión para celular.
- Notificaciones.
- Gastos recurrentes que no son mensuales (contribuciones, permiso de circulación, seguros anuales). Se anotan como gasto no recurrente el mes en que ocurren.
- Otras monedas.
- Modo oscuro.

## 6. Alineación de la solución

### 6.1 Principios

Los mismos de `CLAUDE.md`: simple ante todo, texto grande, un clic por acción, estados con texto, datos locales y nada se pierde sin aviso.

### 6.2 Navegación

- Barra lateral fija a la izquierda con cuatro pestañas, cada una con ícono y texto: Resumen, Gastos recurrentes, Gastos no recurrentes y Cartola. Abajo, separado, Ajustes.
- La app abre siempre en Resumen.
- La pestaña activa se distingue por fondo de color y texto en negrita.
- La pestaña Cartola se construye en la fase 6. Hasta entonces no se muestra en la barra.
- Profundidad máxima de dos niveles. No hay menús ocultos.

### 6.3 El mes

- Todas las pestañas trabajan sobre un mes seleccionado, que es el mismo en toda la app.
- Al abrir la app, el mes seleccionado es el actual.
- Cada pestaña tiene un selector con botones "Mes anterior" y "Mes siguiente" y el nombre del mes ("Noviembre 2026").
- "Mes siguiente" se desactiva en el mes actual. "Mes anterior" se desactiva en el primer mes con datos.

## 7. Funciones clave

### 7.1 Plan de registro

#### Resumen

Referencia: `design/pantallas/resumen.html`.

- **RES-1.** Muestra el total gastado del mes: gastos recurrentes pagados más gastos no recurrentes.
- **RES-2.** Bajo el total, una frase de comparación:
  - Mes actual: compara lo gastado hasta hoy con lo gastado el mes anterior hasta el mismo día. Texto: "Vas $24.500 por debajo de octubre a esta misma fecha." o "Vas $24.500 por encima de octubre a esta misma fecha." Si es igual: "Vas igual que octubre a esta misma fecha."
  - Mes pasado: compara el mes completo con el anterior completo. Texto: "$24.500 menos que en septiembre." o "$24.500 más que en septiembre."
  - Si el mes anterior no tiene datos, la frase no se muestra.
- **RES-3.** Tres tarjetas:
  - "Recurrentes pagados": suma, "3 de 6 pagados" y barra de avance.
  - "No recurrentes": suma y "14 gastos anotados".
  - "Te falta pagar": suma de los recurrentes sin pagar y el enlace "Ver los 3 gastos pendientes", que lleva a Gastos recurrentes. Usa estilo de alerta. Si no falta nada, dice "Todo pagado" y pierde el estilo de alerta.
- **RES-4.** "¿En qué se fue?": una fila para "Gastos recurrentes" (lo pagado) y una por cada categoría con gasto mayor que cero, ordenadas de mayor a menor. Cada fila lleva ícono, nombre, monto y una barra cuyo largo es proporcional a la fila mayor. Las categorías sin gasto no aparecen.
- **RES-5.** Al hacer clic en una fila de "¿En qué se fue?", se despliega debajo la lista de sus gastos (fecha y monto). Otro clic la cierra. Solo una fila abierta a la vez.
- **RES-6.** "Mes a mes": hasta los cuatro meses más recientes con datos, incluido el seleccionado. Cada uno con nombre, total y barra. El mes en curso se rotula "Noviembre, hasta hoy" y su barra usa el color de acento.
- **RES-7.** Botón principal "Agregar gasto": lleva a Gastos no recurrentes con el cursor en el campo de monto.
- **RES-8.** Estado vacío (mes sin ningún gasto): "Todavía no hay gastos este mes." y el botón "Agregar gasto". No se muestran tarjetas ni barras en cero.
- **RES-9.** Aviso de respaldo (desde la fase 4): si pasaron más de 30 días desde el último respaldo, muestra "Hace más de un mes que no haces un respaldo." con el botón "Hacer respaldo ahora".

#### Gastos recurrentes

Referencia: `design/pantallas/gastos-recurrentes.html`.

- **REC-1.** Tres tarjetas arriba: "Total del mes" (suma de todas las filas y cantidad), "Pagado" (suma, "3 de 6 pagados" y barra de avance) y "Por pagar" (suma y "Faltan 3"). Si no falta nada, "Por pagar" muestra $0 y "Todo pagado" sin estilo de alerta.
- **REC-2.** Tabla con una fila por gasto recurrente del mes y tres columnas: Pagado (casilla), Gasto (nombre y estado) y Monto (campo editable).
- **REC-3.** El orden de las filas es fijo: por día de vencimiento y, a igual día, por nombre. Los gastos sin día de vencimiento van al final. Las filas no cambian de lugar al marcarlas.
- **REC-4.** Marcar la casilla deja el gasto como pagado. Desmarcarla lo devuelve a por pagar. Hacer clic en el nombre también marca o desmarca.
- **REC-5.** El monto se puede editar esté o no pagado. Antes de pagar es un estimado, y la app propone el último monto conocido de ese gasto. Después de pagar es lo pagado.
- **REC-6.** Texto de estado bajo el nombre:
  - Pagado: "Pagado".
  - Sin pagar, con día de vencimiento y aún no vence: "Vence el 20".
  - Sin pagar y ya venció (o el mes ya terminó): "Venció el 20", con ícono y estilo de alerta.
  - Sin pagar y sin día de vencimiento: "Por pagar".
  - Sin monto: "Falta el monto", con ícono y estilo de alerta. Cuenta como $0 en los totales.
- **REC-7.** Cada mes parte con la misma lista, las casillas sin marcar y el último monto conocido de cada gasto.
- **REC-8.** "Agregar gasto recurrente" abre un formulario corto: nombre (obligatorio), día de vencimiento (opcional, del 1 al 31) y monto estimado (opcional). El gasto aparece desde el mes seleccionado en adelante.
- **REC-9.** "Editar lista" muestra en cada fila las acciones "Cambiar nombre o día" y "Quitar". Quitar pide confirmación: "¿Quitar Gas de tus gastos recurrentes? Los meses anteriores no cambian." El gasto deja de aparecer desde el mes seleccionado. Si en ese mes ya estaba pagado, ese mes se conserva y deja de aparecer desde el siguiente. Después de quitar: "Se quitó Gas. Deshacer".
- **REC-10.** Los meses pasados se pueden corregir igual que el actual.
- **REC-11.** Estado vacío: "Todavía no tienes gastos recurrentes." y el botón "Agregar gasto recurrente".

#### Gastos no recurrentes

Referencia: `design/pantallas/gastos-no-recurrentes.html`.

- **NOR-1.** Formulario "Agregar gasto" con tres pasos numerados y visibles a la vez:
  1. "¿Cuánto gastaste?": campo de monto. Solo dígitos, con formato de miles mientras se escribe. Máximo 8 dígitos.
  2. "¿Cuándo fue?": tres botones, "Hoy" (seleccionado por defecto), "Ayer" y "Otro día". "Otro día" muestra un selector de fecha que no acepta fechas futuras.
  3. "¿En qué fue?": un botón por categoría visible, con ícono y texto. Se elige una.
- **NOR-2.** "Guardar gasto" guarda. La tecla Enter hace lo mismo.
- **NOR-3.** Validación al guardar, con el mensaje junto al campo: "Escribe cuánto gastaste" si el monto está vacío o es cero; "Elige en qué fue" si falta la categoría.
- **NOR-4.** Después de guardar: el gasto aparece como primera fila de la tabla, el formulario queda vacío, "Hoy" vuelve a estar seleccionado y el cursor vuelve al monto. Si el gasto es de otro mes, la vista cambia a ese mes.
- **NOR-5.** Tabla "Gastos de noviembre" con cantidad y total del mes en el encabezado. Columnas: Fecha, Categoría (ícono y nombre), Monto y la acción "Corregir". Orden: del más reciente al más antiguo.
- **NOR-6.** Las fechas se leen "Hoy, lunes 16", "Ayer, domingo 15" y, para el resto, "Sábado 14".
- **NOR-7.** La tabla muestra los 10 gastos más recientes. Si hay más, un botón "Ver los 14 gastos del mes" los despliega todos.
- **NOR-8.** "Corregir" convierte la fila en un formulario con los mismos tres campos y las acciones "Guardar cambios", "Eliminar gasto" y "Cancelar".
- **NOR-9.** "Eliminar gasto" pide confirmación. Después muestra "Gasto eliminado. Deshacer" hasta la siguiente acción.
- **NOR-10.** Estado vacío: "Todavía no anotas gastos este mes. Usa el formulario de arriba."

#### Ajustes

Sin pantalla de referencia. Usar los mismos componentes y tamaños.

- **AJU-1.** Categorías: cambiar el nombre y ocultar o mostrar cada una. No se borran. Debe haber entre 2 y 8 visibles. Las categorías iniciales son Supermercado, Salud, Transporte, Casa, Salidas, Familia, Ropa y Otro, con los íconos de las pantallas de referencia.
- **AJU-2.** Respaldo: "Descargar respaldo" baja un archivo con todos los datos. "Restaurar desde un respaldo" reemplaza todos los datos por los del archivo, con confirmación. Se muestra la fecha del último respaldo.
- **AJU-3.** Versión de la app.

#### Cartola

Referencia: `design/pantallas/cartola.html`. Especificación completa en `docs/cartola.md`. Se construye en la fase 6.

### 7.2 Consideraciones futuras

No construir ahora. Sirven para no cerrar puertas en el modelo de datos.

- Importar la cartola del banco (fase 6).
- Gastos recurrentes con otra frecuencia.
- Sugerir la categoría según gastos anteriores.
- Vista anual.

## 8. Flujos clave

1. **Anotar un gasto.** Resumen, "Agregar gasto", monto, categoría, Enter. El gasto queda primero en la tabla.
2. **Anotar varios seguidos.** Después de guardar, el cursor ya está en el monto. Repite.
3. **Corregir o eliminar.** Tabla, "Corregir", cambia, "Guardar cambios" o "Eliminar gasto".
4. **Marcar una cuenta pagada.** Gastos recurrentes, clic en la casilla, ajusta el monto si cambió.
5. **Agregar o quitar un gasto recurrente.** "Agregar gasto recurrente" o "Editar lista".
6. **Revisar el mes.** Resumen, clic en una categoría, mira sus gastos.
7. **Respaldar.** Ajustes, "Descargar respaldo".

## 9. Lógica clave

Las fórmulas y reglas de fechas están en `docs/arquitectura.md`. Lo esencial:

- Los montos son enteros en pesos chilenos.
- Total del mes = recurrentes pagados + no recurrentes.
- Un gasto recurrente cuenta como gastado solo cuando está pagado.
- Las fechas se guardan como texto local (`2026-11-16`), sin horas ni zonas horarias.

## 10. Criterios de aceptación

Formato: Dado, Cuando, Entonces. Cada criterio se verifica en la app andando.

### Transversales

- **T-1 Montos.** Dado cualquier monto en pantalla, entonces se muestra con signo peso, sin decimales y con punto de miles (`$1.250.000`).
- **T-2 Tamaños.** Dado cualquier pantalla al 100 % de zoom, entonces ningún texto mide menos de 13 px y todo control clicable mide 48 px de alto o más.
- **T-3 Zoom.** Dado un zoom de 200 % en una ventana de 1280 px de ancho, entonces no hay contenido cortado ni desplazamiento horizontal de la página. Las tablas pueden desplazarse dentro de su caja.
- **T-4 Teclado.** Dado que uso solo Tab, Enter y Espacio, entonces puedo hacer todas las acciones y el foco siempre se ve.
- **T-5 Persistencia.** Dado que anoté datos y cerré la app, cuando la vuelvo a abrir, entonces veo los mismos datos.
- **T-6 Privacidad.** Dado que uso cualquier pantalla, entonces el navegador no hace solicitudes a otros dominios.
- **T-7 Color.** Dado cualquier estado (pagado, vencido, seleccionado, error), entonces se entiende sin distinguir colores.

### Fase 1: Gastos recurrentes

- **REC-A1.** Dado que tengo 6 gastos recurrentes y abro un mes por primera vez, entonces veo 6 filas ordenadas por día de vencimiento, sin marcar, cada una con su último monto conocido.
- **REC-A2.** Dado una fila sin marcar con monto $18.000, cuando hago clic en su casilla, entonces queda marcada, su estado dice "Pagado", "Pagado" sube $18.000, "Por pagar" baja $18.000, el contador avanza en uno y la fila no cambia de posición.
- **REC-A3.** Dado una fila marcada, cuando hago clic en su casilla, entonces vuelve a su estado anterior y los totales también.
- **REC-A4.** Dado cualquier fila, cuando cambio su monto, entonces los totales se recalculan de inmediato y el valor sigue ahí al reabrir la app.
- **REC-A5.** Dado que borro el monto de una fila, entonces muestra "Falta el monto" con ícono de alerta y cuenta como $0.
- **REC-A6.** Dado que hoy es 21, "Agua" vence el 20 y no está pagada, entonces su estado dice "Venció el 20" con ícono y estilo de alerta.
- **REC-A7.** Dado que agrego "Netflix" en noviembre, entonces aparece en noviembre y en los meses siguientes, y no en octubre. Si dejo el nombre vacío, veo "Escribe un nombre" y no se guarda.
- **REC-A8.** Dado que quito "Gas" en noviembre sin haberlo pagado y confirmo, entonces desaparece de noviembre en adelante, sigue en octubre y veo "Se quitó Gas. Deshacer". Si hago clic en "Deshacer", vuelve.
- **REC-A9.** Dado que todas las filas están marcadas, entonces "Por pagar" muestra $0 y "Todo pagado" sin estilo de alerta.
- **REC-A10.** Dado que no tengo gastos recurrentes, entonces veo el estado vacío y el botón "Agregar gasto recurrente".
- **REC-A11.** Dado un gasto con vencimiento el día 31, cuando veo un mes de 30 días, entonces vence el 30.

### Fase 2: Gastos no recurrentes

- **NOR-A1.** Dado que escribo 12500, dejo "Hoy" y elijo "Supermercado", cuando hago clic en "Guardar gasto" o presiono Enter, entonces el gasto aparece como primera fila con la fecha de hoy, el total y la cantidad del mes se actualizan, el formulario queda vacío con "Hoy" seleccionado y el cursor vuelve al monto.
- **NOR-A2.** Dado que el monto está vacío o es cero, cuando intento guardar, entonces veo "Escribe cuánto gastaste" junto al campo y no se guarda nada.
- **NOR-A3.** Dado que no elegí categoría, cuando intento guardar, entonces veo "Elige en qué fue" y no se guarda nada.
- **NOR-A4.** Dado que elijo "Otro día", entonces aparece un selector de fecha que no acepta fechas futuras. Al guardar un gasto de octubre, la vista cambia a octubre y el gasto está en la tabla.
- **NOR-A5.** Dado una fila, cuando hago clic en "Corregir" y cambio el monto, entonces la fila y los totales muestran el valor nuevo.
- **NOR-A6.** Dado que elimino un gasto y confirmo, entonces desaparece, los totales bajan y veo "Gasto eliminado. Deshacer". Si hago clic en "Deshacer", vuelve con los mismos datos.
- **NOR-A7.** Dado que hago clic dos veces seguidas en "Guardar gasto", entonces se guarda un solo gasto.
- **NOR-A8.** Dado que intento escribir más de 8 dígitos o caracteres que no son dígitos, entonces el campo no los acepta.
- **NOR-A9.** Dado un mes con 14 gastos, entonces veo los 10 más recientes y el botón "Ver los 14 gastos del mes". Al hacer clic, veo los 14.
- **NOR-A10.** Dado un mes sin gastos, entonces veo el estado vacío.

### Fase 3: Resumen

- **RES-A1.** Dado recurrentes pagados por $210.000 y no recurrentes por $277.500, entonces el total dice $487.500.
- **RES-A2.** Dado que hoy es 16 de noviembre, llevo $487.500 y al 16 de octubre llevaba $512.000, entonces leo "Vas $24.500 por debajo de octubre a esta misma fecha."
- **RES-A3.** Dado que el mes anterior no tiene datos, entonces no se muestra frase de comparación.
- **RES-A4.** Dado 3 recurrentes sin pagar por $87.000, entonces "Te falta pagar" dice $87.000 y "Ver los 3 gastos pendientes". Al hacer clic, llego a Gastos recurrentes en el mismo mes.
- **RES-A5.** Dado gastos en cinco categorías, entonces veo seis filas (recurrentes más cinco), de mayor a menor, y la barra más larga ocupa todo el ancho.
- **RES-A6.** Dado que hago clic en "Supermercado", entonces se despliegan sus gastos con fecha y monto. Si hago clic en "Salud", se cierra la primera y se abre la segunda.
- **RES-A7.** Dado datos en seis meses, entonces "Mes a mes" muestra los cuatro más recientes y el mes en curso dice "hasta hoy".
- **RES-A8.** Dado que hago clic en "Agregar gasto", entonces llego a Gastos no recurrentes con el cursor en el monto.
- **RES-A9.** Dado un mes sin gastos, entonces veo el estado vacío, sin tarjetas ni barras en cero.

### Fase 4: Ajustes y respaldo

- **AJU-A1.** Dado que cambio "Salidas" por "Restaurantes", entonces el nombre nuevo aparece en el formulario, la tabla y el Resumen, también en gastos antiguos.
- **AJU-A2.** Dado que oculto "Ropa", entonces deja de aparecer en el formulario y los gastos antiguos de Ropa siguen mostrándola.
- **AJU-A3.** Dado que solo quedan 2 categorías visibles, entonces no puedo ocultar otra y veo por qué.
- **AJU-A4.** Dado que hago clic en "Descargar respaldo", entonces se descarga `mis-gastos-respaldo-2026-11-17.json` y la fecha del último respaldo se actualiza.
- **AJU-A5.** Dado un respaldo válido, cuando lo restauro y confirmo, entonces todos los datos son los del archivo.
- **AJU-A6.** Dado un archivo que no es un respaldo, cuando intento restaurarlo, entonces veo "Este archivo no es un respaldo de Mis gastos." y mis datos no cambian.
- **AJU-A7.** Dado que el último respaldo tiene más de 30 días, entonces el Resumen muestra el aviso de respaldo.

### Fase 5: Publicación e instalación

- **PUB-A1.** Dado que ejecuto `npm run build`, entonces termina sin errores y genera `dist/`.
- **PUB-A2.** Dado que la app está instalada en el Dock del Mac, cuando la abro sin conexión, entonces funciona completa.
- **PUB-A3.** Dado que reinicio el Mac, entonces los datos siguen ahí.
- **PUB-A4.** Dado que publico una versión nueva, entonces los datos existentes no se pierden.

## 11. Plan de lanzamiento e hitos

| Fase | Qué incluye | Hecho cuando |
|---|---|---|
| 0. Base | Proyecto, barra lateral, mes seleccionado, variables de diseño, almacenamiento, datos de ejemplo solo en desarrollo | La app abre, navega entre pestañas vacías y pasa T-1 a T-7 |
| 1. Gastos recurrentes | REC-1 a REC-11 | Pasa REC-A1 a REC-A11 |
| 2. Gastos no recurrentes | NOR-1 a NOR-10 | Pasa NOR-A1 a NOR-A10 |
| 3. Resumen | RES-1 a RES-8 | Pasa RES-A1 a RES-A9 |
| 4. Ajustes y respaldo | AJU-1 a AJU-3 y RES-9 | Pasa AJU-A1 a AJU-A7 |
| 5. Publicación | Sitio estático, uso sin conexión, instalación en el Dock | Pasa PUB-A1 a PUB-A4 en el Mac de mi papá |
| Prueba real | Dos o tres semanas de uso | Se revisan las métricas de la sección 4 |
| 6. Cartola | `docs/cartola.md` | Criterios de ese documento |

## 12. Preguntas abiertas

1. **Banco y formato de la cartola.** Sin eso no se puede partir la fase 6.
2. **Tarjeta o efectivo.** Si paga casi todo con tarjeta, la fase 6 se adelanta y va justo después de la fase 2.
3. **Hosting.** Dónde se publica el sitio estático. Decidir en la fase 5.
4. **Categorías definitivas.** Revisar las ocho con él antes de la prueba real.
5. **Fecha después de guardar.** Hoy vuelve a "Hoy" en cada gasto. Validar con él si prefiere que se mantenga el día elegido cuando se pone al día.
6. **Nombre de la app.**
