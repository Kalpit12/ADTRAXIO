"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Calendar,
  CreditCard,
  Megaphone,
  MessageSquare,
  Settings,
  Share2,
  PenLine,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS = {
  pen: PenLine,
  sparkles: PenLine,
  calendar: Calendar,
  megaphone: Megaphone,
  chart: BarChart3,
  share: Share2,
  users: Users,
  messages: MessageSquare,
  bot: Bot,
  settings: Settings,
  billing: CreditCard,
} as const;

export type PlaceholderIcon = keyof typeof ICONS;

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: PlaceholderIcon;
  backHref?: string;
}

export function PlaceholderPage({
  title,
  description,
  icon,
  backHref = "/dashboard",
}: PlaceholderPageProps) {
  const reduceMotion = useReducedMotion();
  const Icon: LucideIcon = ICONS[icon];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex min-h-[50vh] flex-col items-center justify-center text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-lg border border-border/70 bg-secondary/30">
        <Icon className="size-6 text-muted-foreground" strokeWidth={1.5} />
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <span className="mt-4 inline-flex rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
        Coming next
      </span>

      <Button asChild variant="ghost" size="sm" className="mt-8">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Back to Overview
        </Link>
      </Button>
    </motion.div>
  );
}
