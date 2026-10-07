import type { PlayerState } from "../player/Player";
import type { MissionState } from "../missions/Mission";
import type { DebugMessageKind } from "../core/DebugSystem";
import type { InputDevice } from "../core/input/bindings";
import type { RaceHudInfo } from "../race/RaceManager";
import { formatTime } from "../missions/ObjectiveTracker";
import { HUD_HINTS, HUD_HINTS_VEHICLE, kbd, renderHint } from "./controls";
import { createCanIconDataURL } from "../gasoil/branding";

/**
 * HUD de juego (estética consola, controles de PC):
 * TURBO + velocidad · GASOIL ×N · dinero · misión/objetivo/distancia ·
 * panel de carrera y cuenta atrás · avisos · ayuda de controles.
 * DOM imperativo: solo se escribe lo que cambia.
 */
export interface HudState {
  speed: number;
  state: PlayerState;
  /** 0..1 de la reserva de turbo. */
  turbo: number;
  turboActive: boolean;
  money: number;
  gasoil: number;
  missionTitle: string | null;
  missionState: MissionState | null;
  objective: string | null;
  objectiveDistance: number | null;
  prompt: string | null;
  device: InputDevice;
  race: RaceHudInfo | null;
  /** A pie o conduciendo (cambia controles, turbo y velocímetro). */
  mode: "foot" | "vehicle";
  vehicleName: string | null;
  /** Velocidad del vehículo con signo (m/s). */
  vehicleSpeed: number;
}

const SEGMENTS = 20;
/** La ayuda de controles desaparece sola tras este tiempo de juego (s). */
const HELP_AUTO_HIDE = 150;

export class HUD {
  private root: HTMLDivElement | null = null;
  private el: Record<string, HTMLElement | null> = {};
  private segs: HTMLElement[] = [];
  private lastValues: Record<string, string> = {};
  private toastQueue: Array<{ text: string; kind: string }> = [];
  private toastTimer = 0;
  private bannerTimer = 0;
  private zoneTimer = 0;
  private turboFlashTimer = 0;
  private turboDenyTimer = 0;
  private helpTime = 0;
  private helpVisible = true;
  private lastTurbo = -1;
  private mode: "foot" | "vehicle" = "foot";

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "ub-hud";
    root.innerHTML = `
      <div class="ub-hud__brand"><h1>USAINBOT</h1><div class="ub-hud__build">BARRIO BOLT · v0.4</div></div>
      <div class="ub-hud__mission" hidden>
        <div class="ub-hud__mission-top">
          <span class="ub-hud__mission-badge"></span>
          <span class="ub-hud__mission-title"></span>
        </div>
        <div class="ub-hud__objective"></div>
      </div>
      <div class="ub-hud__wallet">
        <span class="ub-hud__money"></span>
        <span class="ub-hud__item" title="GasOil">
          <img alt="GasOil" src="${createCanIconDataURL()}" />
          <span class="ub-hud__item-name">GASOIL</span>
          <b class="ub-hud__item-count"></b>
        </span>
      </div>
      <div class="ub-hud__race" hidden>
        <div class="ub-hud__race-name"></div>
        <div class="ub-hud__race-row"><span>TIME</span><b class="ub-race-time"></b></div>
        <div class="ub-hud__race-row ub-hud__race-row--target"><span>TARGET</span><b class="ub-race-target"></b></div>
        <div class="ub-hud__race-row"><span>CHECKPOINT</span><b class="ub-race-cp"></b></div>
        <div class="ub-hud__race-row"><span>META</span><b class="ub-race-dist"></b></div>
      </div>
      <div class="ub-hud__countdown" hidden></div>
      <div class="ub-hud__turbo">
        <div class="ub-hud__turbo-head">
          <span class="ub-hud__turbo-label">TURBO</span>
          <span class="ub-hud__turbo-tag"></span>
          <span class="ub-hud__speed"></span>
        </div>
        <div class="ub-hud__turbo-bar">${Array.from({ length: SEGMENTS }, () => "<i></i>").join("")}</div>
      </div>
      <div class="ub-hud__vehicle" hidden>
        <span class="ub-hud__vehicle-name"></span>
        <b class="ub-hud__vehicle-speed"></b><small>KM/H</small>
        <span class="ub-hud__vehicle-gear"></span>
      </div>
      <div class="ub-hud__prompt" hidden></div>
      <div class="ub-hud__toast" hidden></div>
      <div class="ub-hud__zone" hidden></div>
      <div class="ub-hud__banner" hidden><strong></strong><span></span></div>
      <div class="ub-hud__feed"></div>
      <div class="ub-hud__help">${HUD_HINTS.map(renderHint).join("")}<em>${kbd("H")} ocultar</em></div>
    `;
    container.appendChild(root);
    this.root = root;
    const q = (s: string): HTMLElement | null => root.querySelector(s);
    this.el = {
      mission: q(".ub-hud__mission"),
      missionTitle: q(".ub-hud__mission-title"),
      missionBadge: q(".ub-hud__mission-badge"),
      objective: q(".ub-hud__objective"),
      money: q(".ub-hud__money"),
      item: q(".ub-hud__item"),
      itemCount: q(".ub-hud__item-count"),
      race: q(".ub-hud__race"),
      raceName: q(".ub-hud__race-name"),
      raceTime: q(".ub-race-time"),
      raceTarget: q(".ub-race-target"),
      raceCp: q(".ub-race-cp"),
      raceDist: q(".ub-race-dist"),
      countdown: q(".ub-hud__countdown"),
      turbo: q(".ub-hud__turbo"),
      turboTag: q(".ub-hud__turbo-tag"),
      speed: q(".ub-hud__speed"),
      prompt: q(".ub-hud__prompt"),
      toast: q(".ub-hud__toast"),
      zone: q(".ub-hud__zone"),
      banner: q(".ub-hud__banner"),
      bannerTitle: q(".ub-hud__banner strong"),
      bannerSub: q(".ub-hud__banner span"),
      feed: q(".ub-hud__feed"),
      help: q(".ub-hud__help"),
      vehicle: q(".ub-hud__vehicle"),
      vehicleName: q(".ub-hud__vehicle-name"),
      vehicleSpeed: q(".ub-hud__vehicle-speed"),
      vehicleGear: q(".ub-hud__vehicle-gear"),
    };
    this.segs = Array.from(root.querySelectorAll(".ub-hud__turbo-bar i"));
  }

  private setText(key: string, value: string): void {
    const el = this.el[key];
    if (!el || this.lastValues[key] === value) return;
    this.lastValues[key] = value;
    el.textContent = value;
  }

  private setHTML(key: string, value: string): void {
    const el = this.el[key];
    if (!el || this.lastValues[key] === value) return;
    this.lastValues[key] = value;
    el.innerHTML = value;
  }

  private toggleClass(key: string, cls: string, on: boolean): void {
    this.el[key]?.classList.toggle(cls, on);
  }

  /** Cambia la ayuda de controles y los paneles entre a pie y coche. */
  private setMode(mode: "foot" | "vehicle"): void {
    if (mode === this.mode) return;
    this.mode = mode;
    const hints = mode === "vehicle" ? HUD_HINTS_VEHICLE : HUD_HINTS;
    if (this.el.help) this.el.help.innerHTML = `${hints.map(renderHint).join("")}<em>${kbd("H")} ocultar</em>`;
    if (this.el.vehicle) this.el.vehicle.hidden = mode !== "vehicle";
    this.toggleClass("turbo", "ub-hud__turbo--off", mode === "vehicle");
    if (this.helpVisible === false && mode === "vehicle") this.setHelp(true);
    if (mode === "vehicle") this.helpTime = Math.min(this.helpTime, 150 - 20);
  }

  update(dt: number, s: HudState, playing: boolean): void {
    this.setMode(s.mode);
    if (s.mode === "vehicle") {
      this.setText("vehicleName", s.vehicleName ?? "");
      this.setText("vehicleSpeed", String(Math.round(Math.abs(s.vehicleSpeed) * 3.6)));
      this.setText("vehicleGear", s.vehicleSpeed < -0.3 ? "R" : Math.abs(s.vehicleSpeed) < 0.3 ? "N" : "D");
    }
    // Dinero e inventario
    this.setText("money", `₲ ${s.money}`);
    this.setText("itemCount", `×${s.gasoil}`);
    this.toggleClass("item", "ub-hud__item--empty", s.gasoil === 0);

    // TURBO: barra segmentada en tiempo real
    const filled = Math.round(s.turbo * SEGMENTS);
    if (filled !== this.lastTurbo) {
      this.segs.forEach((seg, i) => seg.classList.toggle("on", i < filled));
      this.lastTurbo = filled;
    }
    this.turboFlashTimer = Math.max(0, this.turboFlashTimer - dt);
    this.turboDenyTimer = Math.max(0, this.turboDenyTimer - dt);
    this.toggleClass("turbo", "ub-hud__turbo--active", s.turboActive);
    this.toggleClass("turbo", "ub-hud__turbo--flash", this.turboFlashTimer > 0);
    this.toggleClass("turbo", "ub-hud__turbo--deny", this.turboDenyTimer > 0);
    const tag = s.mode === "vehicle" ? "SOLO A PIE" : this.turboDenyTimer > 0 ? "NO TURBO" : s.turbo >= 0.999 ? "FULL" : s.state === "drinking" ? "RECARGANDO" : `${Math.round(s.turbo * 100)}%`;
    this.setText("turboTag", tag);
    this.setText("speed", `${Math.round(s.speed * 3.6)} KM/H`);

    // Misión + objetivo + distancia
    const showMission = s.missionTitle !== null && s.missionState !== null;
    if (this.el.mission) this.el.mission.hidden = !showMission;
    if (showMission) {
      this.setText("missionTitle", `MISIÓN: ${s.missionTitle}`);
      this.setText("missionBadge", s.missionState ?? "");
      const badge = this.el.missionBadge;
      if (badge) badge.className = `ub-hud__mission-badge ub-badge--${(s.missionState ?? "").toLowerCase()}`;
      const dist = s.objectiveDistance !== null && s.objectiveDistance > 3 ? ` · ${Math.round(s.objectiveDistance)} m` : "";
      this.setText("objective", s.objective ? `▸ ${s.objective}${dist}` : "");
    }

    // Carrera
    const race = s.race;
    if (this.el.race) this.el.race.hidden = !race;
    if (race) {
      this.setText("raceName", race.name.toUpperCase());
      this.setText("raceTime", formatTime(race.time));
      this.setText("raceTarget", formatTime(race.limit));
      this.setText("raceCp", race.total > 0 ? `${race.checkpoint}/${race.total}` : "—");
      this.setText("raceDist", `${Math.round(race.distanceToFinish)} m`);
      this.toggleClass("race", "ub-hud__race--late", race.time > race.limit * 0.85 && race.phase === "running");
    }
    const count = race?.countdown ?? null;
    if (this.el.countdown) {
      this.el.countdown.hidden = count === null;
      if (count !== null && this.lastValues.countdown !== count) {
        this.lastValues.countdown = count;
        this.el.countdown.textContent = count;
        this.el.countdown.classList.remove("ub-hud__countdown--pop");
        void this.el.countdown.offsetWidth;
        this.el.countdown.classList.add("ub-hud__countdown--pop");
      }
      if (count === null) this.lastValues.countdown = "";
    }

    // Aviso de interacción
    const prompt = this.el.prompt;
    if (prompt) {
      prompt.hidden = s.prompt === null;
      if (s.prompt) this.setHTML("prompt", `${kbd("E")} ${s.prompt}`);
    }

    // Ayuda de controles: discreta, se oculta sola
    if (playing) this.helpTime += dt;
    if (this.helpVisible && this.helpTime > HELP_AUTO_HIDE) this.setHelp(false);

    this.tickToasts(dt);
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0 && this.el.banner) this.el.banner.hidden = true;
    }
    if (this.zoneTimer > 0) {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0 && this.el.zone) this.el.zone.hidden = true;
    }
  }

  setHelp(visible: boolean): void {
    this.helpVisible = visible;
    this.el.help?.classList.toggle("ub-hud__help--hidden", !visible);
  }

  toggleHelp(): void {
    this.setHelp(!this.helpVisible);
    if (this.helpVisible) this.helpTime = 0;
  }

  /** Destello de la barra al recargar con GasOil. */
  flashTurbo(): void {
    this.turboFlashTimer = 0.9;
  }

  /** Aviso "NO TURBO" (SHIFT sin reserva). */
  denyTurbo(): void {
    this.turboDenyTimer = 1.1;
  }

  toast(text: string, kind: "info" | "success" | "warn" = "info"): void {
    this.toastQueue.push({ text, kind });
    if (this.toastQueue.length > 4) this.toastQueue.shift();
  }

  banner(title: string, subtitle: string): void {
    if (!this.el.banner || !this.el.bannerTitle || !this.el.bannerSub) return;
    this.el.bannerTitle.textContent = title;
    this.el.bannerSub.textContent = subtitle;
    this.el.banner.hidden = false;
    this.el.banner.classList.remove("ub-hud__banner--in");
    void this.el.banner.offsetWidth;
    this.el.banner.classList.add("ub-hud__banner--in");
    this.bannerTimer = 4;
  }

  showZone(name: string): void {
    if (!this.el.zone) return;
    this.el.zone.textContent = name;
    this.el.zone.hidden = false;
    this.el.zone.classList.remove("ub-hud__zone--in");
    void this.el.zone.offsetWidth;
    this.el.zone.classList.add("ub-hud__zone--in");
    this.zoneTimer = 2.6;
  }

  private tickToasts(dt: number): void {
    const el = this.el.toast;
    if (!el) return;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer > 0) return;
      el.hidden = true;
    }
    const next = this.toastQueue.shift();
    if (!next) return;
    el.textContent = next.text;
    el.className = `ub-hud__toast ub-hud__toast--${next.kind}`;
    el.hidden = false;
    this.toastTimer = 2.4;
  }

  postMessage(text: string, kind: DebugMessageKind = "info"): void {
    const feed = this.el.feed;
    if (!feed) return;
    const msg = document.createElement("div");
    msg.className = `ub-msg ub-msg--${kind}`;
    msg.textContent = text;
    feed.appendChild(msg);
    while (feed.children.length > 4) feed.firstChild?.remove();
  }

  dispose(): void {
    this.root?.remove();
    this.root = null;
  }
}
