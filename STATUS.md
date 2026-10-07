# Estado actual — Usain Bot ($BOLT)

**Última revisión:** 22 de septiembre de 2026  
**Fase:** Prelaunch / preparación de infraestructura

## Resumen

La web y la experiencia arcade están construidas. El proyecto todavía no está listo para lanzar el token ni abrir la comunidad porque faltan el contrato verificado, los enlaces oficiales, la operación de Telegram y varias comprobaciones de publicación.

## Completado

- [x] Landing visual en React, TypeScript, Vite, Tailwind y Framer Motion.
- [x] Hero, historia, roadmap, tokenomics, guía, FAQ, CTA y footer.
- [x] Modo prelaunch que bloquea compras y evita mostrar enlaces no verificados.
- [x] Personaje Usain Bot, assets del estadio y sistema visual cómic.
- [x] Arcade integrado en la web principal.
- [x] Juegos `100m Masher` y `Reaction 9.39`.
- [x] Leaderboard local mediante `localStorage`.
- [x] Efectos de sonido WebAudio y controles para móvil/PC.
- [x] Biblioteca inicial de marketing, copys, ideas de memes y prompts.
- [x] Documentación de outreach actualizada sin loterías ni asignaciones por Bibs.
- [x] Especificación de Telegram actualizada para trabajar con datos verificados y participación voluntaria.
- [x] Bot base de Telegram creado con Python estándar, sin dependencias ni servicios de pago.
- [x] Bot público creado: `@Usainhbot`; arranque local verificado en modo prelaunch.
- [x] Plan gratuito de conexión blockchain → indexador Python → Telegram documentado.
- [x] Plan y rotación de mensajes automáticos de prelaunch documentados; frecuencia inicial: cada 8 horas.
- [x] Mensaje de bienvenida ampliado y pie antiestafa preparado para todas las respuestas y broadcasts.
- [x] Pack prelaunch de publicaciones, mensajes de Telegram y calendario gratuito preparados.
- [x] Comprobación TypeScript: `npx tsc --noEmit` correcta.

## Pendiente crítico

- [ ] Desplegar y verificar el token en Solana (mainnet-beta).
- [ ] Sustituir `TODO_CA`, `TODO_CURVE` y `launchBlock: 0` en `src/config.ts`.
- [ ] Añadir las URLs oficiales de DexScreener, Raydium, X, Telegram y explorador (Solscan).
- [ ] Verificar on-chain el suministro, taxes, funciones administrativas y liquidez.
- [ ] Crear y configurar los canales oficiales de X y Telegram.
- [ ] Copiar y adaptar la bienvenida, mensajes fijados, FAQ y respuestas rápidas cuando exista el grupo oficial.
- [ ] Implementar o conectar el bot de moderación y el Buy-Bot.
- [ ] Crear el indexador on-chain y su conexión con Telegram/web.
- [ ] Ejecutar el bot en un ordenador encendido o elegir, con aprobación, una opción gratuita de ejecución continua.
- [ ] Obtener el ID del grupo y configurar `TELEGRAM_BROADCAST_CHAT_ID` para activar los mensajes automáticos.

## Pendiente de producto y contenido

- [ ] Crear el Meme Kit descargable real dentro de la web, si se mantiene como funcionalidad.
- [ ] Publicar las primeras piezas para X y Telegram cuando existan las cuentas oficiales; por ahora permanecen como borradores con placeholders.
- [ ] Revisar y aprobar el plan de concursos, recompensas y cualquier dinámica económica antes de anunciarla.
- [ ] Decidir si el leaderboard será solo local o tendrá backend global.
- [ ] Actualizar el build y hacer revisión visual final en móvil y escritorio.

## Reglas de publicación

- No publicar una CA, enlace o métrica que no esté verificada.
- No presentar rentabilidad, premios o crecimiento como garantizados.
- No usar sorteos, loterías ni mecánicas antiguas de Bibs.
- No pedir claves privadas, frases semilla, códigos 2FA ni contraseñas.
- Mantener `.env.local` fuera de documentación, commits y contenido público.
- Cualquier contacto real, colaboración o mensaje privado requiere aprobación concreta antes de enviarse.

## Próximo bloque recomendado

Preparar el paquete de comunidad de Telegram y la primera biblioteca de publicaciones del proyecto, manteniendo todos los enlaces y datos de lanzamiento como placeholders hasta que exista una CA oficial.
