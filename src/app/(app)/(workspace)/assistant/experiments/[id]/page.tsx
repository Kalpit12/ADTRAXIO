import { ExperimentDetailView } from "@/components/assistant/experiment-detail-view";

export const metadata = { title: "Experiment — ADTRAXIO AI" };

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <ExperimentDetailView experimentId={id} />
    </div>
  );
}
