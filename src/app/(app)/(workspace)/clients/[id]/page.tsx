import { ClientDetailView } from "@/components/clients/client-detail-view";

export const metadata = {
  title: "Client — ADTRAXIO",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDetailView clientId={id} />;
}
