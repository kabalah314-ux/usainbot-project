import { MissionState } from "../Mission";
import type { Mission } from "../Mission";
import type { DialogueLine } from "../../data/types";
import { MISSION_TYPE_STYLE, missionTag } from "../../data/missionTypes";
import type { MissionScript, MissionScriptContext } from "./MissionScript";

/**
 * Diálogos de misión dirigidos por datos (MissionData.dialogue):
 * ofrecer → aceptar (empieza la misión), recordatorios por objetivo,
 * diálogos con otros NPCs (talk), entrega, vuelta y frases posteriores.
 * Cada conversación de misión muestra la etiqueta del tipo
 * (A PIE · CONDUCCIÓN en azul · HÍBRIDA) para que se sepa qué se acepta.
 */
export class MissionDirector implements MissionScript {
  readonly missionId = "*";
  private ctx: MissionScriptContext | null = null;

  attach(ctx: MissionScriptContext): void {
    this.ctx = ctx;
  }

  handleTalk(npcId: string, speaker: string): boolean {
    const ctx = this.ctx;
    if (!ctx) return false;
    const missions = ctx.missions;
    const say = (lines: DialogueLine[], mission: Mission | null, onClose?: () => void): true => {
      ctx.dialogue.open({ speaker, lines, onClose, tag: mission ? `${missionTag(mission.data.missionType)}<b>${mission.title}</b>` : undefined });
      return true;
    };
    const active = missions.active;

    if (active) {
      const obj = active.currentObjective;
      if (obj?.data.type === "DELIVER_ITEM" && obj.data.npc === npcId) {
        // Entrega: al cerrarse el diálogo, el tracker retira el objeto (npc:talkEnd)
        const item = obj.data.item ?? "";
        if (!ctx.inventory.has(item, obj.data.count ?? 1)) return say(["¿Y mi encargo? No lo llevas encima…"], active);
        return say(active.data.dialogue?.deliver ?? ["¡Gracias! Justo lo que esperaba."], active);
      }
      if (obj?.data.type === "TALK_TO_NPC" && obj.data.npc === npcId) {
        // Vuelta con el NPC: al cerrarse, el tracker completa el objetivo (npc:talkEnd)
        const lines =
          active.giver === npcId
            ? (active.data.dialogue?.complete ?? ["¡Bien hecho!"])
            : (active.data.dialogue?.talk?.[obj.id] ?? ["¿Me buscabas?"]);
        return say(lines, active);
      }
      if (active.giver === npcId) {
        const r = active.data.dialogue?.reminders;
        return say((obj && r?.[obj.id]) ?? r?.default ?? [`¡Venga! ${obj?.description ?? ""}`], active);
      }
      if (missions.all().some((m) => m.giver === npcId && m.state === MissionState.Available)) {
        return say(["Termina primero lo que tienes entre manos y luego hablamos."], null);
      }
      return false;
    }

    const offer = missions.all().find((m) => m.giver === npcId && m.state === MissionState.Available);
    if (offer) {
      return say(offer.data.dialogue?.offer ?? [offer.description], offer, () => {
        if (!missions.startMission(offer.id)) return;
        const style = MISSION_TYPE_STYLE[offer.data.missionType];
        ctx.notify(`NUEVA ${style.label}: ${offer.title}`, "success");
        for (const [item, n] of Object.entries(offer.data.startItems ?? {})) ctx.inventory.add(item, n);
        const first = offer.currentObjective;
        if (first) ctx.notify(`OBJETIVO: ${first.description}`, "info");
      });
    }
    const done = [...missions.all()]
      .reverse()
      .find((m) => m.giver === npcId && m.state === MissionState.Completed && m.data.dialogue?.after);
    if (done?.data.dialogue?.after) return say(done.data.dialogue.after, done);
    return false;
  }
}
