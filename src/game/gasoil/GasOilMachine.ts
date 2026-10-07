import { aabb } from "../world/colliders";
import { localToWorld } from "../world/cityProps";
import type { GasOilMachineSpec, ZoneContext } from "../world/zones/Zone";
import { offRoad } from "../world/roads/roadUtil";
import { GASOIL_BRAND } from "../data/cityLayout";
import { GASOIL_UV } from "./branding";

/**
 * Máquina expendedora de GasOil: cuerpo (StaticBatcher), frontal iluminado
 * (atlas de GasOil → brilla con el bloom), colisión y POI.
 * La lógica de compra vive en GasOilService.
 */
export function addGasOilMachine(ctx: ZoneContext, spec: GasOilMachineSpec): void {
  // Nunca sobre el asfalto: la máquina se ajusta a la acera más cercana
  // (así el punto de uso, el POI y la colisión coinciden con su sitio real).
  const [sx, sz] = offRoad(spec.x, spec.z, 0.7);
  spec.x = sx;
  spec.z = sz;
  const b = ctx.props;
  b.setBase(spec.x, 0, spec.z, spec.rotY);
  b.box(1.3, 0.12, 1.0, 0x3a4048, 0, 0.06, 0);
  b.box(1.2, 2.2, 0.85, GASOIL_BRAND.charcoal, 0, 1.22, 0);
  b.box(1.26, 0.34, 0.92, GASOIL_BRAND.orange, 0, 2.45, 0);
  for (const sx of [-0.61, 0.61]) b.box(0.04, 2.0, 0.88, GASOIL_BRAND.orange, sx, 1.2, 0);
  b.box(0.3, 0.3, 0.06, GASOIL_BRAND.yellow, 0, 2.45, 0.47);

  const [fx, fz] = localToWorld(spec.x, spec.z, spec.rotY, 0, 0.432);
  ctx.gasoil.add(fx, 1.24, fz, spec.rotY, 1.04, 2.04, GASOIL_UV.machine);

  const c = Math.abs(Math.cos(spec.rotY));
  const s = Math.abs(Math.sin(spec.rotY));
  ctx.colliders.push(aabb(spec.x, spec.z, 1.2 * c + 0.9 * s, 1.2 * s + 0.9 * c, 2.4));
  ctx.machines.push(spec);
  ctx.pois.define(spec.id, spec.name, "GASOIL_MACHINE", spec.x, spec.z);
}

/** Punto donde se coloca el jugador para usar la máquina (delante del frontal). */
export function machineUsePoint(spec: GasOilMachineSpec): [number, number] {
  return localToWorld(spec.x, spec.z, spec.rotY, 0, 1.1);
}
