import { ExperimentNewView } from "@/components/assistant/experiment-new-view";

export const metadata = { title: "New experiment — ADTRAXIO AI" };

export default function ExperimentNewPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <ExperimentNewView />
    </div>
  );
}
