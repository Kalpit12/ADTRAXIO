import { OptimizationDetailView } from "@/components/assistant/optimization-detail-view";

export const metadata = { title: "Optimization proposal — ADTRAXIO AI" };

export default async function OptimizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <OptimizationDetailView proposalId={id} />
    </div>
  );
}
