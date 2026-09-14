import { useState } from "react";
import { cn } from "@pulse/ui/lib/utils";

type SourceIconProps = {
  src: string | null;
  label: string;
  className?: string;
};

export function SourceIcon({ src, label, className }: SourceIconProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) return null;

  return (
    <img
      src={src}
      alt=""
      title={label}
      className={cn("size-4 shrink-0 rounded-sm object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
