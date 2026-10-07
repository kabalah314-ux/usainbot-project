# Tareas activas de la web

Lista de trabajo para cerrar la experiencia de los minijuegos y mantener una identidad visual única.

## Estado actual

- [x] 100m: convertirlo en un duelo entre el corredor humano del jugador y Usain Bot; mostrar un resultado visual distinto al ganar o perder.
- [x] 100m: usar el corredor humano adjunto como personaje del jugador (`public/human-runner.jpg`) y mantener a Usain Bot como rival.
- [ ] 100m: conectar las imágenes finales específicas de victoria y derrota cuando estén disponibles; mientras tanto el resultado usa el rig oficial como fallback.
- [x] Reaction 9.39: explicar las reglas antes de empezar y cambiarlo a un único intento para clavar exactamente 9,39 segundos.
- [x] Reaction 9.39: ocultar el cronómetro transcurrido; el bot recorre una pista visual, cruza la marca 9.39 y hace fintas aleatorias para despistar.
- [x] Reaction 9.39: valorar la distancia respecto a 9,39 s, detener la partida al hacer clic/ESPACIO y ofrecer repetir o cambiar de juego.
- [x] Identidad visual: reutilizar el mismo Usain Bot híbrido humano/robot, con la misma animación de brazos y piernas, en Hero, Origin, Memes y CTA.
- [x] Footer: añadir el bloque final “PRÓXIMAMENTE · Se vienen novedades” usando la escena completa de construcción, sin renderizar el personaje principal.
- [x] Verificación: build correcto, asset humano servido por Vite, Reaction probado en idle/running/result y navegación entre juegos verificada.

> Nota: las imágenes específicas de victoria/derrota todavía no se han adjuntado. La pantalla mantiene el texto solicitado y el personaje oficial como fallback hasta recibir esos dos assets.

## Hecho en esta iteración

- [x] Origin Story actualizado y comparativa con el personaje oficial.
- [x] Sección “Memes” consolidada y “Meme Sprints” eliminada.
- [x] Guardado local de partidas probado en 100m y Reaction.
