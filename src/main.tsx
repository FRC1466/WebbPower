import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { router } from "@/routes/router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { convex } from "@/lib/convex";
import { OfflineSync } from "@/components/offline-sync";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <ThemeProvider>
        <TooltipProvider>
          <OfflineSync />
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </ConvexAuthProvider>
  </StrictMode>,
);
