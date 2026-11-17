# Publicar Mis gastos

Cómo poner la app en internet la primera vez y cómo publicar una versión nueva. El sitio solo entrega los archivos de la app. Los datos de tu papá quedan en su Mac y nunca pasan por el hosting.

## Antes de empezar: la dirección es para siempre

Safari guarda los datos de cada sitio según su dirección. Si un día la app pasa a otra dirección (otro nombre de repositorio, otro usuario de GitHub u otro hosting), la app nueva parte vacía. Si eso pasa, los datos se recuperan con un respaldo: "Descargar respaldo" en la dirección vieja y "Restaurar desde un respaldo" en la nueva.

Por eso conviene elegir bien el nombre del repositorio desde el principio. En esta guía es `mis-gastos`.

## La primera vez (GitHub Pages)

1. **Crea el repositorio.** En github.com, "New repository", con estas opciones:
   - Nombre: `mis-gastos`.
   - Visibilidad: **Public**. En el plan gratis, Pages solo funciona con repositorios públicos. Se ve el código, no hay datos personales y las cartolas de `fixtures/cartolas/` no se suben porque están en `.gitignore`.
   - Sin README, sin `.gitignore` y sin licencia, porque el proyecto ya los tiene.
2. **Sube el código.** Desde la carpeta del proyecto, cambiando `TU-USUARIO` por tu usuario de GitHub:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/mis-gastos.git
   ```

   ```bash
   git push -u origin main
   ```

3. **Activa Pages.** En el repositorio, Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. **Espera la primera publicación.**
   - En la pestaña Actions se ve el flujo "Publicar". Instala, corre las pruebas, compila y publica, y tarda un par de minutos.
   - Si la publicación partió antes de activar Pages y falló, entra al flujo y haz clic en "Re-run all jobs".
5. **Abre la app.** Queda en `https://TU-USUARIO.github.io/mis-gastos/`, y esa es la dirección que vas a usar en `docs/instalacion.md`.

## Publicar una versión nueva

1. Sube el número de versión en `package.json` (por ejemplo, de `1.0.0` a `1.0.1`). Es el número que se ve en Ajustes.
2. Haz commit y push a `main`.
3. GitHub corre las pruebas. **Si alguna falla, no publica nada** y el Mac de tu papá sigue con la versión anterior.
4. En el Mac de tu papá, la versión nueva se descarga sola la próxima vez que abra la app y queda activa la vez siguiente. Nunca se recarga mientras la está usando.

Para confirmar que llegó, abre la app, ciérrala, vuelve a abrirla y mira el número de versión en Ajustes.

### Si cambia el modelo de datos

Si una versión nueva cambia la forma en que se guardan los datos:

1. Sube `VERSION_ESQUEMA` en `src/datos/db.ts` y escribe la migración en `abrirBase`.
2. Escribe también la migración de respaldos en `migrar`, en `src/respaldo/importar.ts`.
3. Antes de publicar, pruébala con un respaldo real de tu papá (`docs/arquitectura.md`, riesgos).

## Probar la versión publicada en tu computador

```bash
npm run build
```

```bash
npm run preview
```

Esto abre la app como quedaría publicada, en `http://localhost:4173`, ya con el service worker para funcionar sin conexión. Los datos de esta dirección son distintos de los de `npm run dev`.

## Si prefieres Netlify

La app usa rutas relativas, así que funciona en cualquier dirección sin cambiar código:

1. Crea una cuenta en Netlify y elige "Add new site" → "Import an existing project", conectando el repositorio.
2. Comando de compilación: `npm test && npm run build`. Carpeta a publicar: `dist`.
3. No actives funciones que agreguen scripts al sitio, como analítica o formularios.

En ese caso, borra `.github/workflows/publicar.yml`.
