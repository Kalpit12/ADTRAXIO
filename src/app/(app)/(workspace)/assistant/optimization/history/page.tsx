import { OptimizationHistoryView } from "@/components/assistant/optimization-history-view";

export const metadata = { title: "Optimization history — ADTRAXIO AI" };

export default function OptimizationHistoryPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <OptimizationHistoryView />
    </div>
  );
}
