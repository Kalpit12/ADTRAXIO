import { ExecutionPlanView } from "@/components/assistant/execution-plan-view";

export const metadata = {
  title: "Execution plan — ADTRAXIO AI",
};

export default async function ExecutionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <ExecutionPlanView planId={id} />
    </div>
  );
}
