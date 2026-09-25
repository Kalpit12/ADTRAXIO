import { BrandBrainView } from "@/components/assistant/brand-brain-view";

export const metadata = {
  title: "Brand Brain — ADTRAXIO AI",
};

export default function BrandBrainPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <BrandBrainView />
    </div>
  );
}
