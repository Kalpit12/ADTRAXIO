import { StrategicPlanView } from "@/components/assistant/strategic-plan-view";

export const metadata = {
  title: "Strategic plan — ADTRAXIO AI",
};

export default async function StrategicPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <StrategicPlanView planId={id} />
    </div>
  );
}
