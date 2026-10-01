import { Button } from "@/components/ui/button";
import { SectionImage } from "@/components/ui/section-image";
import { Reveal } from "@/components/motion/reveal";
import { homepageImages } from "@/lib/images";

const contentFields = [
  {
    label: "Hook",
    value: '"Most new business owners get this completely wrong..."',
  },
  {
    label: "Script",
    value:
      "Mistake #1: Posting without a content strategy. Mistake #2: Only sharing promotional content...",
  },
  {
    label: "Caption",
    value:
      "5 mistakes that are costing you followers 👇 Save this for later. Which one surprised you?",
  },
  {
    label: "CTA",
    value: "Follow for more growth tips →",
  },
];

export function AiContentStudio() {
  const image = homepageImages.contentCreatorStudio;

  return (
    <section id="create" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <SectionImage
                src={image.src}
                alt={image.alt}
                credit={image.credit}
                overlay="bottom"
                className="mb-8 aspect-[16/10] w-full lg:hidden"
              />
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-adtraxio-accent">
                Create
              </p>
              <h2 className="font-heading mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
                Turn a brief into platform-ready content.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Tell ADTRAXIO what you want to create. Get hooks, scripts,
                captions, and CTAs tailored to your goal and platform.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <SectionImage
                src={image.src}
                alt={image.alt}
                credit={image.credit}
                overlay="bottom"
                className="mt-8 hidden aspect-[16/10] w-full lg:block"
              />
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="rounded-lg border border-border bg-adtraxio-surface p-5 glow-accent-sm">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-medium">AI Content Studio</span>
                <span className="rounded border border-border px-2 py-0.5 text-[10px] text-adtraxio-accent">
                  Generating
                </span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Content type
                    </p>
                    <p className="mt-1 text-sm font-medium">Instagram Reel</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/50 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Goal
                    </p>
                    <p className="mt-1 text-sm font-medium">Grow followers</p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-background/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Topic
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    5 mistakes new business owners make
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {contentFields.map((field) => (
                    <div
                      key={field.label}
                      className="rounded-md border border-border bg-adtraxio-surface-elevated p-3"
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-adtraxio-accent">
                        {field.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {field.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm">
                  Regenerate
                </Button>
                <Button variant="outline" size="sm">
                  Save draft
                </Button>
                <Button
                  size="sm"
                  className="bg-adtraxio-accent text-primary-foreground hover:bg-adtraxio-accent/90"
                >
                  Schedule
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
