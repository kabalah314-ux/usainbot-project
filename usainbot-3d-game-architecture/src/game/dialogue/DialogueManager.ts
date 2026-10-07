/**
 * Conversaciones por turnos (NPCs, misiones). Solo gestiona el estado;
 * la presentación la hace ui/DialogueBox. Mientras hay diálogo el juego
 * bloquea el control del jugador.
 */
import type { DialogueLine } from "../data/types";

export interface DialogueRequest {
  speaker: string;
  lines: DialogueLine[];
  onClose?: () => void;
}

export type DialogueListener = (speaker: string | null, text: string | null, index: number, total: number) => void;

export class DialogueManager {
  private current: DialogueRequest | null = null;
  private index = 0;
  private listeners: DialogueListener[] = [];

  get active(): boolean {
    return this.current !== null;
  }

  /** Compatibilidad con la API de la fase 1. */
  get activeDialogue(): string | null {
    return this.current?.speaker ?? null;
  }

  onChange(listener: DialogueListener): void {
    this.listeners.push(listener);
  }

  open(request: DialogueRequest): void {
    if (request.lines.length === 0) {
      request.onClose?.();
      return;
    }
    this.current = request;
    this.index = 0;
    this.emit();
  }

  /** Pasa a la siguiente línea o cierra el diálogo. */
  advance(): void {
    if (!this.current) return;
    this.index++;
    if (this.index >= this.current.lines.length) {
      this.end();
      return;
    }
    this.emit();
  }

  end(): void {
    const closing = this.current;
    this.current = null;
    this.index = 0;
    for (const l of this.listeners) l(null, null, 0, 0);
    closing?.onClose?.();
  }

  update(_dt: number): void {
    // Reservado: diálogos con temporizador o voces.
  }

  private emit(): void {
    if (!this.current) return;
    const line = this.current.lines[this.index];
    const speaker = typeof line === "string" ? this.current.speaker : line.speaker;
    const text = typeof line === "string" ? line : line.text;
    for (const l of this.listeners) l(speaker, text, this.index, this.current.lines.length);
  }
}
