import { useState } from "react";

type ThumbnailProps = {
  src: string | null;
  alt: string;
  fallbackLabel: string;
};

export function Thumbnail({ src, alt, fallbackLabel }: ThumbnailProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div
        aria-hidden="true"
        className="flex aspect-[16/10] w-full items-end border-b border-border bg-muted px-3 py-2"
      >
        <span className="truncate text-xs text-muted-foreground">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[16/10] w-full border-b border-border object-cover"
      onError={() => setFailed(true)}
    />
  );
}
