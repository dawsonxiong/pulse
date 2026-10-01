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

// Most feed images are og cards (1200x630) or 16:9, so the frame matches og.
const FRAME_RATIO = 1200 / 630;
// Beyond this much cropping (squares, tall shots, banners), letterbox instead.
const MAX_COVER_CROP = 0.1;

function coverCrop(width: number, height: number): number {
  const ratio = width / height;
  return 1 - Math.min(ratio, FRAME_RATIO) / Math.max(ratio, FRAME_RATIO);
}

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
  const [letterbox, setLetterbox] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative aspect-[1200/630] w-full overflow-hidden border-b border-border bg-muted">
      {showImage ? (
        <>
          {letterbox && (
            <img
              src={src!}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-2xl"
            />
          )}
          <img
            src={src!}
            alt={alt}
            width={640}
            height={336}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "low"}
            className={cn(
              "absolute inset-0 size-full",
              letterbox ? "object-contain" : "object-cover",
            )}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                setLetterbox(coverCrop(naturalWidth, naturalHeight) > MAX_COVER_CROP);
              }
            }}
            onError={() => setFailed(true)}
          />
        </>
      ) : (
        <Watermark iconUrl={iconUrl} siteUrl={siteUrl} label={fallbackLabel} />
      )}
    </div>
  );
}
