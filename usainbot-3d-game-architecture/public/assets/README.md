# Assets de USAINBOT

Hoy todo el contenido es **procedural** (código + texturas canvas pequeñas).
Estas carpetas reciben los assets definitivos sin tocar la lógica:

| Carpeta | Contenido previsto | Sustituye a (código actual) |
|---|---|---|
| `characters/` | UsainBot GLB, vecinos | `player/model/*`, `npc/NPCModel.ts` |
| `buildings/` | Mansión, casas, tiendas, gasolinera | `world/zones/*`, `world/buildings/*` |
| `vehicles/` | Coches (futuro sistema de conducción) | `addCar` en `world/Props.ts` |
| `props/` | Farolas, bancos, buzones, contenedores… | `world/Props.ts`, `world/cityProps.ts` |
| `environment/` | Árboles, cielo, agua, terreno | `world/Sky.ts`, `TreeField` |
| `gasoil/can/` | Lata/botella de GasOil | `drawCan` en `gasoil/branding.ts` |
| `gasoil/machine/` | Máquina expendedora | `gasoil/GasOilMachine.ts` |
| `gasoil/signs/` | Carteles y anuncios | atlas de `gasoil/branding.ts` |
| `gasoil/icons/` | Iconos de HUD/mapa | `createCanIconDataURL` |
| `gasoil/materials/` | Materiales/paleta de marca | `GASOIL_BRAND` en `data/cityLayout.ts` |
| `ui/` | Iconos, fuentes, marcos del HUD | `ui/*.ts` |
| `audio/` | Música por zonas, SFX, ambiente | `audio/AudioManager.ts` |
| `textures/` | Texturas low-res (estética PS2) | `utils/textures.ts` |

Convención: `kebab-case`, sin espacios; GLB con texturas embebidas y
≤ 512 px por textura para mantener la estética y el rendimiento.
