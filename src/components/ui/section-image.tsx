import Image from "next/image";
import { cn } from "@/lib/utils";

interface SectionImageProps {
  src: string;
  alt: string;
  credit?: string;
  className?: string;
  imageClassName?: string;
  overlay?: "left" | "right" | "bottom" | "full" | "none";
  priority?: boolean;
}

const overlayClasses = {
  left: "bg-gradient-to-r from-background via-background/70 to-transparent",
  right: "bg-gradient-to-l from-background via-background/70 to-transparent",
  bottom: "bg-gradient-to-t from-background via-background/60 to-transparent",
  full: "bg-background/50",
  none: "",
};

export function SectionImage({
  src,
  alt,
  credit,
  className,
  imageClassName,
  overlay = "left",
  priority = false,
}: SectionImageProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
        className={cn("object-cover", imageClassName)}
      />
      {overlay !== "none" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            overlayClasses[overlay]
          )}
        />
      )}
      {credit && (
        <span className="absolute bottom-2 right-2 z-10 text-[10px] text-muted-foreground/60">
          {credit}
        </span>
      )}
    </div>
  );
}
