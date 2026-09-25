import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view";

export const metadata = {
  title: "Campaign — ADTRAXIO",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetailView campaignId={id} />;
}
