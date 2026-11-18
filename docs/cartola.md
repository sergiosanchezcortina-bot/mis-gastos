# Importación de cartola (fase 6)

Estado: especificación lista. Bloqueada hasta tener el banco y un archivo real en `fixtures/cartolas/`.

Referencia visual: `design/pantallas/cartola.html`.

## 1. Qué resuelve

La cartola trae los gastos pagados con tarjeta o transferencia. Subirla evita anotarlos a mano y cubre lo que se olvidó anotar. El formulario manual queda para el efectivo.

## 2. Flujo

La pestaña tiene tres bloques numerados.

1. **Sube la cartola.** Zona para arrastrar el archivo y botón "Elegir archivo". Las dos vías hacen lo mismo. Texto de ayuda: "Sirve en Excel o PDF. Si subes la misma cartola dos veces, no se duplica nada." Ajustar los formatos al banco real.
2. **Lo que se encontró.** Total de gastos y período, más cuatro líneas:
   - "9 ya los tenías anotados"
   - "3 eran gastos recurrentes y quedaron pagados"
   - "19 se clasificaron solos"
   - "7 faltan por revisar"
   
   Usar singular cuando corresponda. Las líneas en cero no se muestran. Si no hay nada nuevo: "No había gastos nuevos en esta cartola."
3. **Revisa los que faltan.** Un gasto a la vez, con glosa, fecha y monto. Opciones: un botón por categoría visible, "Es un gasto recurrente" y "No es un gasto". Al responder, pasa al siguiente ("Gasto 2 de 7"). Al terminar: "Listo. No queda nada por revisar."

Los bloques 2 y 3 aparecen después de subir un archivo. Si quedan gastos por revisar y él sale de la pestaña, siguen ahí al volver, y el Resumen muestra "Tienes 7 gastos de la cartola por revisar." con un enlace a esta pestaña.

## 3. Qué se lee del archivo

De cada movimiento solo se usa: fecha, glosa (descripción), monto y si es cargo o abono. Si el archivo trae número de operación o documento, se usa para identificar el movimiento.

No se guarda nunca: número de cuenta, RUT, nombre del titular, saldos ni el archivo original. El archivo se lee en el navegador y no se envía a ningún lado.

## 4. Proceso

Los abonos se descartan. Cada cargo pasa por estos pasos, en orden, y se queda en el primero que aplique:

| Paso | Condición | Resultado | Cuenta en |
|---|---|---|---|
| 1 | El movimiento ya se importó antes | Se salta | Nada |
| 2 | Coincide con una regla de tipo "ignorar" | No se crea gasto | Nada |
| 3 | Coincide con un gasto recurrente | Ese gasto queda pagado en el mes del movimiento, con el monto y la fecha de la cartola | Recurrentes |
| 4 | Coincide con un gasto anotado a mano | Se enlazan. No se crea otro gasto | Ya anotados |
| 5 | Coincide con una regla de categoría | Se crea un gasto no recurrente con esa categoría y origen "cartola" | Clasificados solos |
| 6 | Nada de lo anterior | Queda pendiente de revisión | Por revisar |

El total de "gastos" que se muestra es la suma de los pasos 3 a 6.

Detalle de cada coincidencia:

- **Ya importado.** Cada movimiento tiene un identificador estable: número de operación si existe. Si no, fecha, monto, glosa normalizada y un contador para líneas idénticas dentro del mismo día.
- **Gasto recurrente.** La glosa normalizada contiene alguna de las `palabrasClave` del gasto. Si ese mes ya estaba pagado a mano, se actualizan monto y fecha con los de la cartola. Si llega un segundo movimiento del mismo gasto en el mismo mes, queda pendiente de revisión.
- **Gasto anotado a mano.** Mismo monto exacto, fecha a 3 días o menos de distancia y sin enlace previo. Si hay varios candidatos, gana el de fecha más cercana.
- **Regla.** La glosa normalizada contiene el patrón de la regla. Las reglas del usuario ganan a las iniciales. Entre dos del mismo origen, gana el patrón más largo.

Normalización de la glosa: mayúsculas, sin tildes, espacios simples, sin secuencias de 3 o más dígitos y sin prefijos genéricos del banco (por ejemplo "COMPRA", "PAGO", "NACIONAL"). La lista de prefijos se ajusta con el archivo real.

## 5. Revisión y aprendizaje

Cada respuesta crea una regla con la glosa normalizada como patrón:

- Elige una categoría: se crea el gasto y una regla de categoría.
- "Es un gasto recurrente": muestra la lista de gastos recurrentes para elegir uno. Ese gasto queda pagado en el mes del movimiento y la glosa normalizada se agrega a sus `palabrasClave`. Si ese mes ya estaba pagado, el monto se suma.
- "No es un gasto": no se crea nada y se guarda una regla de tipo "ignorar". Ejemplos: traspasos entre cuentas propias, pago de la tarjeta de crédito, giros en cajero.

Bajo las opciones: "La próxima vez se clasifica igual."

### Reglas iniciales

Punto de partida. Ajustar con las glosas reales del archivo.

| Tipo | Destino | Patrones |
|---|---|---|
| Categoría | Supermercado | SUPERMERCADO, JUMBO, LIDER, UNIMARC, SANTA ISABEL, TOTTUS |
| Categoría | Salud | FARMACIA, CRUZ VERDE, SALCOBRAND, AHUMADA, CLINICA, LABORATORIO |
| Categoría | Transporte | COPEC, SHELL, PETROBRAS, ARAMCO, ESTACIONAMIENTO, AUTOPISTA |
| Categoría | Casa | SODIMAC, EASY, FERRETERIA |
| Categoría | Salidas | RESTAURANT, CAFE |
| Ignorar | No es un gasto | GIRO, TRASPASO, PAGO TARJETA |

Los giros en cajero se ignoran porque ese efectivo se anota a mano cuando se gasta. Contarlos duplicaría el gasto.

## 6. Deshacer una carga

"Deshacer esta carga" pide confirmación y revierte todo lo que hizo la última carga: borra los gastos que creó, quita los enlaces con gastos manuales y devuelve los gastos recurrentes al estado que tenían. Las reglas aprendidas se conservan. Solo se puede deshacer la carga más reciente.

## 7. Modelo de datos

```ts
type Carga = {
  id: string;
  cargadaEn: string;          // fecha y hora ISO
  desde: string;              // AAAA-MM-DD del primer movimiento
  hasta: string;              // AAAA-MM-DD del último movimiento
  banco: string;
};

type Movimiento = {
  id: string;                 // identificador estable, ver sección 4
  cargaId: string;
  fecha: string;              // AAAA-MM-DD
  glosa: string;
  monto: number;              // entero positivo
  estado: 'recurrente' | 'yaAnotado' | 'clasificado' | 'pendiente' | 'ignorado';
  gastoId: string | null;
  pagoRecurrenteId: string | null;
  estadoPrevio: unknown;      // lo necesario para deshacer la carga
};

type Regla = {
  id: string;
  patron: string;             // glosa normalizada o palabra clave
  tipo: 'categoria' | 'ignorar';
  categoriaId: string | null;
  origen: 'inicial' | 'usuario';
  creadaEn: string;
};
```

`Carga`, `Movimiento` y `Regla` entran al respaldo. Subir `versionEsquema` y escribir la migración.

## 8. Lectores por banco

- Un módulo por banco y formato en `src/cartola/lectores/`, con dos funciones: `reconoce(archivo)` y `leer(archivo)`, que devuelve la lista de movimientos sin procesar.
- Partir con un solo banco: el del archivo en `fixtures/cartolas/`.
- Cada lector tiene pruebas contra su archivo real.
- Si ningún lector reconoce el archivo: "No pude leer este archivo. Revisa que sea la cartola que bajaste del sitio de tu banco." No cambia ningún dato.

## 9. Criterios de aceptación

- **CAR-A1.** Dado un archivo válido, cuando lo subo, entonces veo el total de gastos, el período y los conteos, y los conteos suman el total.
- **CAR-A2.** Dado que subo el mismo archivo por segunda vez, entonces leo "No había gastos nuevos en esta cartola." y ningún dato cambia.
- **CAR-A3.** Dado un gasto manual de $23.500 el día 16 y un cargo de $23.500 el día 17 en la cartola, entonces no se crea otro gasto y cuenta en "ya los tenías anotados".
- **CAR-A4.** Dado un cargo cuya glosa contiene una palabra clave de "Luz", entonces "Luz" queda pagado ese mes con el monto y la fecha de la cartola.
- **CAR-A5.** Dado un gasto por revisar, cuando elijo "Salud", entonces se crea el gasto, paso al siguiente y, en una carga posterior, una glosa igual se clasifica sola en Salud.
- **CAR-A6.** Dado un gasto por revisar, cuando elijo "No es un gasto", entonces no se crea nada y en una carga posterior esa glosa se ignora.
- **CAR-A7.** Dado un gasto por revisar, cuando elijo "Es un gasto recurrente" y selecciono "Gas", entonces "Gas" queda pagado ese mes y la próxima vez se reconoce solo.
- **CAR-A8.** Dado que quedan 7 por revisar y salgo de la pestaña, entonces al volver siguen los 7 y el Resumen muestra el aviso.
- **CAR-A9.** Dado que hago clic en "Deshacer esta carga" y confirmo, entonces los gastos, enlaces y pagos vuelven al estado anterior a la carga.
- **CAR-A10.** Dado un archivo que no es una cartola, entonces veo el mensaje de error y ningún dato cambia.
- **CAR-A11.** Dado que arrastro el archivo o uso "Elegir archivo", entonces el resultado es el mismo.
- **CAR-A12.** Dado cualquier carga, entonces en los datos guardados no hay número de cuenta, RUT, nombre ni saldos.
- **CAR-A13.** Dado un archivo que informa el total de cargos, entonces la suma de los cargos leídos es igual a ese total.

## 10. Decisiones del 17 de noviembre de 2026

Mandan sobre lo anterior donde se contradigan. Ajustar las secciones 2 a 9 al partir la fase.

- **Qué se sube.** El estado de cuenta de la **tarjeta de crédito**, en PDF, tal como se baja del banco. Lo sube el papá arrastrando el archivo o con "Elegir archivo".
- **Sin IA.** Todo el análisis corre en el navegador con reglas fijas (secciones 4 y 5). Nada se envía a internet.
- **Proponer y aceptar.** En vez de revisar uno por uno, la app muestra todo de una vez para aprobar:
  - "Parece que ya lo anotaste": cada cargo junto al gasto manual con el que calza, para confirmar.
  - "Gastos nuevos": cada cargo con la categoría propuesta, que se puede cambiar.
  - "Gastos recurrentes": los cargos que calzan con uno y quedan pagados.
  - Un botón agrega todo lo aprobado. "Deshacer esta carga" sigue disponible.
- **Sin clasificar.** Lo que no calza con ninguna regla se propone como "Otro", con el nombre del comercio como descripción y la marca de que vino de la tarjeta.
- **Cuotas.** Cada cuota es un gasto del mes en que se cobra.
- **Intereses, comisiones e impuestos.** Van a "Intereses y comisiones" (pendiente: confirmar si es una categoría nueva).
- **Pagos a la tarjeta y abonos.** No son gastos; se descartan.
- **Comprobación.** La suma de los cargos leídos debe ser igual al total facturado del estado de cuenta. Si no cuadra, no se carga nada.

## 11. Qué falta para partir

1. El banco y el formato en que se baja la cartola.
2. Un archivo real en `fixtures/cartolas/`.
3. Confirmar si se sube la cartola de la cuenta, la de la tarjeta de crédito o ambas. Si son ambas, el pago de la tarjeta desde la cuenta debe ignorarse para no contar dos veces.
