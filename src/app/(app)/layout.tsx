import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo-store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <AppShell user={user} demo={isDemo}>
      {children}
    </AppShell>
  );
}
