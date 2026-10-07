# USAINBOT — Sandbox 3D (Fase 1: arquitectura)

Videojuego web 3D de acción/exploración en tercera persona con **estética PS2**,
prototipado en navegador. El protagonista es **UsainBot**, un robot velocista
que ha superado al humano más rápido del mundo (por ahora).

> Este repositorio está en la **fase 1**: base técnica. La ciudad final,
> misiones completas, vehículos, economía, guardado visible y audio llegarán
> por fases, sobre esta arquitectura, sin rehacer nada.

## Cómo ejecutar

```bash
npm install
npm run dev      # desarrollo (http://localhost:5173)
npm run build    # build de producción
npm run preview  # servir el build
```

Requisito: navegador moderno de escritorio con WebGL.

## Controles (esquema PlayStation 2)

Funciona con teclado o con **mando real** (DualShock/DualSense, Xbox o
adaptador USB de PS2 vía Gamepad API; pulsa un botón para que el navegador lo detecte).

| Mando              | Teclado            | Acción                                     |
| ------------------ | ------------------ | ------------------------------------------ |
| Stick izq. / cruceta | `W A S D`        | Correr relativo a la cámara (analógico: poco = caminar) |
| Stick der.         | Flechas / arrastrar ratón | Orbitar la cámara                   |
| ✕                  | `ESPACIO`          | Saltar · ✕ en el aire = **doble salto** (mortal) · soltar pronto = salto corto |
| □ / R1             | `SHIFT`            | Sprint                                     |
| △                  | `E`                | Hablar / usar máquina                      |
| ○                  | `F`                | Beber GasOil (GASOIL BOOST)                |
| L1 / R3            | `Q`                | Recolocar la cámara detrás                 |
| START              | `ESC` / `ENTER`    | Pausa / empezar                            |
| SELECT             | `M`                | Mapa del barrio                            |
| —                  | `F2`               | Panel de debug                             |
| —                  | `F3`               | Cambiar calidad gráfica                    |

La cámara **sigue sola por detrás** al correr (seguimiento "perezoso" por
componente lateral, como en los juegos de la época) y se acerca al chocar con
edificios. Incluye coyote time y buffer de salto para un control fino.

## UsainBot (modelo procedural fiel a la ilustración)

Proporciones medidas sobre la ilustración (≈1.95 m): **cabeza de caricatura
≈27 % de la altura**, torso corto y piernas largas.

- **Cabeza** con forma de huevo: cráneo amplio, mandíbula estrecha y
  barbilla/sonrisa adelantadas. La cara se proyecta en planar frontal
  (`headGeometry.ts`): la textura es literalmente la "vista de frente" con
  entradas, cejas en V, párpados caídos, nariz ancha, sonrisa enorme con
  dientes, perilla y barba fina por la mandíbula.
- **Visor**: dos lentes rectangulares holográficas (la derecha sobresale de la
  cara) con pieza metálica en la sien izquierda; los ojos se ven a través.
- **Torso**: tirantes amarillos con laterales verdes, escote que deja ver el
  pecho robótico, hombros metálicos y pantalla luminosa alta en el pecho.
- **Brazos** robóticos: hombreras grandes (la izquierda con anillo de luz),
  codos con discos, antebrazos con placas doradas y puños.
- **Mallas** verdes con panel amarillo exterior que se ensancha hacia abajo.
- **Piernas** robóticas con rodillas mecánicas, gemelos de bronce y luces
  verdes. **Zapatillas** verdes grandes con franjas doradas y puntera de rejilla.
- **Pose de reposo** de la ilustración: piernas abiertas, puntas fuera y brazos
  cruzados (ángulos resueltos por IK). Tras unos segundos suelta el bocadillo
  holográfico **"you think you can win me?"** (frases en `data/taunts.ts`).
- Cel-shading (toon de 3 tonos + contorno negro "inverted hull").

Técnicamente es **un único SkinnedMesh con 14 huesos** (~9 draw calls).
Es la misma estructura que tendrá el GLB definitivo, así que
`UsainBotAnimator` / `Player` no cambiarán al sustituirlo.

## Gráficos (remaster HD con estética PS2)

Pipeline propio (`src/game/render/`):

1. **Escena → render target HDR** (half float, MSAA 4×, depth texture).
2. **Bloom** solo sobre lo emisivo (visor, luces del traje, estelas, sol, brillos del oro).
3. **Pasada final**: contornos de tinta cel-shading para todo el mundo
   (laplaciano de 1/z: sin líneas falsas en suelos), gradación de color,
   viñeta, desenfoque radial y **líneas de velocidad** al esprintar,
   tone mapping *Neutral* y salida sRGB.

| Calidad (F3) | Resolución | AA | Sombras | Bloom | Extras |
|---|---|---|---|---|---|
| **ALTA** | hasta 1.5× DPR | MSAA 4× | 4096, suaves | ✓ | estelas, polvo |
| **MEDIA** | 1× | MSAA 4× | 2048 | ✓ | estelas, polvo |
| **BAJA** | 0.8× | — | 1024 | — | polvo |
| **RETRO PS2** | 0.5× "nearest" | — | 1024 duras | suave | dithering Bayer + color 16 bits |

La calidad se guarda en `localStorage`. Si el juego no llega a ~38 FPS baja
sola un nivel (salvo que el jugador la haya elegido a mano con F3).
Todos los valores están en `data/graphics.ts`.

**Mundo:** cielo con degradado, sol y nubes cel-shaded animadas; glorieta con
fuente y **estatua dorada de UsainBot**; avenidas con marcas viales, aceras,
bordillos y pasos de cebra; edificios con fachadas (ventanas, escaparates,
toldos, azoteas con máquinas y depósitos), parque con estanque, árboles con
viento en GPU, mobiliario urbano, coches aparcados y skyline lejano en la niebla.
Sombras que siguen al jugador (ancladas a texel → sin parpadeo).

**Rendimiento:** ~60 draw calls por frame en total (sombras y bloom
incluidos): todos los edificios comparten un atlas y son **1 malla**, todo el
mobiliario es **1 malla** (StaticBatcher) y los árboles son instancias.

## Fase 3 · Barrio Bolt (primer mundo abierto)

```
 z=-178  ▓ ZONA NORTE (barrera · próximamente)
         ┌──────────── PARQUE BOLT (estatua dorada, estanque, zona infantil, GasOil) ────────────┐
 z=-95   ═══════════════ C. del Parque ══════════════════════════════════════════════════════════
   C.    [viviendas]            ║ AV.   [viviendas]                                      C.
 z=-25   ═══════════════ C. Comercio ═══════════ BOLT ═══════════════════════════════════════════
  OESTE  [tiendas + callejón + plaza]  ║   [aparcamiento + galería comercial + GasOil]     ESTE
 z=45    ═══════════════ C. Gasolina ════════════════════════════════════════════════════════════
         [pisos + plaza vecinal + cancha]  ║   [GASOLINERA GASOIL STOP]
 z=115   ═══════════════ C. Residencial ═════════════════════════════════════════════════════════
         [MANSIÓN USAINBOT + piscina + garaje/taller Tito]  ║  [viviendas + paseo peatonal]
 z=199                               ▓ SALIDA CIUDAD (barrera · próximamente)
```

- **Inicio**: dormitorio de la mansión → recibidor → pórtico → jardín → calle.
  Sin pantallas de carga: al entrar en un edificio su tejado deja de
  dibujarse (sigue proyectando sombra).
- **Calles anchas** (14 m la avenida, 12/10 m el resto), cruces con cebras,
  esquinas amplias, callejón de 8 m, pasajes y paseo peatonal como atajos.
  Aparcamientos y plazas para los futuros vehículos.
- **GasOil** (marca ficticia, naranja + carbón): 5 máquinas en lugares lógicos
  (gasolinera ×2, galería comercial, plaza vecinal, parque), anuncios
  ("ROBOT FUEL", "RUN FURTHER", "HUMANS DON'T NEED THIS"…), tótem de precios,
  marquesina iluminada, nevera de la mansión e icono de la lata en el HUD.
  Un único atlas alimenta todo → identidad consistente.
- **16 vecinos** repartidos (mansión, calles, comercios, gasolinera, parque,
  plaza, cancha) con comportamientos: quieto, patrulla, conversación, trabajo.
  Se giran hacia el jugador, saludan y se paran a hablar.

### Arquitectura del mundo

```
World (orquestador)
├── RoadNetwork     calles desde data/cityLayout.ts (cruces, aceras, cebras)
├── HomeZone        mansión explorable + garaje (inicio)
├── ResidentialZone viviendas paramétricas, pisos, plaza, cancha
├── CommercialZone  tiendas, callejón, galería + parking
├── GasStationZone  GasOil Stop
├── ParkZone        estatua, estanque, zona infantil, acceso norte
├── StreetsZone     farolas/placas/papeleras generadas desde los datos de calles
└── OutskirtsZone   límites, salidas y skyline → aquí engancharán futuras zonas
```

Cada zona implementa `Zone` (`world/zones/Zone.ts`) y aporta a lotes
compartidos (props, fachadas, rótulos, anuncios GasOil, suelos) que se fusionan
al final. Añadir una zona = una clase + una línea en `World`.
Además registran **POIs** y dibujan su huella en **MapData** (el mapa siempre
coincide con el mundo).

### Navegación

- **POIs** (`world/poi/POIRegistry.ts`): id, nombre, categoría, posición
  (viva: los NPC la mueven). Categorías e iconos en `data/poi.ts`:
  HOUSE ⌂ · GARAGE G · GASOIL_MACHINE ϟ · GAS_STATION S · SHOP $ · PARK ♣ ·
  MISSION_NPC ! · EXIT ».
- **Minimapa** (abajo izquierda): gira con la cámara, calles, edificios por
  tipo, parques y agua, POIs, norte y el objetivo (anclado al borde si está
  lejos). El mapa base se pinta una vez; por frame solo se compone.
- **Mapa completo** (SELECT / M): norte arriba, leyenda, zona actual,
  línea hasta el objetivo y distancia.
- **Waypoint**: brújula superior (icono + nombre + distancia + flecha),
  marcador sobre el objetivo en pantalla (pegado al borde si no se ve) y
  baliza de luz 3D. Lo decide `MissionNavigator`:
  misión activa → POI del objetivo actual; si no → NPC con misión disponible.

### Misión 1 · Robot Diesel (flujo probado de principio a fin)

Tito Tuercas (garaje) → máquina GasOil de la gasolinera (waypoint) →
comprar lata (10 ₲) → el waypoint cambia solo a Tito → **GASOIL BOOST**
(○ / F: +45 % velocidad 12 s, estelas y líneas de velocidad) → volver con
Tito → **+100 ₲** y banner de misión completada.
Lógica en `missions/scripts/RobotDieselScript.ts`, que solo escucha eventos
del `EventBus` (`inventory:changed`, `gasoil:boost`, `npc:talk`).

## Fase 4 · Turbo, GasOil, carreras y controles de PC

### Controles (PC: teclado + ratón)

| Tecla | Acción |
|---|---|
| `W A S D` | Moverse |
| `← ↑ ↓ →` | Cámara (giro suave; `C` la centra detrás) |
| `SPACE` | Saltar (doble salto en el aire) |
| `SHIFT` | **TURBO** (gasta la barra) |
| `G` | **Beber GasOil** (recarga el turbo) |
| `E` | Hablar / usar / comprar |
| `M` | Mapa · `H` ayuda · `ESC` pausa · `F3` calidad |

La ayuda de controles del HUD es discreta y se oculta sola a los 150 s
(`H` la vuelve a mostrar; también está en el menú de pausa).

### Bug del suelo (solucionado de forma estructural)

Causa: la base de la mansión era un bloque macizo de 0,5 m que tapaba todo
el interior, y la física usaba `y = 0` fijo mientras los suelos visibles se
dibujan a 1–4,5 cm (aceras, calzada, parqué, baldosa, garaje).

- **`GroundMap`** (`world/GroundMap.ts`): cada suelo que se dibuja registra su
  altura real (parches, calzadas, cruces, aceras, alfombras, porche). El
  jugador y los NPCs se apoyan en la superficie más alta alcanzable
  (sube escalones ≤ 0,35 m, baja pegado al suelo ≤ 0,12 m).
- La base de la mansión ahora es solo un zócalo exterior.
- **Apoyo de pies por IK** en el animador: la cadera se coloca a la altura que
  dejan las piernas (FK real de muslo/espinilla/pie) y la profundidad de la
  suela se **mide sobre la geometría**. Los NPC también miden su suela.
- Test automático: suela real (skinning en CPU) vs suelo físico en reposo,
  corriendo, saltando, con turbo, dentro y fuera de la casa → +0,001 m.

### GasOil → TURBO (mecánica central)

```
EXPLORAR → CONSEGUIR GASOIL → BEBER (G) → TURBO ↑ → CORRER (SHIFT) → TURBO ↓ → …
```

- `gasoil_can` es un consumible real del inventario (`data/items.ts`):
  se compra (máquinas, 10 ₲), se encuentra (7 latas que reaparecen), se ve en
  el HUD (`GASOIL ×N`) y en pausa, y desaparece al beberla.
- **G**: sin latas → `NO GASOIL`; turbo lleno → `TURBO FULL` (no se
  desperdicia); si no → estado **DRINKING_GASOIL** (1,75 s): saca la lata,
  la mira, se la lleva a la boca (IK del brazo hasta la boca real), echa la
  cabeza atrás, tres tragos, «¡AHHH!» con tembleque robótico, la aplasta y
  desaparece. En el trago final: −1 lata y **TURBO +40**, destello de las luces
  del traje, chispas y un chiste de GasOil. Sonidos sintetizados (lata,
  tragos, servo). Mientras bebe no puede correr, saltar, usar turbo ni
  interactuar; un segundo G no hace nada. Primer plano suave de cámara.
- **TURBO** (`turboSettings`): máx. 100, empieza con 35, gasta 17/s solo con
  SHIFT y en movimiento; ×2 velocidad (8,5 → 17 m/s), empujón inicial,
  **menos agarre y giro** (en curvas te comes la fachada: hay que dosificarlo).
  Sin reserva no se activa (`NO TURBO`). Efectos: líneas de velocidad, estelas,
  humo, luces pulsantes, zumbido de servo, cámara algo más lejos y vibración leve.

### Misiones multiobjetivo

`ObjectiveTracker` completa objetivos por tipo (eventos + estado):
`TALK_TO_NPC · GO_TO_LOCATION · COLLECT_ITEM · DELIVER_ITEM · INTERACT_OBJECT ·
BUY_ITEM · USE_ITEM · RACE_TO_LOCATION · REACH_CHECKPOINT · COMPLETE_TIMER · USE_TURBO`.
Diálogos, recompensas y desbloqueos son **datos** (`data/missions.ts`,
`MissionDirector`). Una carrera fallida rebobina al último «ir a…».

| Misión | Quién | Objetivos |
|---|---|---|
| Robot Diesel | Tito | conseguir GasOil → beberlo (G) → usar turbo → volver · +100 ₲ |
| Demuestra tu velocidad | Rayo Martínez | ir a la salida → carrera con 4 checkpoints → volver · +150 ₲ |
| Más rápido que el reloj | Lola | conseguir GasOil → beber → ir a A → activar turbo → llegar a B a contrarreloj → volver · +200 ₲ |

### Carreras (`race/`)

Vista previa del recorrido, colocación en la salida, cuenta atrás 3-2-1-GO,
cronómetro, checkpoints en orden (arcos low poly con anillo luminoso: el
siguiente en amarillo), tiempo límite, resultado y recompensa. HUD: `TIME`,
`TARGET`, `CHECKPOINT`, distancia a meta; recorrido en el minimapa.
Rutas con rectas (turbo), curvas (conservarlo) y tramo final.

### Garaje y vehículos

`VehicleManager` coloca el vehículo actual (BOLT-MOBILE, placeholder) en su
plaza del garaje (`data/vehicles.ts`: vehículos, plazas, salida). Se puede
revisar con `E` (datos del coche; conducción, selección y mejoras:
próximamente). El protagonismo sigue siendo correr.

## Fase 5 · Vehículos y conducción

**Regla de diseño:** VEHÍCULO = MOVILIDAD · USAINBOT = VELOCIDAD A PIE.
El coche va a ~97 km/h por calzada, pero **no cabe** en parques, callejones,
pasajes ni rutas peatonales (bolardos con huecos de 1,4–1,7 m: a pie se pasa,
en coche no). Hay puntos donde compensa bajarse y correr.

### Controles (PC)

| A pie | En el coche |
|---|---|
| `E` junto a la puerta → **CONDUCIR** | `W` acelerar · `S` frenar / marcha atrás |
| | `A` `D` girar · `SPACE` freno de mano (derrape) |
| | `F` salir · `←↑↓→` cámara |

La ayuda del HUD cambia sola entre «WASD MOVER…» y «WASD CONDUCIR · SPACE
FRENO DE MANO · F SALIR».

### Arquitectura (`src/game/vehicles/`, separada de `Player`)

- `VehicleData` (`data/vehicles.ts`): `maxSpeed`, `acceleration`, `braking`,
  `reverseSpeed`, `turnSpeed`, `friction`, agarre, freno de mano, colisión…
  Todo configurable en un sitio. `garageSettings.currentVehicle` = vehículo activo.
- `VehicleModel`: BOLT-MOBILE low poly (descapotable amarillo/verde, ruedas
  enormes que giran y viran, puerta que se abre, faros HDR, pilotos de freno,
  interior, arco antivuelco, alerón). ~9 draw calls.
- `VehicleController`: conducción arcade (velocidad persistente + velocidad en
  mundo que la persigue según el agarre → derrape con freno de mano; no gira
  parado; nunca vuelca). Colisión con 3 círculos contra el mundo y los NPCs:
  rebota y se desliza por las paredes, no las atraviesa.
- `Vehicle`: estado + visuales (balanceo cosmético, ruedas, luces).
- `VehicleManager`: garaje, `E` CONDUCIR, transiciones (camina a la puerta,
  se abre, se sienta, se cierra), `F` salir (si va rápido frena solo) con
  **posición de salida segura** (6 candidatas; libre de colisiones, dentro del
  mapa, sobre suelo alcanzable y sin muro entre el coche y el punto).
- `Player.status`: `IDLE · MOVING · JUMPING · TURBO · DRINKING_GASOIL · IN_VEHICLE`.
  En el coche no salta, no bebe GasOil ni usa turbo; bebiendo no puede subir.
- **GasOil y coche separados**: GasOil = turbo de UsainBot; el coche es otro
  sistema (preparado para su propio combustible).

### Cámara, minimapa, HUD

- Cámara de conducción: detrás del coche (también en marcha atrás), más lejos
  y más FOV con la velocidad, sacudida en los choques, choca con edificios,
  transición suave al subir/bajar.
- Minimapa y mapa: flecha a pie / **icono de coche** conduciendo.
- HUD: velocímetro (km/h, marcha D/N/R); turbo atenuado «SOLO A PIE».
- Sonido: motor sintetizado según velocidad, puerta, arranque, choque.
- NPCs: se apartan del susto si el coche va hacia ellos; ninguno queda en la calzada.

### Misiones y carreras nuevas

| Misión | Mecánicas |
|---|---|
| **Entrega urgente** (Pepa) | garaje → subir → conducir → **aparcar** (parado 1 s) → bajar → correr al parque → entregar la tarta → volver · +180 ₲ |
| **El atajo del campeón** (Manolo) | coche al punto de relevo → bajar → carrera a pie por el parque con **regla: beber GasOil + usar turbo** · +250 ₲ |
| **¿Eso es todo?** (Dani) | carrera con 5 checkpoints: avenida (turbo), parque, **atajo a pie entre las casas** o vuelta por la avenida, callejón, máquina GasOil (¿paras a beber?), meta · +175 ₲ |

Objetivos nuevos: `ENTER_VEHICLE · EXIT_VEHICLE · DRIVE_TO_LOCATION · PARK_VEHICLE`
y `onFoot` para exigir ir a pie. Carreras: `mode: on_foot | vehicle` (usar el
coche en una carrera a pie la descalifica), `kind` (sprint, checkpoints,
time_trial implementados; obstacles, shortcuts, vs_npc preparados) y `rules`.
POIs nuevos: `PARKING`, `RACE_START`, `RACE_FINISH` (además de GARAGE y VEHICLE).

### Guardado (preparado)

`Game.createSaveData()` genera: dinero, inventario, misiones (estado y
objetivo), jugador (a pie / en coche, posición, stats), vehículo actual con su
posición y un hueco para mejoras. El guardado definitivo llegará más adelante.

## Fase 6 · Ciudad viva

Todo ajustable en `data/life.ts` (densidades, radios, horarios, frases).

| Sistema | Archivo | Qué hace |
|---|---|---|
| Grafo de peatones | `world/nav/PedGraph.ts` | Waypoints generados desde las calles (esquinas, aceras, pasos de cebra) + bancos, máquinas GasOil, puertas de tiendas, caminos del parque y plazas |
| Peatones | `npc/PedestrianManager.ts` | Pool de 18 con apariencias variadas (humanos, niños, robots; ropa, gorras, accesorios, altura). Pasean, se paran, cambian de dirección, cruzan por las cebras, se sientan, compran/beben GasOil, entran y salen de tiendas |
| Estados de NPC | `npc/NPC.ts` | `IDLE · WALKING · TALKING · SITTING · PAUSED` + animaciones nuevas (sentarse, beber GasOil, usar máquina, batería baja, agotado) |
| Tráfico | `traffic/` | 5 bucles por el carril derecho con curvas suavizadas; frenan ante coches, peatones y el jugador; ceden en cruces; pitan si les bloqueas; pool de 9 |
| Hora del día | `world/TimeOfDay.ts` | MAÑANA · DÍA · TARDE · NOCHE (24 h = 8 min): luz, niebla y densidad (de noche menos gente y más robots) |
| Reacciones | `life/ReactionSystem.ts` | Correr rapidísimo, turbo o coche cerca → se giran, se sorprenden, se apartan y sueltan una frase (probabilidad + enfriamientos) |
| Microeventos | `life/EventManager.ts`, `life/events.ts` | trigger → inicio → comportamiento → fin, con enfriamiento y máximo simultáneo |
| Frases | `ui/BarkSystem.ts` | Bocadillos sobre NPCs y coches (pool de 7 elementos) |
| Vida ambiental | `world/zones/LifeZone.ts` | Coches aparcados, carteles GasOil, parada de bus, terraza, banderines, ventiladores, hojas/papeles, palomas, humo |
| Sonido ambiental | `audio/AmbientManager.ts` | Capas city/traffic/park/machines/crowd/night/footsteps calculadas por zona y hora (preparado para samples) |

**Eventos:** `EVENT_ROBOT_LOW_BATTERY` (robot sin batería → [E] AYUDAR, con o sin
GasOil), `EVENT_RANDOM_RACE` («¡Eh! ¡El robot rápido!» → corre hasta el parque),
`EVENT_NPC_ARGUMENT`, `EVENT_GASOIL_PROMOTION` (2x1 y cola de robots),
`EVENT_CAR_PROBLEM`, `EVENT_DROPPED_BOX`, `EVENT_WANNABE_RUNNER`.
Aparecen en el minimapa con ✱.

**GasOil en la vida diaria:** robots que compran y beben en las máquinas,
cola de robots en la gasolinera, un robot bebiendo en bucle, promociones,
anuncios en fachadas y parada de bus, robotaxis con rótulo GasOil y máquinas
que laten (más de noche).

**Rendimiento:** pools fijos (nada se crea/destruye en juego), aparición a
28–80 m y reciclado a >100 m, detalle completo (contorno + sombra) solo a
<45 m, lógica cada 0,2 s a >70 m, tráfico con lógica reducida a >95 m y
aparición solo fuera de cámara; todo lo ambiental instanciado (1 draw call
por sistema) y lo estático dentro de los lotes existentes.

**Misión secundaria nueva — «Corre si puedes» (Chispa, Avenida Bolt):**
Chispa te llama cuando pasas cerca → aceptar → salida → 4 checkpoints →
regla: usar el turbo al menos una vez → meta → volver · +120 ₲ (te regala un GasOil).

## Fase 7 · Tipos de misión, interacción con vehículos y HUD limpio

### Tipos de misión (`data/missionTypes.ts`, campo `missionType` de cada misión)

| Tipo | Identidad | Misiones |
|---|---|---|
| **ON_FOOT** | estilo normal (amarillo), icono de corredor | Robot Diesel · Demuestra tu velocidad · Más rápido que el reloj · ¿Eso es todo? · Corre si puedes · **La entrega más rápida** · **Batería baja** |
| **VEHICLE** | **AZUL** (reservado), icono de coche | Entrega urgente · **Entrega Express** · **Contrarreloj** · **El repartidor más rápido** |
| **HYBRID** | violeta + icono corredor/coche | El atajo del campeón · **No hay tiempo** |

El color se aplica a: icono sobre el NPC, marcador del minimapa y del mapa,
waypoint (brújula, marcador y baliza 3D), etiqueta del HUD, etiqueta del
diálogo al aceptar, lista de misiones (pausa) y checkpoints de carreras en coche.
Tiendas, aparcamientos y bloques de pisos dejaron de usar azul/violeta en el mapa.

### Objetivos con modo exigido

`requiredMode: ON_FOOT | VEHICLE | ANY` (por defecto se deduce del tipo).
Si llegas de la forma incorrecta **no se completa** y se avisa. Nuevo:
recoger/entregar **en un punto** (a pie o desde el coche, p. ej. ventanilla del
Robo-Burger), contrarrelojes **"desde donde estés"** (`dynamic`: límite según
la distancia) y carreras **RACE_ON_FOOT / RACE_VEHICLE** (el coche se coloca en
la salida; checkpoints azules). Una carrera solo arranca cuando estás en el
modo correcto.

### Vehículos: E para entrar y salir

- `vehicleInteraction.interactionDistance` (2,3 m) medido **hasta la carrocería**:
  funciona desde laterales, morro, maletero y diagonales.
- Un único objetivo prioritario (el coche más cercano) y un indicador
  **[E] ENTRAR** sobre el coche. El tráfico no es interactuable.
- Entrada: busca el punto de entrada libre más cercano, corre hasta él y
  **salta al asiento** del descapotable (más alto desde morro/maletero).
- Dentro: **[E] SALIR DEL VEHÍCULO** (ya no hay tecla F). Si va rápido frena solo.
- Salida segura: 8 posiciones preferidas + 4 anillos de búsqueda; cada punto
  se comprueba contra paredes, coches, NPCs, límites y suelo, y sin muro en medio.

### Debug y HUD

- El panel técnico ya no ocupa la pantalla: botón discreto **[DEBUG]** (arriba
  a la izquierda) o **F2/F3**. Incluye FPS, posición, velocidad, estado,
  misión, objetivo y su modo, vehículo, turbo, GasOil y el registro de mensajes.
  Calidad gráfica pasa a **F4**.
- HUD de misión: `MISIÓN "…"` + etiqueta del tipo + `OBJETIVO` con icono del
  modo exigido (a pie / coche) y distancia.

## Fase 8 · Landing web + expansión "Sant Obrer" (barrio obrero)

### Landing web (previa al juego)

Flujo: **LANDING → [PLAY] → pantalla de inicio del juego (existente) → juego**.
React solo cambia de pantalla (`src/App.tsx`, estado `started`); **el juego 3D
no se carga hasta pulsar PLAY**, así la landing es ligera y la pantalla de
inicio con el título USAINBOT se conserva intacta.

- `src/landing/Landing.tsx` — HERO (USAINBOT + "The fastest bot alive") con
  **PLAY** en el centro, X y Telegram, `BUY USAINBOT TOKEN` (+ enlaces GMGN y
  FOMO) y el sello **OOOX** clicable → TOKENOMICS → THE PROJECT → sección OOOX.
- `src/landing/OOOXLogo.tsx` — logotipo OOOX dibujado como **SVG real** (tres
  anillos + equis; variante `wordmark` y `seal` achaflanado). Sustituir el
  logo = cambiar los `<path>`. Iconos de X y Telegram también en SVG.
- `src/landing/landing.config.ts` — **configuración central** con todos los
  placeholders: `urls.x` (X_URL), `urls.telegram` (TELEGRAM_URL),
  `urls.tokenBuy` (TOKEN_BUY_URL), `urls.gmgn`, `urls.fomo`,
  `token.contract` (TOKEN_CONTRACT · "COMING SOON"), `urls.ooox`
  (OOOX_WEBSITE_URL), `tokenomics` (TOTAL_SUPPLY, CREATOR_ALLOCATION = 0 %,
  INITIAL_CREATOR_BUY = UP TO $200, LIQUIDITY, COMMUNITY, TEAM) y `transparency`.
  **Nada de datos de mercado/contrato inventados**: lo sin dato real muestra
  `TBD`. Hay botón `COPY CONTRACT` (deshabilitado hasta que haya contrato) y
  un disclaimer que no promete valor ni rendimiento.
- `public/assets/landing/hero-usainbot.jpg` — imagen de fondo (UsainBot en su
  mansión). Si no cargara, detrás hay una escena CSS de respaldo con la misma
  paleta.

### Expansión del mapa: SANT OBRER (barrio obrero)

Se amplía el mapa con un barrio nuevo al **este**, copiando y reutilizando los
assets y helpers existentes (fachadas, casas, props, carteles, máquinas GasOil),
pero con una **geometría distinta inspirada en los ensanches de Barcelona**:

- **Manzanas de tamaños distintos** (retícula irregular: 27/28/40 m en X y
  25/33/37/45 m en Z) — simetría irregular.
- **Esquinas ACHAFLANADAS estilo Eixample**: edificios girados 45° que cortan
  la esquina de la manzana (`addChamferCorner`).
- **Rambla Obrera**: avenida ancha arbolada (16 m) que cruza el barrio.
- **Carácter obrero**: Fábrica GasOil con chimeneas y silos, almacén,
  Mercado Obrero con puestos, Taller, viviendas obreras, palés, vallas y
  aparcamiento.

Puntos de referencia: **Fábrica GasOil** (con chimeneas y anuncio),
**Mercado Obrero**, **Taller Sant Obrer**, **Plaza del Taller** y dos
**máquinas GasOil**. Nuevos POIs: `SHOP`, `PARK`, `PARKING`.

**Conexión física:** las cuatro calles transversales (C. del Parque, C.
Comercio, C. Gasolina, C. Residencial) se alargan de x = 115 a x = 232 y
engarzan con la retícula de Sant Obrer. Un único espacio jugable, a pie y en
coche, sin pantallas de carga. La casa de UsainBot no se mueve: la partida
sigue empezando en su dormitorio.

### Mapa separado por barrios + futuros barrios

`src/game/data/districts.ts` define los **distritos** (barrios):
MANSIÓN USAINBOT · BARRIO RESIDENCIAL · ZONA COMERCIAL · GASOLINERA GASOIL
STOP · PARQUE BOLT · **SANT OBRER** (nuevo) y, marcados como **futuros** en el
mapa con "PRÓXIMAMENTE": EL PUERTO (este) · CENTRO / DOWNTOWN (sur) · BARRIO
DIAGONAL (oeste) · LA PLAYA (norte). El HUD y el minimapa muestran el nombre
del distrito y el mapa completo dibuja sus límites y nombres.

### Misión y carrera que usan la expansión

- **"Más allá del barrio"** (ON_FOOT, Forja el capataz): Fábrica GasOil
  (extensión 1) → Mercado Obrero (extensión 2) → Taller (destino final) →
  volver con Forja · +190 ₲.
- **Carrera "Más allá del barrio"**: START en el barrio original → 3 checkpoints
  cruzando Sant Obrer → FINISH en el Taller. A pie, con checkpoints y tiempo.

## Fase 9 · Mapa ampliado por los laterales (secciones por rellenar)

El mapa se ensancha hacia los **cuatro laterales** con suelo continuo y
calles reales (un único espacio jugable a pie y en coche). Cada tramo nuevo
queda como **SECCIÓN lista para rellenar** en las próximas fases.

| Sección | Situación | Calles nuevas |
|---|---|---|
| **BARRIO DIAGONAL** | oeste | C. del Ensanche, C. del Poniente |
| **EL PUERTO** | este | C. del Astillero, C. del Muelle, C. del Faro |
| **CENTRO / DOWNTOWN** | sur | Gran Vía Sur, C. de la Plaza, C. Central, C. del Sur |
| **LA PLAYA** | norte | C. de la Arena, Paseo Marítimo, C. del Espigón, C. de los Botes |

- **Tamaño del mapa:** de ~356×381 m a **485×507 m** (`CITY_BOUNDS`).
- **Conexión:** las 4 transversales (C. del Parque, Comercio, Gasolina,
  Residencial) se alargan de −115..232 a **−185..296**; C. Yunque, C. Machaco y
  la Rambla Obrera también cruzan de lado a lado; Av. Bolt baja al sur; y La
  Playa se alcanza por los laterales (C. del Poniente y C. del Faro suben al
  norte rodeando el Parque Bolt). Sin pantallas de carga.
- **14 calles nuevas** en total (11 verticales/horizontales de sección + 3 de
  conexión), además de las transversales alargadas.
- El suelo es continuo (plano de césped de 700 m): sin huecos ni escalones.

### Secciones por rellenar

Cada sección tiene ya **suelo, calles, aceras, pasos de cebra, farolas y
papeleras** (todo generado desde `ROADS`, sin assets nuevos) y una **señal
"SECCIÓN EN OBRAS · AMPLIACIÓN LISTA · POR RELLENAR"** con conos en su
entrada. Para rellenar una sección:

1. crear una `Zone` nueva en `src/game/world/zones/` reutilizando `addFacade`,
   `addHouse`, `addGasOilMachine` y los props existentes;
2. registrarla en `World.zones`;
3. quitar su marca en `SectionsZone.markers`;
4. (opcional) añadir NPCs, misiones y carreras en `src/game/data/`.

El mapa ya distingue tres estados: **relleno** (nombre), **sección** (trama +
"SECCIÓN · POR RELLENAR") y **futuro** (gris + "PRÓXIMAMENTE"): SIERRA VIEJA,
DÁRSENA COMERCIAL, ISLA DEL FARO y CIUDAD UNIVERSITARIA, en el anillo exterior.

## Estructura del proyecto

```
src/
  App.tsx                # Shell de montaje (React solo monta el juego)
  game/
    main.ts              # Punto de entrada del juego: new Game() + start()
    core/
      Game.ts            # Orquestador: renderer, sistemas y orden del frame
      GameLoop.ts        # Bucle rAF (sin lógica de juego)
      Time.ts            # Delta acotado + timeScale
      input/
        InputManager.ts  # Teclado + mando + ratón → acciones y ejes de stick
        GamepadReader.ts # Gamepad API (standard mapping)
        bindings.ts      # Esquema PS2: ✕ □ △ ○ L1 START SELECT
      SceneManager.ts    # Cambio entre escenas (menú, juego, zonas…)
      DebugSystem.ts     # FPS, draw calls, estado, errores (F2)
    render/
      Renderer.ts        # Pipeline HDR, calidad gráfica y auto-ajuste
      FinalPass.ts       # Tinta cel-shading, gradación, velocidad, retro
    effects/             # Polvo (instanciado) y estelas de sprint
    scenes/
      GameScene.ts       # Escena sandbox: fases lógica → física → cámara
    player/
      Player.ts          # Física cinemática, estado, colisiones
      PlayerController.ts# Entrada → intenciones (separada del jugador)
      PlayerModel.ts     # Fachada visual (hoy procedural, mañana GLB)
      PlayerStats.ts     # Stats en tiempo (mejoras escribirán aquí)
      model/
        UsainBotRig.ts      # Esqueleto + piezas → SkinnedMesh
        UsainBotAnimator.ts # Animación procedural (correr, saltar, mortal, brazos cruzados)
        headGeometry.ts     # Cabeza de caricatura con UV planar frontal
        materials.ts · textures.ts · palette.ts
    camera/
      ThirdPersonCamera.ts # Órbita tercera persona (pointer lock / arrastre)
    world/
      World.ts           # Sandbox: edificios, props, colisionadores
      Environment.ts     # Cielo, niebla, luces, suelo, carreteras, nubes
      Props.ts           # Props low poly (InstancedMesh donde repite)
      colliders.ts       # AABB + límites del área
    missions/
      Mission.ts         # Misión + objetivos + estados
      MissionManager.ts  # Registro, estado activo, notificaciones
    npc/ · vehicles/ · dialogue/
                        # Managers placeholder con API estable
    audio/               # AudioManager (API lista, sin assets aún)
    save/                # SaveManager (localStorage, sin UI aún)
    ui/
      HUD.ts             # HUD de prueba (DOM imperativo, 60 fps sin re-render)
      MenuManager.ts     # Pantallas inicio / pausa
      SpeechBubble.ts    # Bocadillo holográfico anclado a la cabeza
      styles.css         # Estética arcade de la UI de desarrollo
    data/
      types.ts           # Tipos de datos (Player, Misión, Vehículo, NPC…)
      config.ts          # TODOS los valores ajustables del juego
      missions.ts        # Misiones conceptuales de ejemplo
    utils/
      math.ts · physics.ts · dispose.ts · textures.ts
public/
  assets/                # Carpeta reservada: models/, textures/, audio/
```

## Decisiones técnicas de la fase 1

- **`src/game` aislado de React.** El scaffolding del proyecto es React+Vite,
  pero el juego no usa React: `App.tsx` es una shell de 30 líneas y `game/main.ts`
  arranca el bucle. Permite migrar a un Vite "puro" sin tocar una línea de juego.
- **UI con DOM imperativo.** Actualizar un HUD con React a 60 fps es costoso y
  absurdo. El HUD solo escribe `textContent` cuando el valor cambia.
- **Fases del frame explícitas** (`GameScene.update`): lógica → física → cámara,
  y en `Game.onFrame`: entrada → escena → render → UI.
- **`MissionState` como const object + union** en vez de `enum` (mismo uso,
  cero problemas con la configuración de TS).
- **Rendimiento desde el día uno:** pixelRatio 1 y sin antialias (look PS2),
  2 luces con un único shadow map de 1024, texturas procedurales pequeñas con
  `NearestFilter`, `InstancedMesh` para objetos repetidos, materiales/geometrías
  compartidos y niebla que limita el draw distance.
- **Datos centralizados en `data/`.** No hay constantes mágicas en la lógica:
  velocidad, cámara, mundo y misiones se configuran en `config.ts`/`missions.ts`.
- **Colisiones AABB + círculo (vista superior).** Sencillo, predecible y barato;
  suficiente para un sandbox y extensible a la ciudad.

## Preparado para las próximas fases

- `Player`/`PlayerController`/`PlayerModel`/`PlayerStats` separados → el modelo
  GLB definitivo sustituirá a `PlayerModel` sin tocar lógica.
- `SceneManager` → menús, carga y nuevas zonas de la ciudad.
- `InputManager` → bindings por acción; el gamepad se fusiona en `getMoveAxis`.
- `NPCManager`/`VehicleManager`/`DialogueManager` ya corren en el loop.
- `MissionManager` con estados LOCKED/AVAILABLE/ACTIVE/COMPLETED/FAILED y
  límites de tiempo.
- `SaveManager` (localStorage) + `Player.serialize()/restore()`.
- `AudioManager` con API `playSfx/playMusic` lista para la fase de sonido.
- `public/assets/` reservada para modelos GLB, texturas y audio reales.
