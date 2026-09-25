import type { MetaConnectionTarget } from "@/lib/social/types";
import { metaFacebookProvider } from "./meta-facebook";
import { metaInstagramProvider } from "./meta-instagram";

export function getMetaProvider(target: MetaConnectionTarget) {
  return target === "instagram" ? metaInstagramProvider : metaFacebookProvider;
}
