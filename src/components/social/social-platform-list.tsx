"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import { SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import type { SocialPlatform } from "@/lib/onboarding/types";

interface SocialConfiguration {
  metaFacebook: boolean;
  metaInstagram: boolean;
  encryption: boolean;
}

interface SocialPlatformListProps {
  configuration: SocialConfiguration;
  connectedPlatforms: Set<string>;
}

const COMING_SOON: SocialPlatform[] = ["tiktok", "linkedin", "youtube"];

export function SocialPlatformList({
  configuration,
  connectedPlatforms,
}: SocialPlatformListProps) {
  return (
    <ul className="mt-5 divide-y divide-border/60">
      {SOCIAL_PLATFORMS.map(({ id, label }) => {
        const isComingSoon = COMING_SOON.includes(id);
        const isConnected = connectedPlatforms.has(id);
        const canConnectFacebook =
          id === "facebook" &&
          configuration.metaFacebook &&
          configuration.encryption;
        const canConnectInstagram =
          id === "instagram" &&
          configuration.metaInstagram &&
          configuration.encryption;

        return (
          <li
            key={id}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <PlatformIcon platform={id} size="sm" />
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? "Connected"
                    : isComingSoon
                      ? "Coming soon"
                      : "Not connected"}
                </p>
              </div>
            </div>

            {isComingSoon ? (
              <span className="text-xs font-medium text-muted-foreground/70">
                Coming soon
              </span>
            ) : isConnected ? (
              <span className="text-xs font-medium text-adtraxio-accent">
                Connected
              </span>
            ) : id === "facebook" ? (
              canConnectFacebook ? (
                <Button asChild size="sm" variant="outline">
                  <a href="/api/social/meta/connect?target=facebook">Connect</a>
                </Button>
              ) : (
                <span className="max-w-xs text-right text-xs text-muted-foreground">
                  Meta connection isn&apos;t configured yet.
                </span>
              )
            ) : id === "instagram" ? (
              canConnectInstagram ? (
                <Button asChild size="sm" variant="outline">
                  <a href="/api/social/meta/connect?target=instagram">
                    Connect
                  </a>
                </Button>
              ) : (
                <span className="max-w-xs text-right text-xs text-muted-foreground">
                  Meta connection isn&apos;t configured yet.
                </span>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
