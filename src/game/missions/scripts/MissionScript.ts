import type { EventBus } from "../../core/EventBus";
import type { DialogueManager } from "../../dialogue/DialogueManager";
import type { Inventory } from "../../inventory/Inventory";
import type { POIRegistry } from "../../world/poi/POIRegistry";
import type { MissionManager } from "../MissionManager";

/** Servicios que un guion de misión puede usar (sin tocar el resto del juego). */
export interface MissionScriptContext {
  bus: EventBus;
  missions: MissionManager;
  dialogue: DialogueManager;
  inventory: Inventory;
  pois: POIRegistry;
  notify(text: string, kind?: "info" | "success" | "warn"): void;
  celebrate(title: string, subtitle: string): void;
}

/**
 * Guion de una misión: escucha eventos y decide los diálogos de sus NPCs.
 * Añadir una misión = datos en data/missions.ts + un guion como este.
 */
export interface MissionScript {
  readonly missionId: string;
  attach(ctx: MissionScriptContext): void;
  /** Devuelve true si el guion se encarga de la conversación con ese NPC. */
  handleTalk(npcId: string, speaker: string): boolean;
}
