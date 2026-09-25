"use client";

import Link from "next/link";
import { Megaphone, PenLine } from "lucide-react";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  firstName: string;
}

export function DashboardHeader({ firstName }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Overview
        </p>
        <h1 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          Good morning, {firstName}.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Here&apos;s what&apos;s happening with your growth.
        </p>
        <AskAdtraxioLink
          variant="button"
          label="Ask ADTRAXIO AI"
          prompt="Summarize what needs my attention across performance, content, and publishing."
          className="mt-1"
        />
      </div>

      <div className="flex shrink-0 flex-wrap gap-2.5">
        <Button
          asChild
          size="cta"
          className="bg-adtraxio-accent hover:bg-adtraxio-accent/90"
        >
          <Link href="/create">
            <PenLine className="size-4" />
            Create content
          </Link>
        </Button>
        <Button asChild size="cta" variant="outline" className="border-border/80">
          <Link href="/campaigns">
            <Megaphone className="size-4" />
            New campaign
          </Link>
        </Button>
      </div>
    </header>
  );
}
