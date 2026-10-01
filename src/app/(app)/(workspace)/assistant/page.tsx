import { Suspense } from "react";
import { AssistantView } from "@/components/assistant/assistant-view";

export const metadata = {
  title: "Growth Copilot — ADTRAXIO",
};

export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantView />
    </Suspense>
  );
}
