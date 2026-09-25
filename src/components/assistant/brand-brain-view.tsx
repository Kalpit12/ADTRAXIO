"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BrandMemoryRecord,
  BrandProductRecord,
  BrandProfileRecord,
} from "@/lib/assistant/brand-brain/types";

function arrayToLines(values: string[]): string {
  return values.join("\n");
}

function linesField(
  values: string[],
  onChange: (v: string[]) => void
): { value: string; onChange: (v: string) => void } {
  return {
    value: arrayToLines(values),
    onChange: (v) =>
      onChange(v.split("\n").map((s) => s.trim()).filter(Boolean)),
  };
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}

export function BrandBrainView() {
  const [profile, setProfile] = useState<BrandProfileRecord | null>(null);
  const [products, setProducts] = useState<BrandProductRecord[]>([]);
  const [memories, setMemories] = useState<BrandMemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newProductName, setNewProductName] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<BrandProductRecord | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [brandRes, productsRes, memoryRes] = await Promise.all([
        fetch("/api/assistant/brand"),
        fetch("/api/assistant/products"),
        fetch("/api/assistant/memory"),
      ]);
      const brandPayload = (await brandRes.json()) as {
        profile?: BrandProfileRecord;
        error?: string;
      };
      const productsPayload = (await productsRes.json()) as {
        products?: BrandProductRecord[];
      };
      const memoryPayload = (await memoryRes.json()) as {
        memories?: BrandMemoryRecord[];
      };
      if (!brandRes.ok) {
        setError(brandPayload.error ?? "Unable to load brand profile.");
        return;
      }
      setProfile(brandPayload.profile ?? null);
      setProducts(productsPayload.products ?? []);
      setMemories(memoryPayload.memories ?? []);
    } catch {
      setError("Unable to load Brand Brain.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/assistant/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: profile.businessName,
          industry: profile.industry,
          description: profile.description,
          targetAudience: profile.targetAudience,
          brandVoice: profile.brandVoice,
          tone: profile.tone,
          contentPillars: profile.contentPillars,
          preferredPlatforms: profile.preferredPlatforms,
          preferredCtas: profile.preferredCtas,
          keywords: profile.keywords,
          avoidWords: profile.avoidWords,
          brandRules: profile.brandRules,
          goals: profile.goals,
        }),
      });
      const payload = (await response.json()) as {
        profile?: BrandProfileRecord;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Unable to save.");
        return;
      }
      setProfile(payload.profile ?? profile);
      setMessage("Brand profile saved.");
    } catch {
      setError("Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function addProduct() {
    const name = newProductName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/assistant/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as {
        product?: BrandProductRecord;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Unable to add product.");
        return;
      }
      setNewProductName("");
      if (payload.product) {
        setProducts((prev) => [...prev, payload.product!]);
      }
      setMessage("Product added.");
    } catch {
      setError("Unable to add product.");
    } finally {
      setSaving(false);
    }
  }

  function startEditProduct(product: BrandProductRecord) {
    setEditingProductId(product.id);
    setProductDraft({ ...product });
  }

  async function saveProduct() {
    if (!productDraft) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/assistant/products/${productDraft.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: productDraft.name,
            description: productDraft.description,
            audience: productDraft.audience,
            keyBenefits: productDraft.keyBenefits,
            differentiators: productDraft.differentiators,
            approvedClaims: productDraft.approvedClaims,
            prohibitedClaims: productDraft.prohibitedClaims,
            websiteUrl: productDraft.websiteUrl,
          }),
        }
      );
      const payload = (await response.json()) as {
        product?: BrandProductRecord;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Unable to save product.");
        return;
      }
      if (payload.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.product!.id ? payload.product! : p))
        );
      }
      setEditingProductId(null);
      setProductDraft(null);
      setMessage("Product saved.");
    } catch {
      setError("Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Delete this product from Brand Brain?")) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/assistant/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to delete product.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingProductId === id) {
        setEditingProductId(null);
        setProductDraft(null);
      }
      setMessage("Product removed.");
    } catch {
      setError("Unable to delete product.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveMemory(id: string) {
    await fetch(`/api/assistant/memory/${id}/archive`, { method: "POST" });
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "archived" } : m))
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading Brand Brain…</div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto max-w-[820px] space-y-8 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to ADTRAXIO AI
          </Link>
        </div>

        <header>
          <h1 className="font-heading text-2xl tracking-tight">Brand Brain</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approved business context ADTRAXIO AI uses for content and strategy.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-adtraxio-accent">{message}</p>
        )}

        {profile && (
          <section className="space-y-4 rounded-xl border border-border/60 bg-adtraxio-surface/25 p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Brand
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Business name"
                value={profile.businessName ?? ""}
                onChange={(v) => setProfile({ ...profile, businessName: v })}
              />
              <Field
                label="Industry"
                value={profile.industry ?? ""}
                onChange={(v) => setProfile({ ...profile, industry: v })}
              />
            </div>
            <Field
              label="Description"
              value={profile.description ?? ""}
              onChange={(v) => setProfile({ ...profile, description: v })}
              multiline
            />
            <Field
              label="Target audience"
              value={profile.targetAudience ?? ""}
              onChange={(v) => setProfile({ ...profile, targetAudience: v })}
              multiline
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Brand voice"
                value={profile.brandVoice ?? ""}
                onChange={(v) => setProfile({ ...profile, brandVoice: v })}
              />
              <Field
                label="Tone"
                value={profile.tone ?? ""}
                onChange={(v) => setProfile({ ...profile, tone: v })}
              />
            </div>
            <Field
              label="Content pillars (one per line)"
              value={arrayToLines(profile.contentPillars)}
              onChange={(v) =>
                setProfile({
                  ...profile,
                  contentPillars: v.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              multiline
            />
            <Field
              label="Brand rules (one per line)"
              value={arrayToLines(profile.brandRules)}
              onChange={(v) =>
                setProfile({
                  ...profile,
                  brandRules: v.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              multiline
            />
            <Field
              label="Words to avoid (one per line)"
              value={arrayToLines(profile.avoidWords)}
              onChange={(v) =>
                setProfile({
                  ...profile,
                  avoidWords: v.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              multiline
            />
            <Field
              label="Goals (one per line)"
              value={arrayToLines(profile.goals)}
              onChange={(v) =>
                setProfile({
                  ...profile,
                  goals: v.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              multiline
            />
            <Button onClick={() => void saveProfile()} disabled={saving}>
              {saving ? "Saving…" : "Save brand profile"}
            </Button>
          </section>
        )}

        <section className="space-y-4 rounded-xl border border-border/60 bg-adtraxio-surface/25 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Products
          </h2>
          <ul className="space-y-3 text-sm">
            {products.map((p) => {
              const editing = editingProductId === p.id && productDraft;
              return (
                <li
                  key={p.id}
                  className="rounded-md border border-border/50 px-3 py-3"
                >
                  {editing ? (
                    <div className="space-y-3">
                      <Field
                        label="Name"
                        value={productDraft.name}
                        onChange={(v) =>
                          setProductDraft({ ...productDraft, name: v })
                        }
                      />
                      <Field
                        label="Description"
                        value={productDraft.description ?? ""}
                        onChange={(v) =>
                          setProductDraft({ ...productDraft, description: v })
                        }
                        multiline
                      />
                      <Field
                        label="Audience"
                        value={productDraft.audience ?? ""}
                        onChange={(v) =>
                          setProductDraft({ ...productDraft, audience: v })
                        }
                        multiline
                      />
                      <Field
                        label="Key benefits (one per line)"
                        {...linesField(productDraft.keyBenefits, (v) =>
                          setProductDraft({ ...productDraft, keyBenefits: v })
                        )}
                        multiline
                      />
                      <Field
                        label="Differentiators (one per line)"
                        {...linesField(productDraft.differentiators, (v) =>
                          setProductDraft({
                            ...productDraft,
                            differentiators: v,
                          })
                        )}
                        multiline
                      />
                      <Field
                        label="Approved claims (one per line)"
                        {...linesField(productDraft.approvedClaims, (v) =>
                          setProductDraft({
                            ...productDraft,
                            approvedClaims: v,
                          })
                        )}
                        multiline
                      />
                      <Field
                        label="Prohibited claims (one per line)"
                        {...linesField(productDraft.prohibitedClaims, (v) =>
                          setProductDraft({
                            ...productDraft,
                            prohibitedClaims: v,
                          })
                        )}
                        multiline
                      />
                      <Field
                        label="Website URL"
                        value={productDraft.websiteUrl ?? ""}
                        onChange={(v) =>
                          setProductDraft({ ...productDraft, websiteUrl: v })
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void saveProduct()}
                          disabled={saving}
                        >
                          Save product
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingProductId(null);
                            setProductDraft(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{p.name}</p>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditProduct(p)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void deleteProduct(p.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      {p.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                      {p.approvedClaims.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Claims: {p.approvedClaims.join(" · ")}
                        </p>
                      )}
                    </>
                  )}
                </li>
              );
            })}
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">No products yet.</p>
            )}
          </ul>
          <div className="flex gap-2">
            <input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="New product name"
              className="flex-1 rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm"
            />
            <Button type="button" variant="secondary" onClick={() => void addProduct()} disabled={saving}>
              Add
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border/60 bg-adtraxio-surface/25 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Memory
          </h2>
          <ul className="space-y-2">
            {memories.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-foreground/90">{m.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.category} · {m.status} · {m.source}
                  </p>
                </div>
                {m.status === "active" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void archiveMemory(m.id)}
                  >
                    Archive
                  </Button>
                )}
              </li>
            ))}
            {memories.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No saved preferences. Ask ADTRAXIO AI to remember something and confirm the save.
              </p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
