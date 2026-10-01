"use client";

import { motion } from "framer-motion";
import { AdtraxioLogo } from "@/components/brand/adtraxio-logo";

const stats = [
  { label: "Reach", value: "+32.8%" },
  { label: "Campaigns", value: "12 active" },
  { label: "AI insights", value: "24/7" },
];

interface AuthBrandPanelProps {
  compact?: boolean;
}

export function AuthBrandPanel({ compact = false }: AuthBrandPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: compact ? 0 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col justify-center"
    >
      <AdtraxioLogo href="/" size="xl" className="max-w-[min(100%,22rem)]" priority />

      {!compact && (
        <>
          <div className="mt-8 space-y-1">
            <p className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl">
              Create.
            </p>
            <p className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl">
              Campaign.
            </p>
            <p className="font-heading text-3xl tracking-tight text-adtraxio-accent sm:text-4xl">
              Grow.
            </p>
          </div>

          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
            Your social growth, intelligently connected.
          </p>

          <div className="mt-10 hidden gap-3 sm:grid sm:grid-cols-3 lg:mt-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                className="rounded-md border border-border bg-background/40 px-3 py-3 backdrop-blur-sm"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-adtraxio-accent">
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
