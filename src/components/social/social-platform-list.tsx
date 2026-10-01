"use client";

import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { Button } from "@/components/ui/button";
import { SOCIAL_PLATFORMS } from "@/lib/onboarding/constants";
import { CONNECT_PLATFORM_COPY } from "@/lib/social/connection-display";
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
  const canConnectAny =
    configuration.encryption &&
    (configuration.metaFacebook || configuration.metaInstagram);

  return (
    <ul className="mt-5 space-y-3">
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
        const copy =
          id === "facebook" || id === "instagram"
            ? CONNECT_PLATFORM_COPY[id]
            : null;

        return (
          <li
            key={id}
            className="rounded-md border border-border/60 px-4 py-4 sm:px-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <PlatformIcon platform={id} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  {isComingSoon ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Not available yet in ADTRAXIO
                    </p>
                  ) : isConnected ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      You have at least one {label} account connected
                    </p>
                  ) : copy ? (
                    <>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {copy.lead}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground/90">
                        {copy.steps.map((step) => (
                          <li key={step}>· {step}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Not connected
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 sm:text-right">
                {isComingSoon ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                ) : isConnected ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    Connected
                  </span>
                ) : id === "facebook" ? (
                  canConnectFacebook ? (
                    <Button asChild size="sm">
                      <a href="/api/social/meta/connect?target=facebook">
                        Connect {label}
                      </a>
                    </Button>
                  ) : (
                    <span className="max-w-xs text-xs text-muted-foreground">
                      {canConnectAny
                        ? "Facebook connection isn't configured yet."
                        : "Connections are unavailable until setup is complete."}
                    </span>
                  )
                ) : id === "instagram" ? (
                  canConnectInstagram ? (
                    <Button asChild size="sm">
                      <a href="/api/social/meta/connect?target=instagram">
                        Connect {label}
                      </a>
                    </Button>
                  ) : (
                    <span className="max-w-xs text-xs text-muted-foreground">
                      {canConnectAny
                        ? "Instagram connection isn't configured yet."
                        : "Connections are unavailable until setup is complete."}
                    </span>
                  )
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
