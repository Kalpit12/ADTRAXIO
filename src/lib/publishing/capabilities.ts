import type { PlatformCapabilities, PublishingPlatform } from "./types";

const CAPABILITIES: Record<PublishingPlatform, PlatformCapabilities> = {
  facebook: {
    supportsText: true,
    supportsImage: true,
    supportsVideo: false,
    supportsScheduling: true,
    requiresMedia: false,
  },
  instagram: {
    supportsText: false,
    supportsImage: true,
    supportsVideo: false,
    supportsScheduling: true,
    requiresMedia: true,
  },
};

export function getPlatformCapabilities(
  platform: PublishingPlatform
): PlatformCapabilities {
  return CAPABILITIES[platform];
}
