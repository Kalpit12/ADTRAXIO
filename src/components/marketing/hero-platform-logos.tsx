import type { ComponentType, SVGProps } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import {
  XIcon,
} from "@/components/dashboard/platform-icons";
import { SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

const EXTRA_PLATFORMS: {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconClassName?: string;
}[] = [{ label: "X", Icon: XIcon }];

export function HeroPlatformLogos({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4",
        className,
      )}
      aria-label="Social platforms ADTRAXIO supports"
    >
      {SOCIAL_PLATFORMS.map(({ id, label }) => (
        <li key={id}>
          <span className="group inline-flex flex-col items-center gap-1.5">
            <PlatformIcon
              platform={id}
              size="md"
              className="size-10 rounded-lg transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none sm:size-11"
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/50 sm:sr-only">
              {label}
            </span>
          </span>
        </li>
      ))}
      {EXTRA_PLATFORMS.map(({ label, Icon, iconClassName }) => (
        <li key={label}>
          <span className="group inline-flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-lg bg-white/5 p-1.5 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none sm:size-11",
                iconClassName
              )}
            >
              <Icon className="size-full" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/50 sm:sr-only">
              {label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
