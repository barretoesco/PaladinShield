# Security roadmap — PaladinShield

## Transparencia hackathon (demo en vídeo)

Durante la competición se puede **incluir una clave OpenAI embebida** en el cliente de la extensión (`src/extension/scripts/translator.js`, constante `DEMO_OPENAI_API_KEY`) para **evitar fricción** en demos.

Esa decisión **no** es el modelo de seguridad objetivo para un producto público: cualquiera con acceso al paquete `.crx`/código puede extraer la clave, abusar de cuota o suplantar llamadas. Antes de cualquier **release** o repositorio público, la clave debe **eliminarse del árbol fuente** y rotarse en el proveedor.

## Arquitectura productiva (orientación)

- **Sin secretos en el extension host**: el navegador solo envía metadatos necesarios (p. ej. resumen del intent, hashes, contexto no sensible) a un **backend propio** que posee la API key o un proxy firmado.
- **Autenticación y límites**: sesión de usuario, rate limiting, auditoría y opcionalmente firma de payloads entre extensión y servicio.
- **Cumplimiento**: retención mínima de datos, DPA con el proveedor de LLM si aplica, y canales seguros (TLS, cabeceras CSP en UI embebida donde corresponda).

## Archivos relevantes hoy

| Área | Ubicación |
|------|-----------|
| Clave demo hackathon | `src/extension/scripts/translator.js` → `DEMO_OPENAI_API_KEY` |
| Resolución de clave (orden) | `resolveOpenAiApiKey`: `options.apiKey` → `DEMO_OPENAI_API_KEY` → `OPENAI_API_KEY` en `globalThis` / `process.env` (solo entornos de prueba fuera de MV3) |
| Arranque REL | `src/extension/scripts/background.js` → `ensureRelBootState` publica estado **REL ACTIVE** sin pisar análisis en curso |

Tras la demo, sustituir la clave incrustada por el flujo backend descrito arriba y documentar el despliegue en el README interno del equipo.
