import type { MissionData } from "./types";
import { GASOIL_ITEM } from "./items";
import { RACES } from "./races";

/**
 * Misiones. Regla de diseño: HABLAR NO ES EL GAMEPLAY — hablar inicia la
 * misión; después siempre hay acción (conseguir, beber, correr, competir…).
 * ObjectiveTracker completa los objetivos a partir de su `type`.
 */
const reloj = RACES.race_reloj;

export const defaultMissions: MissionData[] = [
  {
    id: "mission_001",
    title: "Robot Diesel",
    description: "Tito Tuercas quiere que pruebes el GasOil, un combustible experimental para robots.",
    reward: 100,
    timeLimit: null,
    giver: "npc_tito",
    unlocks: ["mission_002", "mission_003", "mission_004", "mission_006"],
    objectives: [
      {
        id: "m1_collect",
        type: "COLLECT_ITEM",
        item: GASOIL_ITEM,
        count: 1,
        description: "Consigue una lata de GasOil en la gasolinera",
        target: 1,
        waypoint: "machine_station",
      },
      { id: "m1_drink", type: "USE_ITEM", item: GASOIL_ITEM, description: "Bébetela: pulsa G (recarga el TURBO)", target: 1 },
      { id: "m1_turbo", type: "USE_TURBO", seconds: 1.5, description: "Mantén SHIFT para usar el TURBO", target: 1 },
      { id: "m1_return", type: "TALK_TO_NPC", npc: "npc_tito", description: "Vuelve con Tito Tuercas al garaje", target: 1 },
    ],
    dialogue: {
      offer: [
        "¡Hombre, UsainBot! El campeón del mundo en mi garaje.",
        "Me ha llegado un combustible experimental para robots: se llama GasOil. Quieren que lo pruebe alguien… rápido.",
        "Ve a la gasolinera GasOil Stop: sube por la Avenida Bolt hasta la Calle Gasolina. Las máquinas están junto a la tienda.",
        "Te lo bebes con G, como un refresco. Luego mantén SHIFT y verás lo que es un TURBO de verdad.",
      ],
      reminders: {
        m1_collect: ["¿Aún sin GasOil? Sigue el marcador hasta la gasolinera."],
        m1_drink: ["¡Que no me la traigas! Bébetela tú: pulsa G."],
        m1_turbo: ["Ahora mantén SHIFT mientras corres. Cuidado con las curvas: con turbo se derrapa."],
      },
      complete: [
        "¿Y bien? ¿Qué tal corre ese GasOil?",
        { speaker: "UsainBot", text: "Sabe a tornillo. Me encanta." },
        "¡Lo sabía! Te he visto pasar como un rayo. Casi me quita el bigote.",
        "Por cierto: Rayo Martínez va diciendo por la Avenida Bolt que es más rápido que tú. Y Lola, la de la gasolinera, te busca.",
      ],
      after: ["Cuando tenga un coche a tu altura, te aviso. De momento, tus piernas son más rápidas que cualquier motor."],
    },
  },
  {
    id: "mission_002",
    title: "Demuestra tu velocidad",
    description: "Rayo Martínez te desafía a una carrera por el barrio.",
    reward: 150,
    timeLimit: null,
    giver: "npc_rayo",
    objectives: [
      {
        id: "m2_start",
        type: "GO_TO_LOCATION",
        race: "race_demuestra",
        description: "Ve a la línea de salida (Avenida Bolt)",
        target: 1,
      },
      {
        id: "m2_race",
        type: "RACE_TO_LOCATION",
        race: "race_demuestra",
        description: "¡Corre hasta la meta! Gestiona el turbo en las rectas",
        target: 1,
      },
      { id: "m2_return", type: "TALK_TO_NPC", npc: "npc_rayo", description: "Vuelve con Rayo Martínez", target: 1 },
    ],
    dialogue: {
      offer: [
        "Dicen que eres el robot más rápido del mundo.",
        { speaker: "UsainBot", text: "Eso dicen." },
        "Entonces demuéstralo.",
        "Salida en la avenida, cuatro checkpoints, meta en la Calle Oeste. Tienes 25 segundos.",
        "Consejo gratis: si usas el turbo en las curvas, te comes la pared. Guárdalo para las rectas.",
      ],
      reminders: { default: ["La salida está aquí mismo, en la avenida. ¿Te da miedo o qué?"] },
      complete: [
        "Vale… lo he visto. Ha sido… rápido.",
        { speaker: "UsainBot", text: "Eso dicen." },
        "Toma, te lo has ganado. Pero la próxima vez me tomo dos GasOil.",
      ],
      after: ["Estoy entrenando. Un día de estos te gano. Hoy no."],
    },
  },
  {
    id: "mission_003",
    title: "Más rápido que el reloj",
    description: "Lola quiere grabar un anuncio de GasOil: beber, turbo y a contrarreloj.",
    reward: 200,
    timeLimit: null,
    giver: "npc_lola",
    objectives: [
      {
        id: "m3_collect",
        type: "COLLECT_ITEM",
        item: GASOIL_ITEM,
        count: 1,
        description: "Consigue una lata de GasOil",
        target: 1,
        waypoint: "nearest:GASOIL_MACHINE",
      },
      { id: "m3_drink", type: "USE_ITEM", item: GASOIL_ITEM, description: "Bébetela delante de la cámara (G)", target: 1 },
      {
        id: "m3_goto_a",
        type: "GO_TO_LOCATION",
        location: { x: reloj.start.x, z: reloj.start.z, radius: 5, label: "PUNTO A" },
        description: "Ve al punto A (oeste de la Calle Gasolina)",
        target: 1,
      },
      {
        id: "m3_turbo",
        type: "USE_TURBO",
        seconds: 0.3,
        location: { x: reloj.start.x, z: reloj.start.z, radius: 12, label: "PUNTO A" },
        description: "Activa el TURBO (SHIFT) en el punto A: ¡arranca el reloj!",
        target: 1,
      },
      {
        id: "m3_timer",
        type: "COMPLETE_TIMER",
        race: "race_reloj",
        description: `Llega al punto B antes de ${reloj.timeLimit} s`,
        target: 1,
      },
      { id: "m3_return", type: "TALK_TO_NPC", npc: "npc_lola", description: "Vuelve con Lola a GasOil Stop", target: 1 },
    ],
    dialogue: {
      offer: [
        "¡UsainBot! Soy Lola, de GasOil Stop. La marca quiere un anuncio contigo.",
        "El guion: te bebes un GasOil, vas al punto A, activas el turbo y llegas al punto B antes de que acabe el reloj.",
        "Consigue una lata y bébetela con G. Sin GasOil no hay turbo, y sin turbo no hay anuncio.",
      ],
      reminders: {
        default: ["¡Acción! Recuerda: GasOil → turbo → punto B antes de que acabe el reloj."],
        m3_drink: ["Si el turbo ya está lleno no te deja beber: gasta un poco con SHIFT primero."],
      },
      complete: [
        "¡CORTEN! ¡Perfecto! Hasta el cámara se ha despeinado.",
        { speaker: "UsainBot", text: "¿Salgo guapo?" },
        "Sales borroso. Eres demasiado rápido para la cámara. ¡Eso vende! Toma tu caché.",
      ],
      after: ["El anuncio sale en la tele del salón de tu mansión. Míralo, sales borroso."],
    },
  },
  {
    id: "mission_004",
    title: "Entrega urgente",
    description: "Pepa necesita que lleves una tarta al Abuelo Ernesto, en el parque. En coche hasta donde se pueda; el resto, corriendo.",
    reward: 180,
    timeLimit: null,
    giver: "npc_pepa",
    startItems: { tarta: 1 },
    unlocks: ["mission_005"],
    objectives: [
      { id: "m4_garage", type: "GO_TO_LOCATION", location: { x: -25, z: 146, radius: 7, label: "GARAJE" }, description: "Ve al garaje de la mansión", target: 1 },
      { id: "m4_enter", type: "ENTER_VEHICLE", description: "Sube al BOLT-MOBILE (E)", target: 1 },
      { id: "m4_drive", type: "DRIVE_TO_LOCATION", location: { x: 54, z: -9, radius: 14, label: "APARCAMIENTO GALERÍA" }, description: "Conduce hasta el aparcamiento de la galería", target: 1 },
      { id: "m4_park", type: "PARK_VEHICLE", location: { x: 54, z: -9, radius: 7, label: "PLAZA DE APARCAMIENTO" }, maxSpeed: 0.8, hold: 1, description: "Aparca en la zona marcada (para del todo)", target: 1 },
      { id: "m4_exit", type: "EXIT_VEHICLE", description: "Baja del coche (F)", target: 1 },
      { id: "m4_run", type: "GO_TO_LOCATION", onFoot: true, location: { x: -6.4, z: -121, radius: 5, label: "ABUELO ERNESTO (PARQUE)" }, description: "Corre al parque: el coche no cabe entre los bolardos", target: 1 },
      { id: "m4_deliver", type: "DELIVER_ITEM", npc: "npc_ernesto", item: "tarta", description: "Entrega la tarta al Abuelo Ernesto (E)", target: 1 },
      { id: "m4_return", type: "TALK_TO_NPC", npc: "npc_pepa", description: "Vuelve con Pepa", target: 1 },
    ],
    dialogue: {
      offer: [
        "¡UsainBot, qué suerte! Es el cumpleaños del Abuelo Ernesto y se me ha pasado la hora.",
        "Llévale esta tarta al parque. Coge tu coche del garaje, aparca en la galería y el último tramo, corriendo: en el parque no entran coches.",
        { speaker: "UsainBot", text: "¿Y si corro todo el camino?" },
        "¡Que se te derrite la nata! Coche hasta la galería, y luego piernas. Y ni se te ocurra saltar con ella.",
      ],
      reminders: {
        default: ["¡La nata, UsainBot, la nata! Coche hasta la galería y luego al parque corriendo."],
        m4_run: ["El parque tiene bolardos: el coche se queda fuera. ¡A correr!"],
      },
      deliver: [
        "¿Una tarta? ¿Para mí? ¡Hacía 40 años que nadie me traía nada tan rápido!",
        { speaker: "UsainBot", text: "De parte de Pepa. Feliz cumpleaños." },
        "Dile a Pepa que es la mejor. Y a ti… que te sienten bien esas piernas de hojalata.",
      ],
      complete: ["¿Ha llegado entera? ¡Eres un sol con ruedas! Bueno, con piernas. Toma, por las molestias."],
      after: ["La próxima tarta te la hago a ti. De tornillos, si quieres."],
    },
  },
  {
    id: "mission_005",
    title: "El atajo del campeón",
    description: "Manolo te reta: en coche hasta el punto de relevo y, desde allí, cruzar el parque corriendo con GasOil y turbo.",
    reward: 250,
    timeLimit: null,
    giver: "npc_jogger",
    startItems: { gasoil_can: 1 },
    objectives: [
      { id: "m5_enter", type: "ENTER_VEHICLE", description: "Sube a tu coche", target: 1 },
      { id: "m5_drive", type: "DRIVE_TO_LOCATION", location: { x: -98, z: -95, radius: 9, label: "PUNTO DE RELEVO" }, description: "Conduce al punto de relevo (oeste de la Calle del Parque)", target: 1 },
      { id: "m5_exit", type: "EXIT_VEHICLE", description: "Deja el coche: el parque se cruza A PIE (F)", target: 1 },
      { id: "m5_start", type: "GO_TO_LOCATION", race: "race_atajo", onFoot: true, description: "Ponte en la salida junto al parque", target: 1 },
      { id: "m5_race", type: "RACE_TO_LOCATION", race: "race_atajo", description: "¡Cruza el parque! Regla: bebe GasOil (G) y usa TURBO", target: 1 },
      { id: "m5_return", type: "TALK_TO_NPC", npc: "npc_jogger", description: "Vuelve con Manolo (Avenida Bolt)", target: 1 },
    ],
    dialogue: {
      offer: [
        "Tengo una teoría: el coche es para ir lejos, pero para ir RÁPIDO hay que bajarse.",
        "Lleva el coche al punto de relevo, al oeste de la Calle del Parque. Desde allí, cruza el parque hasta la meta del otro lado.",
        "Condición del reto: tienes que BEBERTE un GasOil en plena carrera y usar el TURBO. Toma, invita la casa.",
        { speaker: "UsainBot", text: "¿Beber corriendo? Paro un segundo. Uno." },
      ],
      reminders: { default: ["Coche hasta el relevo, y luego parque a pie: GasOil + turbo. ¡Venga!"] },
      complete: [
        "¡Lo sabía! Ningún coche cruza el parque así de rápido.",
        { speaker: "UsainBot", text: "El coche es para llegar. Las piernas, para ganar." },
        "Me lo apunto para mi libro de autoayuda. Toma tu premio.",
      ],
      after: ["Sigo con mi teoría: un día corro yo también así. Sin GasOil. Con fe."],
    },
  },
  {
    id: "mission_006",
    title: "¿Eso es todo?",
    description: "Dani no se cree que seas tan rápido. Carrera con checkpoints por el barrio: avenida, parque, callejón y galería.",
    reward: 175,
    timeLimit: null,
    giver: "npc_teen_a",
    objectives: [
      { id: "m6_start", type: "GO_TO_LOCATION", race: "race_eso", description: "Ve a la salida (Avenida Bolt)", target: 1 },
      { id: "m6_race", type: "RACE_TO_LOCATION", race: "race_eso", description: "Avenida → parque → callejón → máquina GasOil → meta", target: 1 },
      { id: "m6_return", type: "TALK_TO_NPC", npc: "npc_teen_a", description: "Vuelve con Dani (galería comercial)", target: 1 },
    ],
    dialogue: {
      offer: [
        "¿Tú eres el robot más rápido del mundo? Te he visto en la tele y… meh.",
        { speaker: "UsainBot", text: "¿Meh?" },
        "Carrera: avenida, parque, el callejón del Robo-Burger, la máquina de GasOil de la galería y meta en la gasolinera.",
        "Entre las casas hay un hueco en el seto por donde se ataja. Si lo encuentras. ¿Eso es todo lo que tienes?",
      ],
      reminders: { default: ["La salida está en la avenida. ¿O te da miedo un chaval?"] },
      complete: [
        "Vale. VALE. Lo he grabado y no se ve nada: solo una mancha amarilla.",
        { speaker: "UsainBot", text: "¿Eso es todo?" },
        "…Toma. Me lo tenía merecido.",
      ],
      after: ["He subido tu carrera: 2 millones de visitas. Todas mías."],
    },
  },
];
