import { useState } from "react";

type SourceIconProps = {
  src: string | null;
  label: string;
};

export function SourceIcon({ src, label }: SourceIconProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) return null;

  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      title={label}
      className="size-4 shrink-0 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  );
}
