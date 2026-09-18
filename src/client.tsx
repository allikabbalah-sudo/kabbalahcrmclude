import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

hydrateRoot(document, <StartClient />);

// Register the PWA service worker once the app has hydrated.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: app still works without push/offline support.
    });
  });
}
