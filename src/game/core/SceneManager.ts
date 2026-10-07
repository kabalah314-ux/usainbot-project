import type * as THREE from "three";

/**
 * Contrato de escena. Cada escena encapsula su contenido 3D (root)
 * y su actualización. Permite añadir después: menú, carga, pausa,
 * nuevas zonas de la ciudad, etc.
 */
export interface IScene {
  readonly name: string;
  readonly root: THREE.Scene;
  enter(): void;
  exit(): void;
  /** Se llama cada frame; la escena organiza sus fases internas. */
  update(dt: number): void;
}

export class SceneManager {
  private scenes = new Map<string, IScene>();
  private current: IScene | null = null;

  register(scene: IScene): void {
    if (this.scenes.has(scene.name)) {
      throw new Error(`[SceneManager] escena duplicada: ${scene.name}`);
    }
    this.scenes.set(scene.name, scene);
  }

  setActive(name: string): void {
    const next = this.scenes.get(name);
    if (!next) {
      console.warn(`[SceneManager] escena desconocida: "${name}"`);
      return;
    }
    if (this.current === next) return;
    this.current?.exit();
    this.current = next;
    next.enter();
  }

  get active(): IScene | null {
    return this.current;
  }

  get activeName(): string {
    return this.current?.name ?? "—";
  }
}
