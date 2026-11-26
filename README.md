# El gran desfile navideño

Una aplicación móvil para evaluar atuendos navideños con Gemini y organizar un concurso en el navegador. Las imágenes se reducen antes de enviarse a Google; el ranking y sus miniaturas se guardan en `localStorage` del dispositivo y no se comparten entre navegadores.

## Ejecutar localmente

Necesitas Node.js 22.12 o posterior y una clave de la API de Gemini creada en [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm ci
cp .env.example .env
# Edita .env y agrega tu clave a VITE_GEMINI_API_KEY.
npm run dev
```

Abre la dirección que muestra Vite. También puedes dejar la clave vacía y escribirla en **Configuración** dentro de la aplicación: se guardará en `sessionStorage` hasta que termine la sesión de esa pestaña. `VITE_GEMINI_MODEL` permite cambiar el modelo; por defecto se usa `gemini-2.5-flash`. Reinicia Vite después de modificar `.env`.

Para comprobar la compilación ejecuta `npm run build`; para revisar el código, `npm run lint`. La cámara requiere permiso del navegador y un contexto seguro (HTTPS o localhost).

## Desplegar en GitHub Pages

1. En **Settings → Pages**, selecciona **GitHub Actions** como origen de *Build and deployment*.
2. Envía los cambios a `main` o ejecuta **Desplegar en GitHub Pages** manualmente desde la pestaña **Actions**. El workflow instala las dependencias, compila y despliega el artefacto sin guardar `dist` en ninguna rama ni incorporar una clave de API.
3. Abre la URL publicada en Pages y escribe tu clave personal en **Configuración**. Se guardará en `sessionStorage` hasta que termine la sesión de esa pestaña. No configures una clave en los secrets del workflow: las variables `VITE_` se incorporan al JavaScript público.
4. El prefijo de assets se obtiene automáticamente del nombre del repositorio durante la compilación en Actions.

## Seguridad y privacidad

**Una clave `VITE_` se incorpora al JavaScript publicado y cualquier visitante puede verla**, aunque se haya configurado como secret de Actions. Un secret protege la clave en GitHub Actions, no en la aplicación desplegada. Este workflow no incorpora claves al sitio: usa la configuración temporal con una clave personal para pruebas. Para una clave realmente privada, usa un backend propio con autenticación y límites de uso; esta aplicación estática no ofrece esa protección.

Para reducir el riesgo, en [Google Cloud Console](https://console.cloud.google.com/apis/credentials), abre la clave del proyecto asociado a AI Studio y configura **Application restrictions → Websites (HTTP referrers)** para permitir únicamente los orígenes necesarios, por ejemplo `https://USUARIO.github.io/*` y, solo para desarrollo, `http://localhost:*/*`. En **API restrictions**, limita la clave a la API de Gemini/Generative Language que utilice el proyecto. Verifica las restricciones y la cuota en Google Cloud antes de publicar; las restricciones de referrer no convierten una clave pública en un secreto y dependen de la compatibilidad de la API y del entorno. No subas `.env` al repositorio.

La foto seleccionada se envía a Gemini para su evaluación; no uses imágenes sin el consentimiento de las personas retratadas. Al reiniciar el concurso se borran las entradas locales de este navegador.
