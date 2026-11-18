# Instalar Mis gastos en el Mac de tu papá

Esta guía es para ti, para hacerla sentado en su computador. Toma unos 20 minutos. Necesitas la dirección de la app que quedó al publicar (`docs/publicar.md`), por ejemplo `https://TU-USUARIO.github.io/mis-gastos/`.

## 1. Revisa la versión de macOS

Menú Apple → "Acerca de esta Mac".

- **macOS Sonoma (14) o más nuevo:** sigue con el paso 2.
- **Más antiguo:** la opción de agregar la app al Dock no existe y esta guía no sirve tal cual. Avísale a Claude Code qué versión tiene antes de seguir.

Revisa también que Safari esté al día: Ajustes del Sistema → General → Actualización de software.

## 2. Agrega la app al Dock

1. Abre Safari, entra a la dirección de la app y espera a que cargue completa.
2. En el menú de Safari, elige **Archivo → Agregar al Dock** (o "Añadir al Dock", según el idioma del Mac).
3. Deja el nombre "Mis gastos" y haz clic en **Agregar**.
4. Aparece el ícono verde con el signo peso en el Dock y la app se abre en su propia ventana.
5. **Cierra la pestaña de Safari.** Desde ahora tu papá usa solo el ícono del Dock.

> **Importante:** la app del Dock guarda sus datos aparte de Safari. Lo que se anote en una pestaña de Safari no aparece en la app del Dock, ni al revés. Si alguien ya había anotado algo en Safari, en Safari haz "Descargar respaldo" y en la app del Dock haz "Restaurar desde un respaldo".

## 3. Activa el uso con teclado

Por defecto, en el Mac la tecla Tab no pasa por los botones de una página. Para que tu papá pueda usar la app solo con el teclado:

1. Ajustes del Sistema → Teclado → activa **Navegación con teclado**.
2. En Safari: Safari → Ajustes → Avanzado → activa **Pulsa Tab para resaltar cada ítem de una página web**.
3. Abre la app del Dock y presiona Tab varias veces. Un borde verde tiene que ir pasando por cada botón del menú, el selector de mes y los botones de la pantalla.

Si el borde verde se salta los botones, anótalo en la lista del paso 5 para revisarlo con Claude Code.

## 4. Primer uso

1. Abre la app desde el Dock. Parte en Resumen, con el mensaje "Todavía no hay gastos este mes."
2. Si tu papá ya había usado la app en otro computador, restaura su respaldo: Ajustes → Restaurar desde un respaldo.
3. Con él al lado, anota sus gastos recurrentes en "Gastos recurrentes" → "Agregar gasto recurrente".
4. Revisen juntos las ocho categorías en Ajustes. Esto también responde la pregunta abierta 4 del brief.
5. Hagan juntos el primer respaldo: Ajustes → **Descargar respaldo**. El archivo queda en la carpeta Descargas. Enséñale dónde queda o muévelo a una carpeta que él reconozca.

## 5. Lista para revisar en su Mac

Marca cada punto y avísale a Claude Code lo que no funcione.

**Criterios de la fase 5:**

- [ ] **PUB-A2, sin conexión.** Apaga el wifi, cierra la app con Cmd+Q y ábrela desde el Dock. Tiene que abrir completa, con sus datos, y dejar anotar un gasto. Después vuelve a encender el wifi.
- [ ] **PUB-A3, reinicio.** Anota un gasto de prueba, reinicia el Mac y abre la app. El gasto tiene que seguir ahí. Después elimínalo.
- [ ] **PUB-A4, versión nueva.** Cuando se publique la primera actualización, abre la app, ciérrala, vuelve a abrirla y revisa en Ajustes que cambió el número de versión y que los datos siguen.

**Pendientes de Safari de las fases anteriores:**

- [ ] **"Otro día".** En Gastos no recurrentes, "Otro día" muestra un selector de fecha. ¿Tu papá puede elegir una fecha sin ayuda? (duda 7)
- [ ] **No acepta fechas futuras.** El selector de fecha no deja elegir mañana.
- [ ] **Monto, categoría y Enter.** Escribir un monto, hacer clic en una categoría y presionar Enter guarda el gasto.
- [ ] **Doble clic.** Un doble clic en "Guardar gasto" guarda un solo gasto.
- [ ] **El respaldo.** "Descargar respaldo" deja el archivo `mis-gastos-respaldo-AAAA-MM-DD.json` en Descargas.
- [ ] **Restaurar.** "Restaurar desde un respaldo" abre el selector de archivos del Mac y restaura ese archivo.
- [ ] **Comprobante (fase 7).** En Gastos recurrentes, "Agregar comprobante" abre el selector de archivos. Sube un pantallazo y un PDF: los dos tienen que verse en la ventana al hacer clic en "Comprobante". Si el PDF sale en blanco, avísale a Claude Code.
- [ ] **Respaldo con comprobante.** Con un comprobante subido, "Descargar respaldo" y luego "Restaurar desde un respaldo" lo deja igual.
- [ ] **Calendario (fase 8).** La grilla del mes se lee bien con el zoom que él usa y cada día se puede elegir con un clic.
- [ ] **Gasto por hacer.** "Lo voy a hacer" con "Otro día" abre el selector de fecha y no deja elegir un día del mes siguiente.
- [ ] **Tamaños.** Con el zoom que él usa (Cmd + y Cmd −), nada se corta ni hay que mover la página hacia el lado.

## 6. Qué decirle a tu papá

- La app se abre con el ícono verde del Dock, no desde Safari.
- Sus datos quedan solo en este computador. Si el computador se pierde o se daña, lo único que los salva es el respaldo.
- Cuando la app le avise "Hace más de una semana que no haces un respaldo.", que haga clic en "Hacer respaldo ahora".
