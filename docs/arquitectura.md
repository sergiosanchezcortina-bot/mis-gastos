# Arquitectura técnica: Mis gastos

Complementa a `docs/brief.md`. Si algo de aquí contradice al brief en lo que la app hace, manda el brief.

## 1. Contexto del sistema

- Una sola aplicación de página única que corre completa en el navegador.
- Un usuario, un computador. No hay servidor propio, base de datos remota ni cuentas.
- El hosting solo entrega los archivos estáticos de la app. Nunca recibe datos.
- Sin integraciones de terceros. Sin analítica. Sin fuentes ni scripts cargados desde otros dominios.

```
Mac de mi papá
  Safari (app instalada en el Dock)
    Interfaz (React)
    Dominio (cálculos puros)
    Datos (IndexedDB)
    Respaldo (archivo JSON que él descarga y guarda)
Hosting estático: solo sirve HTML, CSS y JS
```

## 2. Arquitectura de componentes

Un solo proyecto, sin microservicios. Cuatro capas con una regla: la interfaz no calcula y el dominio no sabe de la interfaz ni del almacenamiento.

| Capa | Carpeta sugerida | Responsabilidad |
|---|---|---|
| Interfaz | `src/pantallas`, `src/componentes` | Pantallas y componentes. Sin lógica de negocio. |
| Dominio | `src/dominio` | Funciones puras: totales, comparaciones, estados, fechas, formato de montos. Todo con pruebas. |
| Datos | `src/datos` | Lectura y escritura en IndexedDB. Migraciones de esquema. |
| Respaldo | `src/respaldo` | Exportar e importar el archivo JSON. |
| Importación (fase 6) | `src/cartola` | Lectores por banco, clasificación y reglas. |

### 2.1 Modelo de datos

Montos: enteros en pesos chilenos. Fechas: texto `AAAA-MM-DD` en hora local. Meses: texto `AAAA-MM`. Identificadores: UUID.

```ts
type Categoria = {
  id: string;
  nombre: string;
  icono: string;        // clave de un set fijo de íconos
  visible: boolean;
  orden: number;
};

// Plantilla de un gasto que se repite cada mes
type GastoRecurrente = {
  id: string;
  nombre: string;
  diaVencimiento: number | null;   // 1 a 31
  desde: string;                   // primer mes en que aplica, AAAA-MM
  hasta: string | null;            // último mes en que aplica; null = sigue vigente
  palabrasClave: string[];         // fase 6: para reconocerlo en la cartola
  creadoEn: string;                // fecha y hora ISO
};

// Una fila por gasto recurrente y por mes
type PagoRecurrente = {
  id: string;
  gastoRecurrenteId: string;
  mes: string;                     // AAAA-MM
  monto: number | null;            // null = falta el monto
  pagado: boolean;
  fechaPago: string | null;        // AAAA-MM-DD
  origen: 'manual' | 'cartola';
  movimientoId: string | null;     // fase 6
};

// Gasto no recurrente
type Gasto = {
  id: string;
  fecha: string;                   // AAAA-MM-DD
  monto: number;                   // entero mayor que 0
  categoriaId: string;
  descripcion: string | null;      // texto libre opcional, hasta 60 caracteres (esquema 2)
  origen: 'manual' | 'cartola';
  glosa: string | null;            // fase 6: texto de la cartola
  movimientoId: string | null;     // fase 6
  creadoEn: string;
  actualizadoEn: string;
};

// Comprobante de un pago recurrente (esquema 2). Uno por pago como máximo.
type Comprobante = {
  pagoId: string;                  // clave: id del PagoRecurrente
  nombre: string;                  // nombre del archivo
  tipo: string;                    // tipo MIME; puede venir vacío
  tamano: number;                  // bytes, hasta 10 MB
  datos: ArrayBuffer;              // el archivo, guardado en IndexedDB
  agregadoEn: string;              // fecha y hora ISO
};

type Ajustes = {
  versionEsquema: number;
  ultimoRespaldo: string | null;   // fecha y hora ISO
};
```

La fase 6 agrega `Movimiento`, `Regla` y `Carga`. Están en `docs/cartola.md`.

### 2.2 Reglas de cálculo

Para un mes `m`:

- `totalRecurrentes(m)` = suma de `monto` de los `PagoRecurrente` de `m`. Un monto `null` cuenta como 0.
- `pagadoRecurrentes(m)` = suma de `monto` de los que tienen `pagado = true`.
- `porPagar(m)` = `totalRecurrentes(m)` menos `pagadoRecurrentes(m)`.
- `noRecurrentes(m)` = suma de `monto` de los `Gasto` con `fecha` en `m`.
- `gastado(m)` = `pagadoRecurrentes(m)` + `noRecurrentes(m)`.
- `gastadoHasta(m, d)` = gastos con `fecha` hasta el día `d` de `m`, más pagos recurrentes pagados con `fechaPago` hasta el día `d` de `m`.

Comparación del Resumen:

- Mes actual, con `d` = día de hoy y `p` = mes anterior: `gastadoHasta(m, d)` menos `gastadoHasta(p, min(d, últimoDía(p)))`.
- Mes pasado: `gastado(m)` menos `gastado(p)`.
- Si `p` no tiene ningún dato, no hay comparación.

Filas mensuales de gastos recurrentes:

- Al abrir la app y al cambiar de mes, para cada `GastoRecurrente` vigente en ese mes (`desde <= mes` y `hasta` vacío o `>= mes`) que no tenga `PagoRecurrente`, se crea uno con `pagado = false` y `monto` = el monto no vacío más reciente de ese gasto en meses anteriores, o `null` si no hay.
- Nunca se crean filas para meses futuros.
- Quitar un gasto en el mes `m`: si su fila de `m` no está pagada, se borra y `hasta` queda en el mes anterior a `m`. Si está pagada, `hasta` queda en `m`.

Fecha de pago:

- Al marcar como pagado en el mes actual, `fechaPago` = hoy.
- Al marcar en un mes pasado, `fechaPago` = último día de ese mes.
- Al desmarcar, `fechaPago` = `null`. El monto se conserva.

Vencimiento:

- Si `diaVencimiento` es mayor que los días del mes, vence el último día.
- Una fila está vencida si no está pagada y hoy es posterior a su vencimiento, o si el mes ya terminó.

### 2.3 Respaldo

Archivo `mis-gastos-respaldo-AAAA-MM-DD.json`:

```json
{
  "app": "mis-gastos",
  "versionEsquema": 2,
  "exportadoEn": "2026-11-17T21:30:00",
  "categorias": [],
  "gastosRecurrentes": [],
  "pagosRecurrentes": [],
  "gastos": [],
  "comprobantes": [],
  "ajustes": {}
}
```

- Desde la versión 2, cada comprobante va con su archivo en base64 (`datosBase64` en lugar de `datos`). Por eso el respaldo puede pesar varios MB.
- Un respaldo de la versión 1 se lee con `descripcion: null` en cada gasto y sin comprobantes.

- Restaurar valida `app` y `versionEsquema` antes de tocar nada.
- Restaurar reemplaza todos los datos en una sola transacción. Si falla, no cambia nada.
- Un respaldo de una versión anterior del esquema se migra al cargarlo.

## 3. Stack y por qué

| Decisión | Motivo |
|---|---|
| Vite + React + TypeScript estricto | Estándar, bien soportado y con tipos para la lógica de montos y fechas. |
| Sin backend | Un usuario, un computador. Menos piezas, cero costo de servidores y los datos no salen del Mac. |
| IndexedDB con una capa delgada (`idb`) | Guarda datos estructurados y soporta transacciones. `localStorage` no sirve para esto. |
| CSS propio con variables | Cuatro pantallas no justifican una librería de componentes. Control total de tamaños. |
| Barras con HTML, sin librería de gráficos | Son rectángulos con texto. Más simples de hacer accesibles. |
| DM Sans dentro del proyecto | Funciona sin conexión y evita llamadas a otros dominios. |
| Service worker (por ejemplo `vite-plugin-pwa`) | La app abre sin conexión después de la primera carga. |
| Vitest + Testing Library | Pruebas rápidas de dominio y de pantallas. |

Para la fase 6: SheetJS para Excel y `pdfjs-dist` para PDF, ambos corriendo en el navegador.

Infraestructura: un hosting de sitios estáticos. Sin contenedores. La publicación puede ser un comando o una integración simple con el repositorio. Se decide en la fase 5.

## 4. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El navegador puede borrar los datos locales de un sitio poco usado | Instalar la app en el Dock, pedir almacenamiento persistente con `navigator.storage.persist()`, respaldo a archivo con recordatorio mensual. Verificar en el Mac real en la fase 5. |
| Pérdida de datos por error del usuario | Confirmación en cada eliminación, "Deshacer" visible y respaldo. |
| Totales incorrectos | Dominio en funciones puras con pruebas. Montos enteros, sin decimales ni punto flotante. |
| Errores de fecha por zona horaria | Fechas como texto local. No usar `toISOString()` para fechas de gastos. Pruebas en cambio de mes y de año. |
| Una actualización rompe datos existentes | `versionEsquema` y migraciones probadas con un respaldo real antes de publicar. |
| La app crece y deja de ser simple | Regla 1 de `CLAUDE.md`: lo que no está en el brief no se construye. |
| Regresión de accesibilidad | Revisar T-2, T-3, T-4 y T-7 al cierre de cada fase. |
| Lector de cartola frágil (fase 6) | Un lector por banco, pruebas con archivos reales y mensaje claro cuando no se puede leer. |

Costos: no hay servidores propios. El único costo posible es el hosting estático.
