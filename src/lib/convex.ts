import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!url) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_CONVEX_URL is not set. Run `bunx convex dev` to create a deployment.",
  );
}

export const convex = new ConvexReactClient(url ?? "https://example.convex.cloud");
