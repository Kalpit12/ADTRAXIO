import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PublishingEmptyState() {
  return (
    <div className="rounded-md border border-border/60 bg-adtraxio-surface/10 px-6 py-12 text-center sm:px-10">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Publishing
      </p>
      <p className="mt-3 font-heading text-xl tracking-tight text-foreground">
        No scheduled posts
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Publishing is what goes out, where, and when. Create content in Content
        Studio, then schedule or publish to connected accounts.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild size="sm">
          <Link href="/create">Content Studio</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/social">Connections</Link>
        </Button>
      </div>
    </div>
  );
}
