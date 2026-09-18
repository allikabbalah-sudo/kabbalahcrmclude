import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  });

  return createTanStackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultErrorComponent: ({ error }) => (
      <div dir="rtl" className="p-8 text-center text-destructive">
        אירעה שגיאה: {String(error)}
      </div>
    ),
    defaultNotFoundComponent: () => (
      <div dir="rtl" className="p-8 text-center text-muted-foreground">
        הדף לא נמצא
      </div>
    ),
  });
}

export const getRouter = createRouter;

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
