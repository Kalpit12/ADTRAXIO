import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/lib/onboarding/types";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from "./platform-icons";

const PLATFORM_ICONS: Record<
  SocialPlatform,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
};

interface PlatformIconProps {
  platform: SocialPlatform | string;
  size?: "sm" | "md";
  className?: string;
}

export function PlatformIcon({
  platform,
  size = "md",
  className,
}: PlatformIconProps) {
  const Icon = PLATFORM_ICONS[platform as SocialPlatform];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded",
        size === "sm" ? "size-7" : "size-9",
        className
      )}
      aria-hidden
    >
      {Icon ? (
        <Icon className="size-full" />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center rounded border border-border/70 bg-secondary/40 text-[9px] font-medium text-muted-foreground",
            size === "md" && "text-[10px]"
          )}
        >
          {platform.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
