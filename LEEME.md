# Cómo partir con Claude Code

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `CLAUDE.md` | Instrucciones que Claude Code lee al inicio de cada sesión. |
| `docs/brief.md` | Qué hay que construir: alcance, pantallas, reglas, criterios de aceptación y fases. |
| `docs/arquitectura.md` | Cómo construirlo: stack, modelo de datos, cálculos y riesgos. |
| `docs/cartola.md` | Especificación de la importación de cartola (fase 6). |
| `design/pantallas/` | Las cuatro pestañas como páginas HTML de referencia. Se abren con doble clic. |
| `design/tokens.css` | Colores, tipografía, espaciado y radios. |
| `fixtures/cartolas/` | Aquí va la cartola real de prueba cuando llegues a la fase 6. |

## Pasos

1. Descomprime esta carpeta en tu Mac, por ejemplo en `Documentos/app-gastos`.
2. Abre la app de Claude para escritorio y entra a la pestaña Code. La app ya incluye Claude Code.
3. Elige "Local", haz clic en "Select folder" y selecciona la carpeta.
4. Pega el primer mensaje de abajo.
5. Revisa el plan que te proponga, apruébalo y avanza fase por fase.

Por defecto, Claude Code propone cada cambio y espera tu aprobación antes de aplicarlo.

Claude Code no necesita Node.js para funcionar, pero este proyecto sí lo usa para correr y probar la app. Si no lo tienes instalado, pídele a Claude Code que te guíe.

## Primer mensaje

```
Lee CLAUDE.md, todo lo que hay en docs/ y las pantallas de design/pantallas/. No escribas código todavía.

Primero dime, en no más de diez líneas, qué entendiste que hay que construir. Después lista las dudas y las contradicciones que encuentres entre el brief y las pantallas. Al final propón el plan de la fase 0 con los archivos que vas a crear.

Espera mi aprobación antes de empezar.
```

## Mensaje para cada fase

Cambia N por el número de la fase.

```
Implementa la fase N de docs/brief.md. Antes de empezar, muéstrame el plan.

Al terminar, corre las pruebas, abre la app, revisa uno por uno los criterios de aceptación de la fase y dime cuáles pasan y cuáles no.
```

## Mensaje para instalarla en el Mac de mi papá (fase 5)

```
Vamos con la fase 5 de docs/brief.md. Propón dos opciones de hosting estático y recomienda una. Después dame los pasos, uno por uno, para publicar el sitio e instalarlo en el Dock desde Safari.
```

## Antes de la fase 6 (cartola)

1. Baja una cartola real del banco de tu papá, en el formato que él vaya a usar.
2. Guárdala en `fixtures/cartolas/`. Esa carpeta no se sube al repositorio.
3. Dile a Claude Code qué banco es y pídele que lea `docs/cartola.md`.

## Decisiones que siguen abiertas

Están al final de `docs/brief.md`. Las dos que más importan: el banco de tu papá y si paga más con tarjeta o con efectivo.
