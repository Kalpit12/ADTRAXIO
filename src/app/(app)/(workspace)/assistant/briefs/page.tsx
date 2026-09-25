import { GrowthBriefsView } from "@/components/assistant/growth-briefs-view";

export const metadata = {
  title: "Growth briefs — ADTRAXIO AI",
};

export default function GrowthBriefsPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <GrowthBriefsView />
    </div>
  );
}
