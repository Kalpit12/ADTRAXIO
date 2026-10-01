import Image from "next/image";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE, LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

const heightClass = {
  xs: "h-5",
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
  xl: "h-14 sm:h-16",
} as const;

interface AdtraxioLogoProps {
  size?: keyof typeof heightClass;
  className?: string;
  href?: string;
  priority?: boolean;
}

export function AdtraxioLogo({
  size = "md",
  className,
  href,
  priority = false,
}: AdtraxioLogoProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt={`${APP_NAME} — ${APP_TAGLINE}`}
      width={1879}
      height={302}
      priority={priority}
      className={cn(
        "w-auto max-w-full object-contain object-left",
        heightClass[size],
        className
      )}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 transition-opacity hover:opacity-90"
      >
        {image}
      </Link>
    );
  }

  return image;
}
