import { ReportBuilderView } from "@/components/reports/report-builder-view";

export const metadata = {
  title: "Report — ADTRAXIO",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportBuilderView reportId={id} />;
}
