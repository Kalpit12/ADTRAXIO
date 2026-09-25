import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { homepageImages } from "@/lib/images";

const categories = [
  "Content Creators",
  "DTC Brands",
  "Marketing Agencies",
  "Growth Teams",
  "Social Managers",
  "Founders",
];

export function SocialProof() {
  const image = homepageImages.socialMediaScroll;

  return (
    <section className="relative border-y border-border py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]">
        <Image
          src={image.src}
          alt=""
          fill
          aria-hidden
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Built for creators, brands & growing teams
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {categories.map((category) => (
              <span
                key={category}
                className="text-sm text-foreground/40 transition-colors hover:text-foreground/60"
              >
                {category}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
