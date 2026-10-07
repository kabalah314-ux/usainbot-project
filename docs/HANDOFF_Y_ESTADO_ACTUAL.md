# 📋 Documento de Handoff & Estado del Proyecto Usain Bot ($BOLT)

**Fecha:** 19 de Septiembre de 2026  
**Estado:** Web en producción en Vercel ([https://usain-bot.vercel.app](https://usain-bot.vercel.app))  
**Red Objetivo:** Solana (mainnet-beta)  

---

## 1. Resumen Ejecutivo para la Continuación del Proyecto

El proyecto está en un punto óptimo: la landing page está 100% funcional, desplegada en internet, visualmente impactante y adaptada a la estética cómic noventera con la historia real del robot corriendo en 9.39s.

### Decisiones de Diseño Tomadas:
1. **Sin Loterías:** Se descartó el modelo de 50 dorsales y sorteo de bloques para evitar contingencias legales de juego no regulado.
2. **Tokenomics Limpios:** 100% Fair launch en Solana, 0/0 Tax, liquidez bloqueada para siempre, el dev compra un 2.5%-3.5% al precio inicial para dar confianza.
3. **Mascota Dinámica:** Usain Bot con extremidades articuladas y visor HUD que cicla entre 3 estados de velocidad y lemas cómicos.
4. **Fondo de Estadio:** Ilustración completa y luminosa con público y robots cutres tropezando en la distancia.
5. **Sección Noticia Real:** Explicación del origen (9.58s de Usain Bolt vs 9.39s del robot humanoide en 2026).

---

## 2. Lo que está Hecho vs Lo que Falta

### ✅ COMPLETADO AL 100%
- [x] Repositorio limpio, compilando en 0 errores (`npm run build`).
- [x] Despliegue en Vercel activo: `https://usain-bot.vercel.app`.
- [x] Assets gráficos optimizados y transparentes en `public/`.
- [x] Toda la documentación estratégica y de marketing en la carpeta `marketing/`.
- [x] Desarrollo preliminar de los 2 minijuegos en `developing-react-mini-games/`.

### ⏳ TAREAS PENDIENTES PRIORITARIAS

#### 1. Verificación y mantenimiento del Arcade (Técnico)
- Los 2 juegos arcade (`ReactionGame.tsx` y `MasherGame.tsx`) y el leaderboard ya están integrados en `src/` y se renderizan desde `src/App.tsx`.
- **Paso a seguir:** probar móvil/escritorio, ejecutar el build y decidir si se necesita un leaderboard global con backend.

#### 2. Despliegue del Smart Contract (Blockchain)
- Crear/desplegar el token en **Solana (mainnet-beta)** con 1.000.000.000 de tokens y 0/0 tax.
- Actualizar `config.token.ca` en `src/config.ts` con la Contract Address real.
- Actualizar los enlaces de Raydium y DexScreener en `config.links`.

#### 3. Setup de Comunidad & Lanzamiento (Marketing)
- Configurar cuenta de X con el banner y la bio de `marketing/copies/TEMPLATES_X_TELEGRAM.md`.
- Crear grupo de Telegram con bot captcha (Rose) y Buy-Bot configurado.
- Publicar el hilo de lanzamiento.
- Solicitar actualización de token en DexScreener.

---

## 3. Contactos y Credenciales del Entorno
- **Cuenta Vercel vinculada:** `kabalah314-ux`
- **Proyecto Vercel:** `usain-bot`
- **Repositorio local:** `c:\Users\oscar\Documents\memes\Usain bot project`
