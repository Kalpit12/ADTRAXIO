import { OptimizationPageView } from "@/components/assistant/optimization-page-view";

export const metadata = { title: "Optimization — ADTRAXIO AI" };

export default function OptimizationPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <OptimizationPageView />
    </div>
  );
}
