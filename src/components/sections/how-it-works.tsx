"use client";

import { useRef } from "react";
import { Reveal } from "@/components/motion/reveal";
import { StepFlowLine } from "@/components/sections/step-flow-line";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: "01",
    title: "Connect",
    description: "Connect your social accounts.",
  },
  {
    number: "02",
    title: "Create",
    description: "Create content with AI.",
  },
  {
    number: "03",
    title: "Campaign",
    description: "Launch and manage campaigns.",
  },
  {
    number: "04",
    title: "Improve",
    description: "Use AI insights to improve your next move.",
  },
];

function StepNode({
  number,
  nodeRef,
}: {
  number: string;
  nodeRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={nodeRef}
      className="relative z-10 flex size-8 items-center justify-center rounded-full border border-adtraxio-accent/50 bg-background shadow-[0_0_12px_oklch(0.82_0.17_128_/_20%)]"
    >
      <span className="text-[10px] font-semibold text-adtraxio-accent">
        {number}
      </span>
    </div>
  );
}

function StepColumn({
  step,
  index,
  nodeRef,
  className,
}: {
  step: (typeof steps)[number];
  index: number;
  nodeRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  return (
    <div className={cn("relative z-10", className)}>
      <StepNode number={step.number} nodeRef={nodeRef} />
      <Reveal delay={index * 0.1}>
        <h3 className="mt-4 text-lg font-semibold uppercase tracking-wide text-foreground">
          {step.title}
        </h3>
        <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>
      </Reveal>
    </div>
  );
}

function DesktopSteps() {
  const containerRef = useRef<HTMLDivElement>(null);
  const node0Ref = useRef<HTMLDivElement>(null);
  const node1Ref = useRef<HTMLDivElement>(null);
  const node2Ref = useRef<HTMLDivElement>(null);
  const node3Ref = useRef<HTMLDivElement>(null);
  const nodeRefs = [node0Ref, node1Ref, node2Ref, node3Ref];

  return (
    <div
      ref={containerRef}
      className="relative mt-16 hidden lg:grid lg:grid-cols-4 lg:gap-8"
    >
      <StepFlowLine
        containerRef={containerRef}
        startRef={node0Ref}
        endRef={node3Ref}
      />
      {steps.map((step, i) => (
        <StepColumn
          key={step.number}
          step={step}
          index={i}
          nodeRef={nodeRefs[i]}
        />
      ))}
    </div>
  );
}

function TabletSteps() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const t0 = useRef<HTMLDivElement>(null);
  const t1 = useRef<HTMLDivElement>(null);
  const t2 = useRef<HTMLDivElement>(null);
  const t3 = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-16 hidden sm:block lg:hidden">
      <div ref={row1Ref} className="relative grid grid-cols-2 gap-12">
        <StepFlowLine containerRef={row1Ref} startRef={t0} endRef={t1} />
        <StepColumn step={steps[0]} index={0} nodeRef={t0} />
        <StepColumn step={steps[1]} index={1} nodeRef={t1} />
      </div>
      <div ref={row2Ref} className="relative mt-14 grid grid-cols-2 gap-12">
        <StepFlowLine containerRef={row2Ref} startRef={t2} endRef={t3} />
        <StepColumn step={steps[2]} index={2} nodeRef={t2} />
        <StepColumn step={steps[3]} index={3} nodeRef={t3} />
      </div>
    </div>
  );
}

function MobileSteps() {
  const containerRef = useRef<HTMLDivElement>(null);
  const node0Ref = useRef<HTMLDivElement>(null);
  const node3Ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative mt-16 flex flex-col gap-10 sm:hidden">
      <StepFlowLine
        containerRef={containerRef}
        startRef={node0Ref}
        endRef={node3Ref}
      />
      {steps.map((step, i) => (
        <StepColumn
          key={step.number}
          step={step}
          index={i}
          nodeRef={i === 0 ? node0Ref : i === 3 ? node3Ref : undefined}
        />
      ))}
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="learn" className="border-y border-border/80 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <Reveal>
          <h2 className="font-heading text-center text-3xl tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
        </Reveal>

        <DesktopSteps />
        <TabletSteps />
        <MobileSteps />
      </div>
    </section>
  );
}
