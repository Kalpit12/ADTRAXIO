import { Suspense } from "react";
import { AssistantView } from "@/components/assistant/assistant-view";

export const metadata = {
  title: "ADTRAXIO AI — Assistant",
};

export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantView />
    </Suspense>
  );
}
