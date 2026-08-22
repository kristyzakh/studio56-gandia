# Medición — cómo se monta

Tres piezas, en este orden. La web ya está preparada para las tres; lo que queda
está en las consolas de Google y de Albato.

| Pieza | Para qué | Dónde se hace |
|---|---|---|
| GA4 | Comportamiento en la web y optimización de Google Ads | Consola de GA4 + una línea en `analytics.js` |
| Export a BigQuery | Historial crudo, sin muestrear, guardado para siempre | Consola de GA4 |
| Albato → Google Sheets | Recuento exacto de leads, a prueba de bloqueadores | Albato |

---

## 1 · GA4

1. Crea la propiedad GA4 y copia el **Measurement ID** (`G-XXXXXXXXXX`).
2. Pégalo en [`analytics.js`](analytics.js), primera constante del archivo:

   ```js
   var GA4_ID = 'G-XXXXXXXXXX';
   ```

3. Ejecuta `python3 bump-assets.py` y sube los cambios.

Con el ID vacío la web no carga nada de Google, no pone cookies y no enseña el
banner. En cuanto lo rellenas, se activan las tres cosas.

### Marcar conversiones

Los eventos ya usan los nombres recomendados por GA4, así que se marcan como
clave sin configuración extra: **Administrar → Eventos → marcar como evento clave**.

| Evento | Cuándo se dispara | ¿Conversión? |
|---|---|---|
| `generate_lead` | Clic en WhatsApp, y envío del formulario de reserva | **Sí** |
| `begin_checkout` | Clic en «Reservar» desde la barra del carrito | Sí |
| `cart_updated` | Añadir o quitar un servicio en Precios | No |
| `google_profile_click` | Clic en «Ver nuestra ficha en Google» | Opcional |
| `file_download` | Descarga de la lista de precios | No |
| `directions_click` | Clic en «Cómo llegar» | Opcional |
| `sticky_cta_click` | Clic en la barra fija «Pedir cita» | No |

`generate_lead` lleva `method` (`whatsapp` o `formulario_reserva`) y, en el
formulario, `value` en euros — así Ads optimiza por valor y no por volumen.

### Importar a Google Ads

Google Ads → Objetivos → Importar → Google Analytics 4. Trae `generate_lead`.
Esto es lo que hoy falta: la inversión en Ads no está medida.

---

## 2 · Export a BigQuery — el historial en la nube

Esto es lo que responde a «quiero mi histórico guardado en la nube». GA4 borra
el detalle a los 14 meses y sus informes van muestreados; BigQuery guarda **cada
evento, crudo, para siempre**, y se consulta con SQL.

**GA4 → Administrar → Exportaciones de datos → BigQuery → Vincular.**
Marca la exportación **diaria** (la de streaming se factura aparte y aquí no
hace falta).

Al volumen de Studio 56 esto entra de sobra en la capa gratuita de BigQuery.
Desde ahí se conecta Looker Studio y te montas el panel que quieras.

Merece la pena hacerlo **el primer día**: BigQuery solo guarda desde que se
vincula, no rellena hacia atrás. Cada día sin vincular es historial perdido.

---

## 3 · Albato → Google Sheets — el recuento que no falla

GA4 pierde a quien rechaza cookies o usa bloqueador (entre un 10 % y un 25 %
del tráfico, y más en móvil). Esto no: la reserva sale del servidor, no del
navegador, así que llegan todas.

En la automatización que ya recibe el webhook de la web, añade un paso
**Google Sheets → Add row** junto al de Telegram. El payload viene en claves
planas para que se mapee directo a columnas:

| Campo | Columna sugerida |
|---|---|
| `referencia` | Referencia |
| `recibido` | Fecha/hora |
| `nombre` · `telefono` | Nombre · Teléfono |
| `fecha_preferida` · `franja_preferida` | Día · Franja |
| `servicios_texto` | Servicios |
| `total` | Total € |
| `primera_sesion` | ¿Primera sesión? |
| `origen_source` · `origen_medium` · `origen_campaign` | Canal de origen |
| `ultimo_source` · `ultimo_medium` | Último canal |
| `gclid` · `fbclid` | Para casar con Ads |
| `notas` | Notas |

`origen_*` es **first-touch**, que es el criterio de atribución del estudio.
`ultimo_*` va al lado para no perder de vista las campañas de recaptación.

Con esas columnas la hoja responde sola a «cuánto me cuesta un lead por canal»
sin depender de GA4 para nada.

---

## Cuando GA4 y la hoja no coincidan

La hoja tiene razón. GA4 mide comportamiento en el navegador y siempre va a
quedarse corto; la hoja recoge la reserva desde el servidor.

Úsalos para cosas distintas:

- **Hoja** — cuántos leads, de qué canal, por cuánto dinero.
- **GA4** — qué páginas se leen, dónde se abandona, qué recorrido hacen antes.
- **BigQuery** — cualquier pregunta que los informes de GA4 no dejen contestar.

---

## Probar que funciona

En la consola del navegador, en cualquier página:

```js
window.s56Events        // todos los eventos disparados en esta página
window.s56Attribution() // el origen guardado, first-touch y last-touch
```

Para probar la atribución, entra con parámetros y haz una reserva de prueba:

```
?utm_source=meta&utm_medium=paid_social&utm_campaign=endospheres_septiembre
```

Esos valores tienen que aparecer en el mensaje de Telegram y en la fila de la hoja.
