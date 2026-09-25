import { ClientMembersView } from "@/components/clients/client-members-view";

export const metadata = {
  title: "Client Members — ADTRAXIO",
};

export default async function ClientMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientMembersView clientId={id} />;
}
