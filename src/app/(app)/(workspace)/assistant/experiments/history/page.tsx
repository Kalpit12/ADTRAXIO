import { ExperimentsHistoryView } from "@/components/assistant/experiments-history-view";

export const metadata = { title: "Experiment history — ADTRAXIO AI" };

export default function ExperimentsHistoryPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <ExperimentsHistoryView />
    </div>
  );
}
