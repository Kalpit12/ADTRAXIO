"use client";

import Link from "next/link";
import { Megaphone, PenLine } from "lucide-react";
import { AskAdtraxioLink } from "@/components/assistant/ask-adtraxio-link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  firstName: string;
}

export function DashboardHeader({ firstName }: DashboardHeaderProps) {
  return (
    <div className="space-y-4 border-b border-border/60 pb-7">
    <PageHeader
      className="border-0 pb-0"
      eyebrow="Overview"
      title={`Good morning, ${firstName}.`}
      description="Performance, recommendations, and what to do next — in one place."
    >
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
    </PageHeader>
    <AskAdtraxioLink
      variant="button"
      label="Ask ADTRAXIO AI"
      prompt="Summarize what needs my attention across performance, content, and publishing."
    />
    </div>
  );
}
