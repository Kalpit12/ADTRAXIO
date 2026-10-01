/**
 * Canonical application base URL for Stripe redirects and server-side links.
 * Production must set NEXT_PUBLIC_APP_URL explicitly (HTTPS).
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  if (explicit) {
    if (
      process.env.VERCEL_ENV === "production" &&
      !explicit.startsWith("https://")
    ) {
      throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
    }
    return explicit;
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be set for Vercel Production deployments."
    );
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
