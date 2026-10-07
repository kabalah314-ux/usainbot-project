# Plan de comunicación automática en Telegram — Prelaunch

## Objetivo

Convertir Telegram en el lugar donde una persona que llega desde X encuentra información clara, entiende el proyecto y tiene motivos para seguir conectada mientras se prepara el lanzamiento.

X servirá principalmente para alcance y descubrimiento. Telegram servirá para contexto, preguntas, avances y avisos oficiales.

## Ritmo inicial recomendado

- **Un mensaje automático cada 8 horas**: tres mensajes al día.
- **Respuestas manuales o por comando** cuando alguien haga una pregunta.
- **Avisos extraordinarios** solo cuando exista un cambio real y verificable.
- El intervalo será configurable con `PRELAUNCH_BROADCAST_INTERVAL_MINUTES`.

Ocho horas es un punto de partida prudente: mantiene actividad sin llenar el grupo de mensajes repetidos. Si la comunidad crece, se puede ajustar según respuestas y silencios.

## Rotación de contenidos

El bot recorrerá una lista de mensajes y no publicará siempre el mismo texto:

1. **Bienvenida:** qué es Usain Bot y qué se puede hacer en el grupo.
2. **Identidad:** velocidad, robots, carreras y estética del proyecto.
3. **Web y arcade:** invitar a probar la experiencia sin pedir compra.
4. **Información del token:** estado prelaunch, red objetivo y datos todavía pendientes.
5. **Seguridad:** no usar CA de DMs ni compartir claves.
6. **Construcción pública:** avances de web, arcade, contenido y comunidad.
7. **Participación:** preguntas, retos de arcade y memes.
8. **Cómo reconocer el lanzamiento:** solo enlaces publicados por los canales oficiales.

## Formato de cada mensaje

Cada mensaje debe tener:

- Una idea principal.
- Una lectura rápida en el móvil.
- Un enlace solo si está verificado.
- Una acción ligera: responder, probar el arcade, compartir una idea o revisar el FAQ.
- Una frase de seguridad cuando el tema pueda confundirse con una invitación de compra.

## Qué información del token se puede explicar antes del lanzamiento

- Qué es Usain Bot y cuál es su narrativa.
- Que se está preparando para Solana (mainnet-beta).
- Red objetivo: Solana (mainnet-beta), pendiente de confirmación final.
- Que el token todavía no está live.
- Que no existe una CA oficial publicada.
- Que los detalles de trading aparecerán solo en los canales oficiales.
- Qué significa verificar un contrato y una transacción.

No se deben presentar como hechos finales antes de verificar en cadena el suministro, taxes, liquidez, funciones administrativas o enlaces de compra.

## Mensajes que deben seguir siendo manuales

- Problemas técnicos individuales.
- Acusaciones, quejas o posibles estafas.
- Cambios de contrato o de tokenomics.
- Anuncios de lanzamiento.
- Cualquier premio, concurso o colaboración.
- Respuestas que requieran revisar una transacción concreta.

## Control gratuito y seguro

- El destino se configura con `TELEGRAM_BROADCAST_CHAT_ID`.
- La pausa se hace apagando `PRELAUNCH_BROADCASTS` o deteniendo el proceso.
- El estado de la última publicación se guarda en un archivo local ignorado por Git.
- Si no hay ID de grupo, el bot no publica automáticamente.
- Si el ordenador se apaga, no se envían mensajes atrasados al volver: el bot retoma el intervalo normal.

## Métricas sencillas

Sin herramientas de pago podemos observar manualmente:

- Nuevos miembros después de cada publicación en X.
- Respuestas y preguntas en Telegram.
- Clics o visitas visibles en la web cuando estén disponibles.
- Mensajes que generan dudas repetidas.
- Qué temas hacen que la gente participe en vez de solo leer.

La prioridad es conversación cualificada y confianza, no llenar el grupo de mensajes.
