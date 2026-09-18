import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createServerFn } from "@tanstack/react-start";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { AppLayout } from "@/components/layout/AppLayout";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { authenticated: !!user };
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { authenticated } = await checkAuth();
    if (!authenticated) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <OrganizationProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </OrganizationProvider>
  );
}
