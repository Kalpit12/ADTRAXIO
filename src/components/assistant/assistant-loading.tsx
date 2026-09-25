"use client";

import { AdtraxioAiMark } from "@/components/assistant/adtraxio-ai-mark";

export function AssistantLoading() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex min-w-0 max-w-[760px] items-start gap-3">
        <AdtraxioAiMark className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">ADTRAXIO AI</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyzing your workspace
            <span className="inline-flex w-4 animate-pulse">...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
