import { useEffect } from "react";
import { config, isPlaceholder } from "../config";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LaunchNoticeModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const hasOfficialX = !isPlaceholder(config.links.x);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="comic-light relative w-full max-w-md bg-ink-2 p-6 text-paper shadow-[10px_10px_0_#ffe14d] sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-notice-title"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close launch notice"
          className="absolute right-3 top-2 font-display text-3xl leading-none text-paper/60 hover:text-bolt"
        >
          ×
        </button>

        <div className="mb-5 grid h-14 w-14 place-items-center border-[3px] border-ink bg-bolt font-display text-4xl text-ink shadow-[4px_4px_0_#009b3a]">
          𝕏
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-jam-green">Official launch notice</p>
        <h2 id="launch-notice-title" className="mt-2 pr-8 font-display text-4xl uppercase leading-none text-bolt">
          {config.prelaunch.title}
        </h2>
        <p className="mt-4 text-paper/80 leading-relaxed">{config.prelaunch.body}</p>
        <p className="mt-3 text-sm text-paper/60 leading-relaxed">
          The website will be updated as soon as the token, verified links and launch details are ready. Never use an unofficial contract address.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {hasOfficialX ? (
            <a
              href={config.links.x}
              target="_blank"
              rel="noreferrer"
              className="press comic bg-bolt px-5 py-3 font-black uppercase text-ink"
            >
              <span aria-hidden="true" className="mr-2 text-lg">𝕏</span>
              Follow $BOLT on X
            </a>
          ) : (
            <button type="button" disabled className="comic bg-ink px-5 py-3 font-black uppercase text-paper/60">
              <span aria-hidden="true" className="mr-2 text-lg">𝕏</span>
              X account coming soon
            </button>
          )}
          <button type="button" onClick={onClose} className="press comic bg-paper px-5 py-3 font-black uppercase text-ink">
            Stay tuned
          </button>
        </div>
      </div>
    </div>
  );
}
