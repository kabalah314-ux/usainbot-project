import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { config, isPlaceholder, linkHref } from "../config";
import { LaunchNoticeModal } from "./LaunchNoticeModal";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  children: ReactNode;
  destination?: string;
};

export function BuyButton({ children, destination = config.links.launchpad, className = "", ...props }: Props) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const canBuy = !config.prelaunch.active && !isPlaceholder(destination);

  const handleClick = () => {
    if (!canBuy) {
      setNoticeOpen(true);
      return;
    }

    window.open(linkHref(destination), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <button type="button" {...props} onClick={handleClick} className={className}>
        {children}
      </button>
      <LaunchNoticeModal open={noticeOpen} onClose={() => setNoticeOpen(false)} />
    </>
  );
}
