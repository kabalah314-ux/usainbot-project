import { useEffect, useState } from "react";

/**
 * Loads an image and knocks out its (near) white background so the comic sprite
 * can be drawn straight on top of the game world. Also trims empty borders.
 */
export function loadKeyedSprite(src: string, threshold = 226, maxSize = 720): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        const W = c.width;
        const H = c.height;

        // Already has an alpha channel? then don't touch the pixels.
        const corners = [0, (W - 1) * 4, (H - 1) * W * 4, (H * W - 1) * 4];
        const alreadyCut = corners.some((i) => px[i + 3] < 20);

        if (!alreadyCut) {
          // flood fill the white studio background starting from the borders so
          // interior whites (teeth, visor glints) survive.
          const isBg = (i: number) => {
            const r = px[i];
            const g = px[i + 1];
            const b = px[i + 2];
            const lum = (r + g + b) / 3;
            const sat = Math.max(r, g, b) - Math.min(r, g, b);
            return lum > threshold && sat < 26;
          };
          const seen = new Uint8Array(W * H); // 1 = background reached from the edge
          const visited = new Uint8Array(W * H);
          const stack: number[] = [];
          const tryPush = (p: number) => {
            if (p < 0 || p >= W * H || visited[p]) return;
            visited[p] = 1;
            const i = p * 4;
            if (!isBg(i)) return;
            seen[p] = 1;
            px[i + 3] = 0;
            stack.push(p);
          };
          for (let x = 0; x < W; x++) {
            tryPush(x);
            tryPush((H - 1) * W + x);
          }
          for (let y = 0; y < H; y++) {
            tryPush(y * W);
            tryPush(y * W + W - 1);
          }
          while (stack.length) {
            const p = stack.pop() as number;
            const x = p % W;
            if (x > 0) tryPush(p - 1);
            if (x < W - 1) tryPush(p + 1);
            tryPush(p - W);
            tryPush(p + W);
          }
          // soften the halo left by jpeg-ish edges
          for (let p = 0; p < W * H; p++) {
            const i = p * 4;
            if (px[i + 3] === 0) continue;
            const x = p % W;
            const neighbours = [
              x > 0 ? p - 1 : -1,
              x < W - 1 ? p + 1 : -1,
              p - W,
              p + W,
            ].filter((n) => n >= 0 && n < W * H);
            if (!neighbours.some((n) => seen[n])) continue;
            const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
            if (lum > threshold - 34) px[i + 3] = Math.max(0, Math.round(((threshold - lum + 34) / 34) * 200));
          }
        }

        let minX = W;
        let minY = H;
        let maxX = 0;
        let maxY = 0;
        for (let p = 0; p < W * H; p++) {
          if (px[p * 4 + 3] <= 12) continue;
          const x = p % W;
          const y = (p / W) | 0;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        ctx.putImageData(data, 0, 0);
        if (maxX <= minX || maxY <= minY) return resolve(c);
        const pad = 2;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(c.width - 1, maxX + pad);
        maxY = Math.min(c.height - 1, maxY + pad);
        const out = document.createElement("canvas");
        out.width = maxX - minX + 1;
        out.height = maxY - minY + 1;
        const octx = out.getContext("2d");
        if (!octx) return resolve(c);
        octx.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        resolve(out);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const cache = new Map<string, HTMLCanvasElement | null>();

export function useKeyedSprite(src: string) {
  const [sprite, setSprite] = useState<HTMLCanvasElement | null>(() => cache.get(src) ?? null);
  useEffect(() => {
    let alive = true;
    if (cache.has(src)) {
      setSprite(cache.get(src) ?? null);
      return;
    }
    void loadKeyedSprite(src).then((c) => {
      cache.set(src, c);
      if (alive) setSprite(c);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return sprite;
}

export function useImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    const i = new Image();
    i.onload = () => alive && setImg(i);
    i.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}
