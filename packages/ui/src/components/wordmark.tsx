import { Activity } from "lucide-react";

export function Wordmark() {
  return (
    <p className="font-heading inline-flex items-center gap-1.5 text-lg font-medium tracking-tight text-primary">
      <Activity className="size-4.5" strokeWidth={2.25} aria-hidden="true" />
      Pulse
    </p>
  );
}
