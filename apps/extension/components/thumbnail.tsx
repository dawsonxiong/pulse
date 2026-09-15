import { useState } from "react";

type ThumbnailProps = {
  src: string | null;
  iconUrl: string | null;
  alt: string;
  fallbackLabel: string;
  priority?: boolean;
};

function watermarkInitial(label: string): string {
  const letter = [...label.trim()][0];
  return letter ? letter.toUpperCase() : "?";
}

function Watermark({ iconUrl, label }: { iconUrl: string | null; label: string }) {
  const [failed, setFailed] = useState(!iconUrl);

  return (
    <div
      aria-hidden="true"
      className="flex aspect-[16/10] w-full items-center justify-center border-b border-border bg-muted"
    >
      {failed || !iconUrl ? (
        <span className="select-none font-heading text-6xl font-semibold text-foreground/45">
          {watermarkInitial(label)}
        </span>
      ) : (
        <img
          src={iconUrl}
          alt=""
          className="size-24 rounded-2xl object-contain opacity-80"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function Thumbnail({ src, iconUrl, alt, fallbackLabel, priority = false }: ThumbnailProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return <Watermark iconUrl={iconUrl} label={fallbackLabel} />;
  }

  return (
    <div className="overflow-hidden border-b border-border ring-1 ring-inset ring-foreground/8">
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        className="aspect-[16/10] w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
