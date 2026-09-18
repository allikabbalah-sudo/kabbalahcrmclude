import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
const appCss = "/styles/app.css";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#3b8fa3" },
      { title: "Kabbalah CRM" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/icon-192.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html dir="rtl" lang="he">
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProviders>
          <Outlet />
        </RootProviders>
        <Toaster richColors position="top-center" dir="rtl" />
        <Scripts />
      </body>
    </html>
  );
}

function RootProviders({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
