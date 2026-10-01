import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function WorkspaceLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <DashboardDataProvider>
      <AppShell>{children}</AppShell>
    </DashboardDataProvider>
  );
}
