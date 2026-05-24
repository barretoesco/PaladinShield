# Security roadmap — PaladinShield

## Transparencia hackathon (demo en vídeo)

Durante la competición se puede **incluir una clave OpenAI embebida** en el cliente de la extensión (`src/extension/scripts/translator.js`, constante `DEMO_OPENAI_API_KEY`) para **evitar fricción** en demos.

Esa decisión **no** es el modelo de seguridad objetivo para un producto público: cualquiera con acceso al paquete `.crx`/código puede extraer la clave, abusar de cuota o suplantar llamadas. Antes de cualquier **release** o repositorio público, la clave debe **eliminarse del árbol fuente** y rotarse en el proveedor.

También conviene distinguir el **vehículo de demo** de la **visión de producto**: por razones de tiempo de hackathon, PaladinShield se presentó como una **extensión de navegador** para demostrar de forma visible el Runtime Enforcement Layer (REL) sobre llamadas de firma. Sin embargo, la tesis post-hackathon no es quedarse en una extensión aislada, sino **llevar esta capa REL a wallets del ecosistema Solana** para que la protección ocurra **directamente en la superficie de firma del usuario**, sin depender de que cada individuo instale un wrapper separado.

## Arquitectura productiva (orientación)

- **Sin secretos en el extension host**: el navegador solo envía metadatos necesarios (p. ej. resumen del intent, hashes, contexto no sensible) a un **backend propio** que posee la API key o un proxy firmado.
- **Autenticación y límites**: sesión de usuario, rate limiting, auditoría y opcionalmente firma de payloads entre extensión y servicio.
- **Cumplimiento**: retención mínima de datos, DPA con el proveedor de LLM si aplica, y canales seguros (TLS, cabeceras CSP en UI embebida donde corresponda).

## Visión post-hackathon

- **REL nativo en wallets**: la dirección estratégica es integrar el motor de enforcement en wallets de Solana o exponerlo como capa integrable por wallets, no limitarlo a una extensión demo.
- **Protección universal en el punto de firma**: el objetivo es que cualquier usuario del ecosistema reciba el mismo control semántico, default-deny y evidencia forense directamente donde aprueba transacciones o `signMessage`.
- **Infraestructura para el ecosistema**: a largo plazo, PaladinShield debe posicionarse como **security middleware / REL estándar** para productos Solana, de forma que wallets, apps y otros frontends puedan heredar la protección sin reinventar su propio sistema de revisión.

## Evaluación sin fricción (jueces / revisores)

- **REL core (Promise gate + Tier C heurísticas)** no requiere OpenAI — ver [docs/REVIEWER_FAQ.md](docs/REVIEWER_FAQ.md) y [docs/JUDGES_LAB_GUIDE.md](docs/JUDGES_LAB_GUIDE.md).
- **Producción hackathon+:** proxy reverso temporal (Cloudflare Workers, Vercel, etc.) con rate limit para que el paquete unpacked no lleve secretos ni pida key al juez — alineado con la arquitectura backend de arriba.
- **`npm run env:sync`:** solo desarrolladores que quieran probar enriquecimiento semántico Tier B en local.

## Archivos relevantes hoy

| Área | Ubicación |
|------|-----------|
| Clave demo hackathon | `src/extension/scripts/openai-env.js` (gitignored; generado por `env:sync`) |
| Resolución de clave (orden) | `resolveOpenAiApiKey`: `options.apiKey` → `DEMO_OPENAI_API_KEY` → `OPENAI_API_KEY` en `globalThis` / `process.env` (solo entornos de prueba fuera de MV3) |
| Arranque REL | `src/extension/scripts/background.js` → `ensureRelBootState` publica estado **REL ACTIVE** sin pisar análisis en curso |
| FAQ revisores | [docs/REVIEWER_FAQ.md](docs/REVIEWER_FAQ.md) |
| Aislamiento inject | [docs/ENVIRONMENT_ISOLATION.md](docs/ENVIRONMENT_ISOLATION.md) |

Tras la demo, sustituir la clave incrustada por el flujo backend descrito arriba y documentar el despliegue en el README interno del equipo.
