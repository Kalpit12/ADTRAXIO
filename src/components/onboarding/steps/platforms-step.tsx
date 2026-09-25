"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { SelectableCard } from "@/components/onboarding/selectable-card";
import { SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

interface PlatformsStepProps {
  platforms: SocialPlatform[];
  connectLater: boolean;
  onPlatformsChange: (platforms: SocialPlatform[]) => void;
  onConnectLaterChange: (connectLater: boolean) => void;
  error?: string;
}

export function PlatformsStep({
  platforms,
  connectLater,
  onPlatformsChange,
  onConnectLaterChange,
  error,
}: PlatformsStepProps) {
  function toggle(platform: SocialPlatform) {
    if (platforms.includes(platform)) {
      onPlatformsChange(platforms.filter((p) => p !== platform));
    } else {
      onPlatformsChange([...platforms, platform]);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Where do you grow your audience?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the platforms you use. You can connect accounts now or later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map((platform) => (
          <SelectableCard
            key={platform.id}
            title={platform.label}
            icon={<PlatformIcon platform={platform.id} size="sm" />}
            selected={platforms.includes(platform.id)}
            onClick={() => toggle(platform.id)}
            multi
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-border bg-background/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Account connections
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onConnectLaterChange(false)}
            className={cn(
              "flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
              !connectLater
                ? "border-adtraxio-accent bg-adtraxio-accent/10 text-foreground"
                : "border-border text-muted-foreground hover:border-adtraxio-accent/30"
            )}
          >
            Connect now
          </button>
          <button
            type="button"
            onClick={() => onConnectLaterChange(true)}
            className={cn(
              "flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
              connectLater
                ? "border-adtraxio-accent bg-adtraxio-accent/10 text-foreground"
                : "border-border text-muted-foreground hover:border-adtraxio-accent/30"
            )}
          >
            I&apos;ll do this later
          </button>
        </div>
        {!connectLater && (
          <p className="mt-3 text-xs text-muted-foreground">
            Social connections will be available from your dashboard. For now,
            your platform selections are saved to personalize recommendations.
          </p>
        )}
      </div>
    </div>
  );
}
