import { useMemo } from "react";
import { useKeyedSprite } from "../lib/sprite";

/** Renders an image with its white studio background knocked out. */
export default function KeyedImg({
  src,
  className,
  alt = "",
  ratio = "4 / 3",
}: {
  src: string;
  className?: string;
  alt?: string;
  ratio?: string;
}) {
  const sprite = useKeyedSprite(src);
  const url = useMemo(() => {
    if (!sprite) return null;
    try {
      return sprite.toDataURL("image/png");
    } catch {
      return null;
    }
  }, [sprite]);
  if (!url) return <div className={className} style={{ aspectRatio: ratio }} aria-hidden />;
  return <img src={url} alt={alt} className={className} draggable={false} />;
}
