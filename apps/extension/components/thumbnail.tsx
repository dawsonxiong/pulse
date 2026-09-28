import { useState } from "react";
import { cn } from "@pulse/ui/lib/utils";
import { iconToneClass, useIconCandidate } from "./source-icon";

type ThumbnailProps = {
  src: string | null;
  iconUrl: string | null;
  siteUrl?: string;
  alt: string;
  fallbackLabel: string;
  priority?: boolean;
};

function watermarkInitial(label: string): string {
  const letter = [...label.trim()][0];
  return letter ? letter.toUpperCase() : "?";
}

function Watermark({
  iconUrl,
  siteUrl,
  label,
}: {
  iconUrl: string | null;
  siteUrl?: string;
  label: string;
}) {
  const icon = useIconCandidate(iconUrl, siteUrl);

  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      {icon.src ? (
        <img
          src={icon.src}
          alt=""
          width={96}
          height={96}
          className={cn(
            "size-24 rounded-2xl object-contain [overflow-anchor:none]",
            iconToneClass(siteUrl),
          )}
          loading="lazy"
          decoding="async"
          onError={icon.onError}
        />
      ) : (
        <span className="select-none font-heading text-6xl font-semibold text-foreground/45">
          {watermarkInitial(label)}
        </span>
      )}
    </div>
  );
}

export function Thumbnail({
  src,
  iconUrl,
  siteUrl,
  alt,
  fallbackLabel,
  priority = false,
}: ThumbnailProps) {
  const [failed, setFailed] = useState(!src);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-muted">
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          width={640}
          height={400}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Watermark iconUrl={iconUrl} siteUrl={siteUrl} label={fallbackLabel} />
      )}
    </div>
  );
}
