# 🤖 Especificaciones de Bots para Usain Bot ($BOLT)

## 1. Bots Necesarios para la Comunidad

### Bot 1: Buy-Bot Personalizado ("Usain Speed Tracker")
- **Función:** Notificar en el grupo de Telegram cada compra on-chain del token.
- **Diferencial temático:**
  - Compra detectada: "🏃 *Usain está calentando en la pista...*"
  - Compra destacada: "🚨⚡ *¡SPRINT DETECTADO! Una wallet acaba de entrar en la carrera.*"
  - Venta detectada: "⚠️ *MOVIMIENTO EN PISTA: revisa siempre los datos oficiales antes de actuar.*"
  - Mostrar solo datos verificados, con wallet abreviada y enlace a la transacción.

### Bot 2: Raid Bot
- **Función:** Publicar en Telegram propuestas de publicaciones y campañas aprobadas por un administrador para que la comunidad participe voluntariamente.
- **Límite:** No automatiza likes, retweets, respuestas, cuentas ni mensajes privados. No se usa para spam ni para presionar a otros proyectos.

### Bot 3: Moderación / Portal
- **Función:** Proteger el grupo de bots de spam mediante verificación Captcha antes de permitir escribir.

---

## 2. Parámetros Técnicos para el Indexador del Bot
- **Red:** Solana (mainnet-beta), una vez exista una mint address oficial verificada.
- **Eventos a escuchar:**
  - Transferencias y swaps del contrato o par oficial.
  - Precio de SOL en USD solo si hace falta para mostrar una estimación y existe una fuente fiable.
  - Hash, bloque, dirección abreviada y enlace al explorador.

## 3. Reglas de seguridad y prelaunch

- Mientras no exista CA verificada, el bot permanece en modo prelaunch y no publica alertas de compras.
- Nunca se solicitan claves privadas, frases semilla, códigos 2FA o contraseñas.
- No se publican afirmaciones de beneficios, rentabilidad garantizada o “insider access”.
- Los enlaces oficiales se configuran desde una lista revisada por el administrador.
- Si el indexador pierde conexión o detecta datos inconsistentes, publica un aviso de mantenimiento en lugar de inventar datos.
