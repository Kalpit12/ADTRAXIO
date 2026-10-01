"use client";

import { Button } from "@/components/ui/button";

export function BrandProductDeleteDialog({
  open,
  productName,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  productName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        className="w-full max-w-md rounded-lg border border-border/80 bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Brand Brain</p>
          <h2 id="delete-product-title" className="text-lg font-semibold text-foreground">
            Remove {productName}?
          </h2>
        </div>
        <p className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          This product is removed from your Brand Brain profile in ADTRAXIO. Copilot
          will no longer use it as context. This does not delete content or
          campaigns that already reference it.
        </p>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            Keep product
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Removing…" : "Remove product"}
          </Button>
        </div>
      </div>
    </div>
  );
}
