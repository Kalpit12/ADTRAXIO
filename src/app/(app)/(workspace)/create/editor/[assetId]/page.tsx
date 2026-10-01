import { Suspense } from "react";
import { MediaEditorView } from "@/components/media-editor/media-editor-view";

export const metadata = {
  title: "Media Editor — ADTRAXIO",
};

export default async function MediaEditorPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <MediaEditorView assetId={assetId} />
    </Suspense>
  );
}
